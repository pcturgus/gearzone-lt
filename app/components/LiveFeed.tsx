"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

type ActivityEvent = {
  id: string;
  type: "naujas_narys" | "naujas_skelbimas" | "kainos_kritimas" | "parduota";
  username: string | null;
  product_title: string | null;
  price: number | null;
  old_price: number | null;
  created_at: string;
};

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ką tik";
  if (mins < 60) return `prieš ${mins} min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `prieš ${hours} val.`;
  return `prieš ${Math.floor(hours / 24)} d.`;
}

function eventIcon(type: ActivityEvent["type"]) {
  if (type === "naujas_narys") return "👋";
  if (type === "naujas_skelbimas") return "🆕";
  if (type === "kainos_kritimas") return "📉";
  return "✅";
}

export default function LiveFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("activity_logs")
        .select("id, type, username, product_title, price, old_price, created_at")
        .order("created_at", { ascending: false })
        .limit(15);
      setEvents(data || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("activity_logs_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          setEvents((prev) => [payload.new as ActivityEvent, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="bg-white border border-[#E4E7EE] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span className="text-sm font-extrabold">LIVE</span>
        <span className="text-xs text-[#6B7280]">· Bendruomenės pulsas</span>
      </div>

      {loading ? (
        <p className="text-xs text-[#6B7280]">Kraunama...</p>
      ) : events.length === 0 ? (
        <p className="text-xs text-[#6B7280]">Kol kas jokios veiklos.</p>
      ) : (
        <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto">
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-2 text-xs" style={{ animation: "feedFadeIn 0.4s ease" }}>
              <span className="text-sm shrink-0">{eventIcon(e.type)}</span>
              <div className="flex-1 min-w-0">
                {e.type === "naujas_narys" && (
                  <p className="text-[#374151] leading-snug">
                    <span className="font-bold">{e.username || "Vartotojas"}</span> prisijungė prie bendruomenės
                  </p>
                )}
                {e.type === "naujas_skelbimas" && (
                  <p className="text-[#374151] leading-snug">
                    <span className="font-bold">{e.username || "Vartotojas"}</span> įkėlė{" "}
                    <span className="font-semibold">{e.product_title}</span> – <span className="font-bold text-[#5B4FE5]">{e.price} €</span>
                  </p>
                )}
                {e.type === "kainos_kritimas" && (
                  <p className="text-[#374151] leading-snug">
                    <span className="font-bold">{e.username || "Vartotojas"}</span> sumažino{" "}
                    <span className="font-semibold">{e.product_title}</span> kainą:{" "}
                    <span className="line-through text-[#9CA3AF]">{e.old_price} €</span> ➔{" "}
                    <span className="font-bold text-[#5B4FE5]">{e.price} €</span>
                  </p>
                )}
                {e.type === "parduota" && (
                  <p className="text-[#374151] leading-snug">
                    <span className="font-bold">{e.username || "Vartotojas"}</span> pardavė{" "}
                    <span className="font-semibold">{e.product_title}</span>
                  </p>
                )}
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">{timeAgo(e.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
