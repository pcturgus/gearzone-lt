"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Product = {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  category: string;
  condition: string;
  city: string;
  description: string | null;
  photos: string[] | null;
  seller_id: string | null;
};

export default function SkelbimoDetalus() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [sellerUsername, setSellerUsername] = useState("Pardavėjas");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadInfo, setUnreadInfo] = useState<{ count: number; conversationId: string | null }>({
    count: 0,
    conversationId: null,
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data: p } = await supabase.from("products").select("*").eq("id", id).single();
      setProduct(p);

      if (p?.seller_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", p.seller_id)
          .single();
        setSellerUsername(profile?.username || "Pardavėjas");
      }

      // jei tai mano skelbimas - patikrinam ar yra neperskaitytų žinučių apie jį
      if (user && p?.seller_id === user.id) {
        const { data: convs } = await supabase
          .from("conversations")
          .select("id")
          .eq("product_id", id);

        const convIds = (convs || []).map((c) => c.id);

        if (convIds.length > 0) {
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .in("conversation_id", convIds)
            .eq("read", false)
            .neq("sender_id", user.id);

          setUnreadInfo({
            count: count || 0,
            conversationId: convIds.length === 1 ? convIds[0] : null,
          });
        }
      }

      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  async function handleMessageSeller() {
    if (!product || !product.seller_id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/prisijungti");
      return;
    }

    setStarting(true);

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("product_id", product.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", product.seller_id)
      .maybeSingle();

    if (existing) {
      router.push(`/zinutes/${existing.id}`);
      return;
    }

    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ product_id: product.id, buyer_id: user.id, seller_id: product.seller_id })
      .select("id")
      .single();

    setStarting(false);

    if (error) {
      alert("Nepavyko pradėti pokalbio: " + error.message);
      return;
    }

    router.push(`/zinutes/${created.id}`);
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-8 py-16 text-sm text-[#6B7280]">Kraunama...</div>;
  }

  if (!product) {
    return <div className="max-w-5xl mx-auto px-8 py-16 text-sm text-[#6B7280]">Skelbimas nerastas.</div>;
  }

  const photos = product.photos && product.photos.length > 0 ? product.photos : [];
  const isOwnListing = currentUserId && currentUserId === product.seller_id;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      {isOwnListing && unreadInfo.count > 0 && (
        <Link
          href={unreadInfo.conversationId ? `/zinutes/${unreadInfo.conversationId}` : "/zinutes"}
          className="flex items-center justify-between bg-[#F5F3FF] border border-[#5B4FE5]/30 rounded-xl px-4 py-3 mb-6 hover:shadow-md transition-all"
        >
          <span className="text-sm font-semibold text-[#5B4FE5]">
            💬 Turi {unreadInfo.count} neperskaitytą {unreadInfo.count === 1 ? "žinutę" : "žinutes"} apie šį skelbimą
          </span>
          <span className="text-sm font-bold text-[#5B4FE5]">Žiūrėti →</span>
        </Link>
      )}

      <div className="grid grid-cols-[1fr_360px] gap-8 items-start">
        {/* KAIRĖ - NUOTRAUKOS + INFO */}
        <div>
          <div
            onClick={() => photos.length > 0 && setLightboxOpen(true)}
            className={`bg-[#F0F1F6] rounded-2xl h-64 flex items-center justify-center text-5xl overflow-hidden mb-3 ${
              photos.length > 0 ? "cursor-zoom-in" : ""
            }`}
          >
            {photos.length > 0 ? (
              <img src={photos[activePhoto]} className="w-full h-full object-cover" />
            ) : (
              "🖥️"
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 mb-6">
              {photos.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhoto(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${i === activePhoto ? "border-[#5B4FE5]" : "border-transparent"}`}
                >
                  <img src={src} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <h1 className="text-2xl font-extrabold mb-2">{product.title}</h1>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-bold bg-[#EEF0FF] text-[#5B4FE5] px-2.5 py-1 rounded-full capitalize">{product.condition}</span>
            <span className="text-xs text-[#6B7280]">{product.category}</span>
            <span className="text-xs text-[#6B7280]">· {product.city}</span>
          </div>

          {product.description && (
            <div className="bg-white border border-[#E4E7EE] rounded-2xl p-5">
              <h2 className="text-sm font-extrabold mb-2">Aprašymas</h2>
              <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          )}
        </div>

        {/* DEŠINĖ - KAINA + PARDAVĖJAS */}
        <div className="bg-white border border-[#E4E7EE] rounded-2xl p-6 sticky top-24">
          {product.old_price && (
            <span className="block text-sm text-[#6B7280] line-through mb-1">{product.old_price} €</span>
          )}
          <div className="text-3xl font-extrabold text-[#5B4FE5] mb-5">{product.price} €</div>

          <div className="flex items-center gap-2.5 mb-5 pb-5 border-b border-[#F0F1F6]">
            <span className="w-9 h-9 rounded-full bg-[#F6F7FB] flex items-center justify-center text-sm">👤</span>
            <div>
              <div className="text-sm font-bold">{sellerUsername}</div>
              <div className="text-xs text-[#6B7280]">Pardavėjas</div>
            </div>
          </div>

          {isOwnListing ? (
            <p className="text-xs text-[#6B7280] text-center">Tai tavo skelbimas.</p>
          ) : (
            <button
              onClick={handleMessageSeller}
              disabled={starting || !product.seller_id}
              className="w-full bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg disabled:opacity-50"
            >
              {starting ? "Pradedama..." : "✉ Rašyti pardavėjui"}
            </button>
          )}

          {!product.seller_id && (
            <p className="text-xs text-[#6B7280] text-center mt-2">
              Šis skelbimas neturi susieto pardavėjo (sukurtas prieš įvedant prisijungimą).
            </p>
          )}
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightboxOpen && photos.length > 0 && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] p-8 cursor-zoom-out"
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center"
          >
            ✕
          </button>

          <img
            src={photos[activePhoto]}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg"
          />

          {photos.length > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-6 flex gap-2"
            >
              {photos.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhoto(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 ${i === activePhoto ? "border-white" : "border-transparent opacity-60"}`}
                >
                  <img src={src} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
