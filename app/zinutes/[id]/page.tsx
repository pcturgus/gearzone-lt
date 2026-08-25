"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import UserBadge from "../.././components/UserBadge";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  read_at: string | null;
};

type ConversationInfo = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product: { id: string; title: string; price: number; photos: string[] | null } | null;
};

const ONLINE_THRESHOLD_MS = 60 * 1000; // 60s

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" });
}

export default function Pokalbis() {
  const params = useParams();
  const router = useRouter();
  
  // Pataisyta vieta: apsaugota nuo string | string[] | null tipo klaidų
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : (rawId ?? "");

  const [userId, setUserId] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState("Tu");
  const [mySales, setMySales] = useState(0);
  const [conversation, setConversation] = useState<ConversationInfo | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [otherUsername, setOtherUsername] = useState("Vartotojas");
  const [otherSales, setOtherSales] = useState(0);
  const [otherOnline, setOtherOnline] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/prisijungti");
        return;
      }
      setUserId(user.id);

      const { data: myProfile } = await supabase.from("profiles").select("username, sales_count").eq("id", user.id).single();
      setMyUsername(myProfile?.username || "Tu");
      setMySales(myProfile?.sales_count || 0);

      const { data: conv } = await supabase
        .from("conversations")
        .select("id, buyer_id, seller_id, product:products(id, title, price, photos)")
        .eq("id", id)
        .single();

      if (!conv) {
        setLoading(false);
        return;
      }

      const convInfo = { ...conv, product: Array.isArray(conv.product) ? conv.product[0] : conv.product } as ConversationInfo;
      setConversation(convInfo);

      const otherUid = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
      setOtherId(otherUid);

      const { data: profile } = await supabase.from("profiles").select("username, last_seen, sales_count").eq("id", otherUid).single();
      setOtherUsername(profile?.username || "Vartotojas");
      setOtherSales(profile?.sales_count || 0);
      if (profile?.last_seen) {
        setOtherOnline(Date.now() - new Date(profile.last_seen).getTime() < ONLINE_THRESHOLD_MS);
      }

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at, read, read_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);
      setLoading(false);

      await supabase
        .from("messages")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("conversation_id", id)
        .neq("sender_id", user.id)
        .eq("read", false);
    }
    load();
  }, [id, router]);

  // heartbeat - pažymim save online
  useEffect(() => {
    if (!userId) return;
    async function ping() {
      await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", userId);
    }
    ping();
    const interval = setInterval(ping, 25000);
    return () => clearInterval(interval);
  }, [userId]);

  // periodiškai tikrinam kito žmogaus online statusą
  useEffect(() => {
    if (!otherId) return;
    async function checkOnline() {
      const { data: profile } = await supabase.from("profiles").select("last_seen").eq("id", otherId).single();
      if (profile?.last_seen) {
        setOtherOnline(Date.now() - new Date(profile.last_seen).getTime() < ONLINE_THRESHOLD_MS);
      }
    }
    const interval = setInterval(checkOnline, 15000);
    return () => clearInterval(interval);
  }, [otherId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !userId) return;

    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: userId, content: text.trim() })
      .select("id, sender_id, content, created_at, read, read_at")
      .single();

    setSending(false);

    if (!error && data) {
      setMessages((prev) => [...prev, data]);
      setText("");
    }
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-8 py-16 text-sm text-[#6B7280]">Kraunama...</div>;
  }

  if (!conversation) {
    return <div className="max-w-2xl mx-auto px-8 py-16 text-sm text-[#6B7280]">Pokalbis nerastas.</div>;
  }

  // rasti paskutinę mano žinutę, kad parodytume "Matyta" tik po ja
  const lastMineIndex = [...messages].map((m) => m.sender_id).lastIndexOf(userId ?? "");

  return (
    <div className="max-w-2xl mx-auto px-8 py-8 flex flex-col h-screen">
      <Link href="/zinutes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-4">
        ← Visos žinutės
      </Link>

      {/* SKELBIMO KONTEKSTAS - sumažinta nuotrauka */}
      {conversation.product && (
        <Link
          href={`/skelbimai/${conversation.product.id}`}
          className="flex items-center gap-3 bg-white border border-[#E4E7EE] rounded-xl p-2.5 mb-4 hover:shadow-md transition-all"
        >
          <div style={{ width: "40px", height: "40px", minWidth: "40px", borderRadius: "8px", overflow: "hidden", background: "#F0F1F6" }} className="flex items-center justify-center text-base">
            {conversation.product.photos && conversation.product.photos.length > 0 ? (
              <img src={conversation.product.photos[0]} style={{ width: "40px", height: "40px", objectFit: "cover" }} />
            ) : (
              "🖥️"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-[#6B7280]">Skelbimas</div>
            <div className="text-xs font-bold truncate">{conversation.product.title}</div>
          </div>
          <div className="text-sm font-extrabold text-[#5B4FE5] shrink-0">{conversation.product.price} €</div>
        </Link>
      )}

      {/* VARTOTOJO STATUSAS */}
      <div className="flex items-center gap-2 mb-3">
        <h1 className="text-lg font-extrabold">{otherUsername}</h1>
        <span className="flex items-center gap-1.5 text-xs text-[#6B7280]">
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "999px",
              background: otherOnline ? "#22C55E" : "#9CA3AF",
              display: "inline-block",
            }}
          />
          {otherOnline ? "prisijungęs" : "atsijungęs"}
        </span>
      </div>

      {/* ŽINUTĖS */}
      <div className="flex-1 overflow-y-auto bg-white border border-[#E4E7EE] rounded-2xl p-4 flex flex-col gap-3 mb-4">
        {messages.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center my-auto">Parašyk pirmą žinutę.</p>
        ) : (
          messages.map((m, i) => {
            const isMine = m.sender_id === userId;
            const senderName = isMine ? myUsername : otherUsername;
            return (
              <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <span className="flex items-center gap-1.5 mb-0.5 px-1">
                  <UserBadge salesCount={isMine ? mySales : otherSales} size="sm" />
                  <span className="text-[10px] font-semibold text-[#9CA3AF]">{senderName}</span>
                </span>
                <div
                  className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm ${
                    isMine ? "bg-[#5B4FE5] text-white rounded-br-sm" : "bg-[#F6F7FB] text-[#12172B] rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
                {isMine && i === lastMineIndex && m.read && (
                  <span className="text-[10px] text-[#9CA3AF] mt-1 px-1">
                    Matyta {m.read_at ? formatTime(m.read_at) : ""}
                  </span>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* SIUNTIMO FORMA */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Rašyk žinutę..."
          className="flex-1 border border-[#E4E7EE] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#5B4FE5]"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg disabled:opacity-50"
        >
          Siųsti
        </button>
      </form>
    </div>
  );
}