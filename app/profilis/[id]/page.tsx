"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import UserBadge from "../../components/UserBadge";

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
};

type Profile = {
  id: string;
  username: string | null;
  sales_count: number | null;
  created_at: string;
};

type Listing = {
  id: string;
  title: string;
  price: number;
  city: string;
  condition: string;
  category: string;
  photos: string[] | null;
};

export default function PardavejoProfilis() {
  const params = useParams();
  const sellerId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, sales_count, created_at")
        .eq("id", sellerId)
        .single();
      setProfile(profileData);

      const { data: listingsData } = await supabase
        .from("products")
        .select("id, title, price, city, condition, category, photos")
        .eq("seller_id", sellerId)
        .eq("status", "aktyvus")
        .order("created_at", { ascending: false });
      setListings(listingsData || []);

      setLoading(false);
    }
    load();
  }, [sellerId]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-8 py-16 text-sm text-[#6B7280]">Kraunama...</div>;
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-8 py-16 text-center">
        <p className="text-sm text-[#6B7280] mb-4">Vartotojas nerastas.</p>
        <Link href="/" className="text-[#5B4FE5] font-bold text-sm">← Grįžti į pagrindinį</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-8 py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      <div className="bg-white border border-[#E4E7EE] rounded-2xl p-6 flex items-center gap-4 mb-8">
        <span className="w-16 h-16 rounded-full bg-[#5B4FE5] text-white flex items-center justify-center text-2xl font-bold shrink-0">
          {(profile.username || "P").charAt(0).toUpperCase()}
        </span>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-extrabold">{profile.username || "Vartotojas"}</h1>
            <UserBadge salesCount={profile.sales_count || 0} size="md" />
          </div>
          <p className="text-xs text-[#6B7280]">
            Platformoje nuo {new Date(profile.created_at).toLocaleDateString("lt-LT", { year: "numeric", month: "long" })}
          </p>
          <p className="text-xs text-[#6B7280]">{listings.length} aktyvūs skelbimai</p>
        </div>
      </div>

      <h2 className="text-lg font-extrabold mb-4">Skelbimai</h2>

      {listings.length === 0 ? (
        <p className="text-sm text-[#6B7280]">Šis vartotojas šiuo metu neturi aktyvių skelbimų.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {listings.map((l) => (
            <div key={l.id} className="bg-white border border-[#E4E7EE] rounded-xl overflow-hidden">
              <div className="h-32 bg-[#F0F1F6] flex items-center justify-center overflow-hidden">
                {l.photos && l.photos.length > 0 ? (
                  <img src={l.photos[0]} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={`/categories/${categoryImages[l.category] || ""}`}
                    className="w-10 h-10 object-contain opacity-50"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold mb-1 leading-snug line-clamp-2">{l.title}</div>
                <div className="text-sm font-extrabold text-[#5B4FE5] mb-1">{l.price} €</div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[#6B7280]">{l.city}</span>
                  <span className="text-[9px] font-bold bg-[#EEF0FF] text-[#5B4FE5] px-1.5 py-0.5 rounded-full capitalize">{l.condition}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
