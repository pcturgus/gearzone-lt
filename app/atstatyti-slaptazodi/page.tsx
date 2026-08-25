"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function AtstatytiSlaptazodi() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Supabase automatiškai sukuria "recovery" sesiją iš nuorodos URL
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // jei sesija jau buvo nustatyta iki šio listenerio prisijungimo
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Slaptažodis turi būti bent 6 simbolių.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Slaptažodžiai nesutampa.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/"), 2000);
  }

  return (
    <div className="max-w-md mx-auto px-8 py-16">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      <h1 className="text-2xl font-extrabold mb-1">Naujas slaptažodis</h1>
      <p className="text-sm text-[#6B7280] mb-8">Įvesk naują slaptažodį savo paskyrai.</p>

      {success ? (
        <div className="bg-[#EEF0FF] border border-[#5B4FE5]/30 text-[#5B4FE5] text-sm font-semibold rounded-xl p-4">
          ✓ Slaptažodis pakeistas! Nukreipiama į pagrindinį...
        </div>
      ) : !ready ? (
        <p className="text-sm text-[#6B7280]">Tikrinama nuoroda...</p>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-[#E4E7EE] rounded-2xl p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-xl p-3">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-bold block mb-1.5">Naujas slaptažodis</label>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="bent 6 simboliai"
              className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1.5">Pakartok slaptažodį</label>
            <input
              required
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="pakartok slaptažodį"
              className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Saugoma..." : "Pakeisti slaptažodį"}
          </button>
        </form>
      )}
    </div>
  );
}
