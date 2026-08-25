"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function PamirsauSlaptazodi() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atstatyti-slaptazodi`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="max-w-md mx-auto px-8 py-16">
      <Link href="/prisijungti" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į prisijungimą
      </Link>

      <h1 className="text-2xl font-extrabold mb-1">Pamiršai slaptažodį?</h1>
      <p className="text-sm text-[#6B7280] mb-8">Įvesk savo el. paštą – atsiųsime nuorodą slaptažodžiui atstatyti.</p>

      {sent ? (
        <div className="bg-[#EEF0FF] border border-[#5B4FE5]/30 text-[#5B4FE5] text-sm font-semibold rounded-xl p-4">
          ✓ Jei šis el. paštas registruotas, netrukus gausi laišką su nuoroda slaptažodžiui atstatyti.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-[#E4E7EE] rounded-2xl p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-xl p-3">
              {error}
            </div>
          )}

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

          <button
            type="submit"
            disabled={loading}
            className="bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Siunčiama..." : "Siųsti nuorodą"}
          </button>
        </form>
      )}
    </div>
  );
}
