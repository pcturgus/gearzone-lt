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
  category: string | null;
  created_at: string;
};

const categoryImages: Record<string, string> = {
  "Vaizdo plokštės": "vaizdo-plokstes.png",
  "Procesoriai": "procesoriai.png",
  "Pagrindinės plokštės": "pagrindines-plokstes.png",
  "Operatyvioji atmintis": "ram.png",
  "SSD / HDD": "ssd-hdd.png",
  "Maitinimo blokai": "maitinimo-blokai.png",
  "Korpusai": "korpusai.png",
  "Aušintuvai": "ausintuvai.png",
  "Pelės": "peles.png",
  "Klaviatūros": "klaviaturos.png",
  "Pelių kilimėliai": "peliu-kilimeliai.png",
  "Ausinės / mikrofonai": "ausines-mikrofonai.png",
  "Monitoriai": "monitoriai.png",
  "Kėdės ir stalai": "kedes-stalai.png",
  "Tinklo įranga": "tinklo-iranga.png",
  "Mikrofonai ir transliavimo įranga": "mikrofonai-transliavimas.png",
  "Stacionarūs kompiuteriai (PC)": "stacionarus-kompiuteriai.png",
  "Nešiojamas kompiuteris": "nesiojami-kompiuteriai.png",
  "Kolonėlės": "koloneles.png",
  "Žaidimų pulteliai": "zaidimu-pulteliai.png",
  "Žaidimų konsolės ir žaidimai": "zaidimu-konsoles.png",
  "Virtuali realybė (VR)": "vr.png",
  "Kita": "kita.png",
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

function EventThumb({ event }: { event: ActivityEvent }) {
  const imageFile = event.category ? categoryImages[event.category] : null;

  if (imageFile) {
    return (
      <div
        style={{ width: "34px", height: "34px", minWidth: "34px", borderRadius: "8px", overflow: "hidden", background: "#F0F1F6" }}
      >
        <img
          src={`/categories/${imageFile}`}
          alt=""
          style={{ width: "34px", height: "34px", objectFit: "cover" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
    );
  }

  // atsarginis neutralus avataras (be jokio emoji) - vartotojo vardo raidė
  const letter = (event.username || "?").charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: "34px",
        height: "34px",
        minWidth: "34px",
        borderRadius: "8px",
        background: "#EEF0FF",
        color: "#5B4FE5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: 800,
      }}
    >
      {letter}
    </div>
  );
}

export default function LiveFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("activity_logs")
        .select("id, type, username, product_title, price, old_price, category, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
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
          setEvents((prev) => [payload.new as ActivityEvent, ...prev].slice(0, 10));
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
        <span className="text-sm font-extrabold">Bendruomenės pulsas</span>
      </div>

      {loading ? (
        <p className="text-xs text-[#6B7280]">Kraunama...</p>
      ) : events.length === 0 ? (
        <p className="text-xs text-[#6B7280]">Kol kas jokios veiklos.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-2.5" style={{ animation: "feedFadeIn 0.4s ease" }}>
              <EventThumb event={e} />
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug">
                  <span className="font-bold text-[#12172B]">{e.username || "Vartotojas"}</span>{" "}
                  {e.type === "naujas_narys" && <span className="text-[#6B7280]">prisijungė prie bendruomenės</span>}
                  {e.type === "naujas_skelbimas" && (
                    <>
                      <span className="text-[#6B7280]">įkėlė</span>{" "}
                      <span className="font-semibold text-[#5B4FE5]">{e.product_title}</span>
                    </>
                  )}
                  {e.type === "kainos_kritimas" && (
                    <>
                      <span className="text-[#6B7280]">sumažino</span>{" "}
                      <span className="font-semibold text-[#5B4FE5]">{e.product_title}</span>{" "}
                      <span className="text-[#6B7280]">kainą</span>
                    </>
                  )}
                  {e.type === "parduota" && (
                    <>
                      <span className="text-[#6B7280]">pardavė</span>{" "}
                      <span className="font-semibold text-[#5B4FE5]">{e.product_title}</span>
                    </>
                  )}
                </p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">{timeAgo(e.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
