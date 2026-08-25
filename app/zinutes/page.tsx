"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type ConversationRow = {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  product: { title: string; price: number; photos: string[] | null } | null;
  otherUsername: string;
  unreadCount: number;
};

export default function Zinutes() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/prisijungti");
        return;
      }

      const { data } = await supabase
        .from("conversations")
        .select("id, product_id, buyer_id, seller_id, created_at, product:products(title, price, photos)")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const rows = (data || []) as any[];

      const enriched = await Promise.all(
        rows.map(async (row) => {
          const otherId = row.buyer_id === user.id ? row.seller_id : row.buyer_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", otherId)
            .single();

          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", row.id)
            .eq("read", false)
            .neq("sender_id", user.id);

          return {
            ...row,
            product: Array.isArray(row.product) ? row.product[0] : row.product,
            otherUsername: profile?.username || "Vartotojas",
            unreadCount: count || 0,
          };
        })
      );

      setConversations(enriched);
      setLoading(false);
    }
    load();
  }, [router]);

  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      <h1 className="text-2xl font-extrabold mb-6">Žinutės</h1>

      {loading ? (
        <p className="text-sm text-[#6B7280]">Kraunama...</p>
      ) : conversations.length === 0 ? (
        <p className="text-sm text-[#6B7280]">Pokalbių dar nėra. Parašyk pardavėjui iš skelbimo puslapio.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/zinutes/${c.id}`}
              style={{ display: "flex", alignItems: "center", gap: "12px" }}
              className={`border rounded-xl p-3.5 hover:shadow-md transition-all ${
                c.unreadCount > 0 ? "bg-[#F5F3FF] border-[#5B4FE5]/30" : "bg-white border-[#E4E7EE]"
              }`}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  minWidth: "56px",
                  maxWidth: "56px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  background: "#F0F1F6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  position: "relative",
                }}
              >
                {c.product?.photos && c.product.photos.length > 0 ? (
                  <img
                    src={c.product.photos[0]}
                    style={{
                      width: "56px",
                      height: "56px",
                      objectFit: "cover",
                      display: "block",
                      filter: c.unreadCount > 0 ? "brightness(0.6)" : "none",
                    }}
                  />
                ) : (
                  "🖥️"
                )}
                {c.unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      background: "#EF4444",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: 800,
                      borderRadius: "999px",
                      minWidth: "22px",
                      height: "22px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                      boxShadow: "0 0 0 2px white",
                    }}
                  >
                    {c.unreadCount > 9 ? "9+" : c.unreadCount}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={`text-sm truncate ${c.unreadCount > 0 ? "font-extrabold" : "font-bold"}`}>
                  {c.otherUsername}
                </div>
                <div className="text-xs text-[#6B7280] truncate">{c.product?.title || "Skelbimas pašalintas"}</div>
              </div>
              {c.product?.price && (
                <div style={{ flexShrink: 0 }} className="text-sm font-extrabold text-[#5B4FE5]">
                  {c.product.price} €
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
