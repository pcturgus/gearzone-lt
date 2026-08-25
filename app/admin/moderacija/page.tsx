"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type PendingProduct = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  condition: string;
  city: string;
  photos: string[] | null;
  seller_id: string | null;
  created_at: string;
  sellerUsername: string;
};

type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  senderLabel: string;
};

function extractStoragePath(url: string): string | null {
  const marker = "/product-photos/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

export default function AdminModeracija() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [pending, setPending] = useState<PendingProduct[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [deleteRequests, setDeleteRequests] = useState<PendingProduct[]>([]);
  const [loadingDeleteRequests, setLoadingDeleteRequests] = useState(true);
  const [processingDeleteId, setProcessingDeleteId] = useState<string | null>(null);

  const [chatModalProduct, setChatModalProduct] = useState<PendingProduct | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/prisijungti");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") {
        setChecking(false);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
      setChecking(false);
      loadPending();
      loadDeleteRequests();
    }
    checkAdmin();
  }, [router]);

  async function attachUsernames(list: any[]): Promise<PendingProduct[]> {
    return Promise.all(
      list.map(async (p) => {
        let sellerUsername = "Vartotojas";
        if (p.seller_id) {
          const { data: profile } = await supabase.from("profiles").select("username").eq("id", p.seller_id).single();
          sellerUsername = profile?.username || "Vartotojas";
        }
        return { ...p, sellerUsername };
      })
    );
  }

  async function loadPending() {
    setLoadingPending(true);
    const { data } = await supabase
      .from("products")
      .select("id, title, description, price, category, condition, city, photos, seller_id, created_at")
      .eq("status", "laukia_patvirtinimo")
      .order("created_at", { ascending: true });
    setPending(await attachUsernames(data || []));
    setLoadingPending(false);
  }

  async function loadDeleteRequests() {
    setLoadingDeleteRequests(true);
    const { data } = await supabase
      .from("products")
      .select("id, title, description, price, category, condition, city, photos, seller_id, created_at")
      .eq("status", "laukia_istrynimo")
      .order("created_at", { ascending: true });
    setDeleteRequests(await attachUsernames(data || []));
    setLoadingDeleteRequests(false);
  }

  async function approve(p: PendingProduct) {
    setProcessingId(p.id);
    const { error } = await supabase.from("products").update({ status: "aktyvus" }).eq("id", p.id);
    setProcessingId(null);
    if (!error) {
      setPending((prev) => prev.filter((x) => x.id !== p.id));
    } else {
      alert("Nepavyko patvirtinti: " + error.message);
    }
  }

  async function reject(p: PendingProduct) {
    if (!confirm(`Ar tikrai atmesti skelbimą „${p.title}“? Jis bus visiškai ištrintas.`)) return;
    setProcessingId(p.id);

    if (p.photos && p.photos.length > 0) {
      const paths = p.photos.map(extractStoragePath).filter((x): x is string => !!x);
      if (paths.length > 0) await supabase.storage.from("product-photos").remove(paths);
    }

    if (p.seller_id) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("notifications").insert({
        user_id: p.seller_id,
        from_user_id: user?.id,
        product_id: null,
        message: `Jūsų skelbimas „${p.title}“ buvo atmestas per moderaciją.`,
      });
    }

    const { error } = await supabase.from("products").delete().eq("id", p.id);
    setProcessingId(null);
    if (!error) {
      setPending((prev) => prev.filter((x) => x.id !== p.id));
    } else {
      alert("Nepavyko atmesti: " + error.message);
    }
  }

  async function openChatModal(p: PendingProduct) {
    setChatModalProduct(p);
    setChatLoading(true);
    setChatMessages([]);

    const { data: convs } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id")
      .eq("product_id", p.id);

    const convIds = (convs || []).map((c) => c.id);

    if (convIds.length === 0) {
      setChatLoading(false);
      return;
    }

    const usernameCache: Record<string, string> = {};
    async function getUsername(id: string) {
      if (usernameCache[id]) return usernameCache[id];
      const { data } = await supabase.from("profiles").select("username").eq("id", id).single();
      const name = data?.username || "Vartotojas";
      usernameCache[id] = name;
      return name;
    }

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at, conversation_id")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: true });

    const withNames = await Promise.all(
      (msgs || []).map(async (m) => ({
        id: m.id,
        sender_id: m.sender_id,
        content: m.content,
        created_at: m.created_at,
        senderLabel: await getUsername(m.sender_id),
      }))
    );

    setChatMessages(withNames);
    setChatLoading(false);
  }

  async function confirmRealSale(p: PendingProduct) {
    if (!confirm(`Patvirtinti, kad „${p.title}“ realiai parduota? Skelbimas ir susiję pokalbiai bus visiškai ištrinti.`)) return;
    setProcessingDeleteId(p.id);

    if (p.photos && p.photos.length > 0) {
      const paths = p.photos.map(extractStoragePath).filter((x): x is string => !!x);
      if (paths.length > 0) await supabase.storage.from("product-photos").remove(paths);
    }

    const { data: sellerProfile } = p.seller_id
      ? await supabase.from("profiles").select("username").eq("id", p.seller_id).single()
      : { data: null };

    const { error } = await supabase.from("products").delete().eq("id", p.id);

    if (!error) {
      await supabase.from("activity_logs").insert({
        type: "parduota",
        username: sellerProfile?.username || "Vartotojas",
        product_title: p.title,
        price: p.price,
        product_id: null,
        category: p.category,
      });
      setDeleteRequests((prev) => prev.filter((x) => x.id !== p.id));
    } else {
      alert("Nepavyko patvirtinti: " + error.message);
    }
    setProcessingDeleteId(null);
    setChatModalProduct(null);
  }

  async function deleteFake(p: PendingProduct) {
    if (!confirm(`Ištrinti „${p.title}“ kaip fake skelbimą? Jokio pranešimo į LiveFeed nebus.`)) return;
    setProcessingDeleteId(p.id);

    if (p.photos && p.photos.length > 0) {
      const paths = p.photos.map(extractStoragePath).filter((x): x is string => !!x);
      if (paths.length > 0) await supabase.storage.from("product-photos").remove(paths);
    }

    const { error } = await supabase.from("products").delete().eq("id", p.id);
    setProcessingDeleteId(null);

    if (!error) {
      setDeleteRequests((prev) => prev.filter((x) => x.id !== p.id));
      setChatModalProduct(null);
    } else {
      alert("Nepavyko ištrinti: " + error.message);
    }
  }

  async function returnToActive(p: PendingProduct) {
    setProcessingDeleteId(p.id);
    const { error } = await supabase.from("products").update({ status: "aktyvus" }).eq("id", p.id);
    setProcessingDeleteId(null);

    if (!error) {
      setDeleteRequests((prev) => prev.filter((x) => x.id !== p.id));
      setChatModalProduct(null);
    } else {
      alert("Nepavyko grąžinti: " + error.message);
    }
  }

  if (checking) {
    return <div className="max-w-4xl mx-auto px-8 py-16 text-sm text-[#6B7280]">Tikrinama...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-8 py-16 text-center">
        <p className="text-sm text-[#6B7280] mb-4">Neturi teisės pasiekti šio puslapio.</p>
        <Link href="/" className="text-[#5B4FE5] font-bold text-sm">
          ← Grįžti į pagrindinį
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      <h1 className="text-2xl font-extrabold mb-1">Moderacija</h1>
      <p className="text-sm text-[#6B7280] mb-8">Nauji skelbimai ir pardavimo/ištrynimo prašymai.</p>

      {/* NAUJI SKELBIMAI */}
      <h2 className="text-lg font-extrabold mb-3">Nauji skelbimai laukiantys patvirtinimo</h2>
      {loadingPending ? (
        <p className="text-sm text-[#6B7280] mb-8">Kraunama...</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-[#6B7280] mb-8">Šiuo metu nėra laukiančių skelbimų.</p>
      ) : (
        <div className="flex flex-col gap-4 mb-10">
          {pending.map((p) => (
            <div key={p.id} className="bg-white border border-[#E4E7EE] rounded-2xl overflow-hidden">
              <div className="flex gap-4 p-4">
                <div style={{ width: "120px", height: "120px", minWidth: "120px", borderRadius: "10px", overflow: "hidden", background: "#F0F1F6" }} className="flex items-center justify-center text-3xl">
                  {p.photos && p.photos.length > 0 ? (
                    <img src={p.photos[0]} style={{ width: "120px", height: "120px", objectFit: "cover" }} />
                  ) : (
                    "🖥️"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-base font-bold">{p.title}</span>
                    <span className="text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">LAUKIA PATVIRTINIMO</span>
                  </div>
                  <div className="text-xs text-[#6B7280] mb-1">
                    {p.category} · {p.condition} · {p.city} · pardavėjas: <span className="font-semibold">{p.sellerUsername}</span>
                  </div>
                  {p.description && <p className="text-xs text-[#374151] leading-relaxed mb-2 line-clamp-3">{p.description}</p>}
                  <div className="text-lg font-extrabold text-[#5B4FE5]">{p.price} €</div>
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button onClick={() => approve(p)} disabled={processingId === p.id} className="flex items-center gap-1.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg disabled:opacity-50">
                  🟢 Patvirtinti skelbimą
                </button>
                <button onClick={() => reject(p)} disabled={processingId === p.id} className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg disabled:opacity-50">
                  🔴 Atmesti / Ištrinti
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PARDAVIMO / IŠTRYNIMO PRAŠYMAI */}
      <h2 className="text-lg font-extrabold mb-3">Pardavimo / ištrynimo prašymai</h2>
      {loadingDeleteRequests ? (
        <p className="text-sm text-[#6B7280]">Kraunama...</p>
      ) : deleteRequests.length === 0 ? (
        <p className="text-sm text-[#6B7280]">Šiuo metu nėra prašymų.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {deleteRequests.map((p) => (
            <div key={p.id} className="bg-white border border-[#E4E7EE] rounded-2xl overflow-hidden">
              <div className="flex gap-4 p-4">
                <div style={{ width: "120px", height: "120px", minWidth: "120px", borderRadius: "10px", overflow: "hidden", background: "#F0F1F6" }} className="flex items-center justify-center text-3xl">
                  {p.photos && p.photos.length > 0 ? (
                    <img src={p.photos[0]} style={{ width: "120px", height: "120px", objectFit: "cover" }} />
                  ) : (
                    "🖥️"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-base font-bold">{p.title}</span>
                    <span className="text-[10px] font-bold bg-orange-400 text-orange-950 px-2 py-0.5 rounded-full">LAUKIA SPRENDIMO</span>
                  </div>
                  <div className="text-xs text-[#6B7280] mb-1">
                    {p.category} · {p.condition} · {p.city} · pardavėjas: <span className="font-semibold">{p.sellerUsername}</span>
                  </div>
                  <div className="text-lg font-extrabold text-[#5B4FE5]">{p.price} €</div>
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-4 flex-wrap">
                <button onClick={() => openChatModal(p)} className="flex items-center gap-1.5 text-sm font-bold text-[#5B4FE5] bg-[#EEF0FF] hover:bg-[#E0E4FF] px-4 py-2 rounded-lg">
                  💬 Peržiūrėti pokalbį
                </button>
                <button onClick={() => confirmRealSale(p)} disabled={processingDeleteId === p.id} className="flex items-center gap-1.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg disabled:opacity-50">
                  🟢 Patvirtinti tikrą pardavimą
                </button>
                <button onClick={() => deleteFake(p)} disabled={processingDeleteId === p.id} className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg disabled:opacity-50">
                  🔴 Ištrinti (Fake pardavimas)
                </button>
                <button onClick={() => returnToActive(p)} disabled={processingDeleteId === p.id} className="flex items-center gap-1.5 text-sm font-bold text-[#374151] bg-[#F6F7FB] hover:bg-[#EEF0FF] px-4 py-2 rounded-lg disabled:opacity-50">
                  🔄 Atmesti (grąžinti į aktyvius)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* POKALBIO MODALAS */}
      {chatModalProduct && (
        <div onClick={() => setChatModalProduct(null)} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold">Pokalbis apie „{chatModalProduct.title}“</h3>
              <button onClick={() => setChatModalProduct(null)} className="w-8 h-8 rounded-full bg-[#F6F7FB] hover:bg-[#EEF0FF] text-sm flex items-center justify-center">
                ✕
              </button>
            </div>

            {chatLoading ? (
              <p className="text-sm text-[#6B7280]">Kraunama...</p>
            ) : chatMessages.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Šiam skelbimui susirašinėjimų nėra.</p>
            ) : (
              <div className="flex flex-col gap-2.5 mb-5">
                {chatMessages.map((m) => (
                  <div key={m.id} className="bg-[#F6F7FB] rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold">{m.senderLabel}</span>
                      <span className="text-[10px] text-[#9CA3AF]">{new Date(m.created_at).toLocaleString("lt-LT")}</span>
                    </div>
                    <p className="text-sm text-[#374151]">{m.content}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => confirmRealSale(chatModalProduct)} disabled={processingDeleteId === chatModalProduct.id} className="flex items-center gap-1.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg disabled:opacity-50">
                🟢 Patvirtinti tikrą pardavimą
              </button>
              <button onClick={() => deleteFake(chatModalProduct)} disabled={processingDeleteId === chatModalProduct.id} className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg disabled:opacity-50">
                🔴 Ištrinti (Fake)
              </button>
              <button onClick={() => returnToActive(chatModalProduct)} disabled={processingDeleteId === chatModalProduct.id} className="flex items-center gap-1.5 text-sm font-bold text-[#374151] bg-[#F6F7FB] hover:bg-[#EEF0FF] px-4 py-2 rounded-lg disabled:opacity-50">
                🔄 Atmesti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
