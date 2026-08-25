"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Prisijungti() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError("Neteisingas el. paštas arba slaptažodis.");
      return;
    }

    router.push("/");
  }

  return (
    <div className="max-w-md mx-auto px-8 py-16">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      <h1 className="text-2xl font-extrabold mb-1">Prisijungimas</h1>
      <p className="text-sm text-[#6B7280] mb-8">Prisijunk prie savo PCturgus.lt paskyros.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-[#E4E7EE] rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold block mb-1.5">El. paštas</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tavo@paštas.lt"
            className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold">Slaptažodis</label>
            <Link href="/pamirsau-slaptazodi" className="text-xs font-semibold text-[#5B4FE5] hover:underline">
              Pamiršai slaptažodį?
            </Link>
          </div>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? "Jungiamasi..." : "Prisijungti"}
        </button>

        <p className="text-xs text-[#6B7280] text-center">
          Neturi paskyros?{" "}
          <Link href="/registracija" className="text-[#5B4FE5] font-bold">
            Registruokis
          </Link>
        </p>
      </form>
    </div>
  );
}
