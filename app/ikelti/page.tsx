"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

const categories = [
  "Vaizdo plokštės",
  "Procesoriai",
  "Pagrindinės plokštės",
  "Operatyvioji atmintis",
  "SSD / HDD",
  "Maitinimo blokai",
  "Korpusai",
  "Aušintuvai",
  "Pelės",
  "Klaviatūros",
  "Pelių kilimėliai",
  "Ausinės / mikrofonai",
  "Monitoriai",
  "Kėdės ir stalai",
  "Tinklo įranga",
];

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
    img.onload = () => {
      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Nepavyko suspausti nuotraukos"));
        },
        "image/jpeg",
        0.7
      );
    };
    img.onerror = reject;
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Ikelti() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [condition, setCondition] = useState("naudotas");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/prisijungti");
        return;
      }
      setUserId(user.id);
      setCheckingAuth(false);
    }
    checkAuth();
  }, [router]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || []);
    setPhotos((prev) => {
      const combined = [...prev, ...newFiles].slice(0, 4);
      setPreviews(combined.map((f) => URL.createObjectURL(f)));
      return combined;
    });
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      setPreviews(updated.map((f) => URL.createObjectURL(f)));
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    setError("");

    try {
      const photoUrls: string[] = [];

      for (const file of photos) {
        const compressed = await compressImage(file);
        const fileName = `${crypto.randomUUID()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("product-photos")
          .upload(fileName, compressed, { contentType: "image/jpeg" });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("product-photos").getPublicUrl(fileName);
        photoUrls.push(data.publicUrl);
      }

      const { error: insertError } = await supabase.from("products").insert({
        title,
        category,
        brand: brand || null,
        price: Number(price),
        old_price: oldPrice ? Number(oldPrice) : null,
        condition,
        city,
        description: description || null,
        photos: photoUrls,
        seller_id: userId,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Įvyko klaida");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return <div className="max-w-2xl mx-auto px-8 py-16 text-sm text-[#6B7280]">Kraunama...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      <h1 className="text-2xl font-extrabold mb-1">Įkelti skelbimą</h1>
      <p className="text-sm text-[#6B7280] mb-8">Užpildyk informaciją apie parduodamą prekę.</p>

           {success && (
        <div className="bg-[#EEF0FF] border border-[#5B4FE5]/30 text-[#5B4FE5] text-sm font-semibold rounded-xl p-4 mb-6">
          <p>✓ Jūsų skelbimas sėkmingai pateiktas! Administracija netrukus peržiūrės ir patvirtins jūsų skelbimą.</p>
          <button onClick={() => router.push("/")} className="underline mt-2">
            Grįžti į pagrindinį
          </button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-xl p-4 mb-6">
          Klaida: {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-[#E4E7EE] rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold block mb-1.5">Nuotraukos ({photos.length}/4)</label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="hidden"
          />

          <div className="flex gap-2 flex-wrap">
            {previews.map((src, i) => (
              <div key={i} className="relative w-20 h-20">
                <img src={src} className="w-full h-full object-cover rounded-lg border border-[#E4E7EE]" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}

            {photos.length < 4 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-[#E4E7EE] flex flex-col items-center justify-center text-[#6B7280] text-xs font-semibold hover:border-[#5B4FE5] hover:text-[#5B4FE5] transition-colors"
              >
                <span className="text-xl leading-none mb-1">+</span>
                Pridėti
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold block mb-1.5">Pavadinimas</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="pvz. ASUS TUF RTX 4070 Ti SUPER 16GB"
            className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold block mb-1.5">Kategorija</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1.5">Prekės ženklas</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="pvz. ASUS, MSI, AMD"
              className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold block mb-1.5">Kaina, €</label>
            <input
              required
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="99"
              className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
            />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1.5">Sena kaina, € (nebūtina)</label>
            <input
              type="number"
              value={oldPrice}
              onChange={(e) => setOldPrice(e.target.value)}
              placeholder="129"
              className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold block mb-1.5">Būklė</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
            >
              <option value="naujas">Naujas</option>
              <option value="naudotas">Naudotas</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1.5">Miestas</label>
            <input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="pvz. Vilnius"
              className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold block mb-1.5">Aprašymas</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Papasakok apie prekės būklę, naudojimo laiką ir t.t."
            className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5] resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg mt-2 disabled:opacity-50"
        >
          {loading ? "Skelbiama..." : "Skelbti"}
        </button>
      </form>
    </div>
  );
}
