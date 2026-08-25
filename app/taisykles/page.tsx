import Link from "next/link";

export default function Taisykles() {
  return (
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-10 md:py-14">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Naudojimosi taisyklės</h1>
      <p className="text-sm text-[#6B7280] mb-8">Paskutinį kartą atnaujinta: 2026-08-25</p>

      <div className="flex flex-col gap-7 text-sm text-[#374151] leading-relaxed">
        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">1. Apie platformą</h2>
          <p>
            PCturgus.lt (toliau – Platforma) yra internetinė skelbimų platforma, kurioje vartotojai gali skelbti,
            ieškoti ir susisiekti dėl kompiuterio komponentų bei susijusios technikos pirkimo ir pardavimo.
            Platforma yra tik susisiekimo tarpininkas – ji nedalyvauja pačiame pirkimo–pardavimo sandoryje,
            neapdoroja mokėjimų ir netarpininkauja siunčiant prekes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">2. Registracija ir paskyra</h2>
          <p>
            Norėdamas skelbti ar susirašinėti su kitais vartotojais, turi susikurti paskyrą, pateikdamas galiojantį
            el. paštą ir pasirinkdamas vartotojo vardą. Esi atsakingas už savo paskyros duomenų tikslumą ir
            slaptažodžio konfidencialumą. Registruodamasis patvirtini, kad esi ne jaunesnis nei 18 metų arba turi
            teisėto atstovo sutikimą.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">3. Skelbimų taisyklės</h2>
          <p className="mb-2">Keldamas skelbimą įsipareigoji, kad:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>skelbime pateikta informacija (aprašymas, kaina, būklė, nuotraukos) yra teisinga;</li>
            <li>prekė realiai egzistuoja ir priklauso tau arba turi teisę ją parduoti;</li>
            <li>skelbime naudojamos tik realios prekės nuotraukos, ne svetimos ar iš interneto paimtos;</li>
            <li>neskelbi vagystės, kontrabandos ar kitaip neteisėtai įgytų prekių;</li>
            <li>neskelbi tų pačių ar dubliuojančių skelbimų daug kartų.</li>
          </ul>
          <p className="mt-2">
            Kiekvienas naujas skelbimas prieš patenkant į viešą sąrašą peržiūrimas administracijos. Platforma
            pasilieka teisę atmesti arba pašalinti skelbimą be atskiro paaiškinimo, jei jis pažeidžia šias taisykles.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">4. Sandoriai tarp vartotojų</h2>
          <p>
            Visi susitarimai dėl kainos, atsiskaitymo būdo, siuntimo ar atsiėmimo vyksta tiesiogiai tarp pirkėjo ir
            pardavėjo, per Platformos žinučių sistemą arba kitais kanalais. Platforma nėra sandorio šalis, negarantuoja
            prekės kokybės, pristatymo ar atsiskaitymo saugumo ir neatsako už nuostolius, kilusius dėl vartotojų
            tarpusavio sandorių. Rekomenduojame elgtis atsargiai: tikrinti prekę prieš mokant, rinktis saugius
            atsiskaitymo būdus ir vengti persiųsti pinigus iš anksto nepažįstamiems asmenims.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">5. Draudžiamas elgesys</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>Apgaulingų, fiktyvių ar suklastotų skelbimų kėlimas.</li>
            <li>Kitų vartotojų priekabiavimas, grasinimai ar įžeidinėjimas žinutėse.</li>
            <li>Bandymas apeiti moderaciją, automatizuotas (bot) turinio kėlimas.</li>
            <li>Platformos naudojimas kitiems tikslams nei kompiuterio komponentų skelbimai.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">6. Paskyros pašalinimas</h2>
          <p>
            Administracija turi teisę laikinai arba visam laikui apriboti paskyros prieigą, jei vartotojas pažeidžia
            šias taisykles. Vartotojas gali bet kada susisiekti su administracija ir paprašyti ištrinti savo paskyrą
            bei su ja susijusius duomenis.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">7. Taisyklių keitimas</h2>
          <p>
            Platforma gali kartais atnaujinti šias taisykles. Reikšmingų pakeitimų atveju informuosime vartotojus
            platformoje. Tolimesnis naudojimasis Platforma po pakeitimų reiškia sutikimą su atnaujintomis taisyklėmis.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">8. Kontaktai</h2>
          <p>
            Klausimus ar skundus dėl šių taisyklių galite pateikti per Platformos susisiekimo formą arba el. paštu,
            nurodytu Platformos kontaktinėje informacijoje.
          </p>
        </section>
      </div>
    </div>
  );
}
