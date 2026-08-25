import Link from "next/link";

export default function Kontaktai() {
  return (
    <div className="max-w-2xl mx-auto px-6 md:px-8 py-10 md:py-14">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Kontaktai</h1>
      <p className="text-sm text-[#6B7280] mb-8">
        Turi klausimų, pastebėjai problemą ar nori pranešti apie netinkamą skelbimą? Rašyk mums.
      </p>

      <div className="bg-white border border-[#E4E7EE] rounded-2xl p-6 flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-[#EEF0FF] flex items-center justify-center text-lg shrink-0">
          ✉️
        </div>
        <div>
          <div className="text-xs text-[#6B7280] mb-0.5">El. paštas</div>
          <a href="mailto:pcturgus@outlook.com" className="text-base font-bold text-[#5B4FE5] hover:underline">
            pcturgus@outlook.com
          </a>
        </div>
      </div>

      <p className="text-xs text-[#9CA3AF] mt-6">
        Stengiamės atsakyti kuo greičiau, paprastai per kelias darbo dienas.
      </p>
    </div>
  );
}
