"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Registracija() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("username")) {
        setError("Šis vartotojo vardas jau užimtas. Pasirink kitą.");
      } else {
        setError(error.message);
      }
      return;
    }

    router.push("/");
  }

  return (
    <div className="max-w-md mx-auto px-8 py-16">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      <h1 className="text-2xl font-extrabold mb-1">Registracija</h1>
      <p className="text-sm text-[#6B7280] mb-8">Sukurk paskyrą, kad galėtum skelbti ir susirašinėti su pardavėjais.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-[#E4E7EE] rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold block mb-1.5">Vartotojo vardas</label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="pvz. techGuy21"
            className="w-full border border-[#E4E7EE] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5B4FE5]"
          />
        </div>

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
          <label className="text-xs font-bold block mb-1.5">Slaptažodis</label>
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

        <button
          type="submit"
          disabled={loading}
          className="bg-[#5B4FE5] hover:bg-[#4338CA] transition-colors text-white text-sm font-bold px-5 py-3 rounded-lg mt-2 disabled:opacity-50"
        >
          {loading ? "Registruojama..." : "Registruotis"}
        </button>

        <p className="text-xs text-[#6B7280] text-center">
          Jau turi paskyrą?{" "}
          <Link href="/prisijungti" className="text-[#5B4FE5] font-bold">
            Prisijunk
          </Link>
        </p>
      </form>
    </div>
  );
}
