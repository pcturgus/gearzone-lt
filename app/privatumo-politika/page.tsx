import Link from "next/link";

export default function PrivatumoPolitika() {
  return (
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-10 md:py-14">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#5B4FE5] transition-colors mb-6">
        ← Atgal į pagrindinį
      </Link>

      <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Privatumo politika</h1>
      <p className="text-sm text-[#6B7280] mb-8">Paskutinį kartą atnaujinta: 2026-08-25</p>

      <div className="flex flex-col gap-7 text-sm text-[#374151] leading-relaxed">
        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">1. Kokius duomenis renkame</h2>
          <p className="mb-2">Naudodamasis PCturgus.lt (toliau – Platforma), mums gali pateikti šiuos duomenis:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>registracijos metu: el. paštas, pasirinktas vartotojo vardas, slaptažodis (saugomas užšifruotas);</li>
            <li>keliant skelbimą: prekės pavadinimas, aprašymas, kaina, būklė, miestas, nuotraukos;</li>
            <li>susirašinėjant: žinučių turinys tarp vartotojų;</li>
            <li>naudojimosi metu: prisijungimo laikas, IP adresas, naršyklės informacija (techninio veikimo tikslais).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">2. Kam naudojame duomenis</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>paskyros sukūrimui ir prisijungimo autentifikavimui;</li>
            <li>skelbimų rodymui viešai Platformoje;</li>
            <li>ryšiui tarp pirkėjo ir pardavėjo per žinučių sistemą;</li>
            <li>pranešimams apie Platformos veiklą (pvz. naujos žinutės, mėgstamo skelbimo atnaujinimai);</li>
            <li>sukčiavimo ir netikrų skelbimų prevencijai (moderacija);</li>
            <li>Platformos veikimo saugumui ir techniniam palaikymui.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">3. Kam perduodame duomenis</h2>
          <p>
            Duomenų nepardavinėjame ir neperduodame trečiosioms šalims rinkodaros tikslais. Duomenys saugomi ir
            apdorojami per Supabase (duomenų bazės ir autentifikacijos paslaugų teikėjas) bei Vercel (svetainės
            talpinimo paslaugų teikėjas). Šie paslaugų teikėjai gali laikyti duomenis serveriuose už Lietuvos ribų
            pagal savo standartines sutartines sąlygas ir taikomus duomenų apsaugos reikalavimus.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">4. Kiek laiko saugome duomenis</h2>
          <p>
            Paskyros ir su ja susiję duomenys saugomi tol, kol paskyra aktyvi. Ištrynus paskyrą arba pateikus prašymą,
            asmens duomenys pašalinami per protingą laikotarpį, išskyrus atvejus, kai duomenis privalome saugoti
            ilgiau dėl teisinių įsipareigojimų.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">5. Tavo teisės</h2>
          <p className="mb-2">Pagal Bendrąjį duomenų apsaugos reglamentą (BDAR/GDPR) turi teisę:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>susipažinti su savo saugomais duomenimis;</li>
            <li>prašyti ištaisyti netikslius duomenis;</li>
            <li>prašyti ištrinti savo duomenis ("teisė būti pamirštam");</li>
            <li>apriboti arba nesutikti su tam tikru duomenų tvarkymu;</li>
            <li>gauti savo duomenis perkeliamu formatu;</li>
            <li>pateikti skundą priežiūros institucijai (Lietuvoje – Valstybinei duomenų apsaugos inspekcijai).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">6. Slapukai ir vietinis saugojimas</h2>
          <p>
            Platforma naudoja būtinuosius naršyklės saugojimo mechanizmus (pvz. prisijungimo sesijos duomenims
            laikyti), reikalingus, kad galėtum likti prisijungęs ir naudotis Platformos funkcijomis. Šie duomenys
            nenaudojami reklamos sekimui.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">7. Duomenų saugumas</h2>
          <p>
            Taikome protingas technines ir organizacines priemones duomenims apsaugoti (šifravimas, prieigos
            apribojimai), tačiau joks perdavimas internetu ar elektroninis saugojimas nėra 100% saugus, ir negalime
            garantuoti absoliutaus saugumo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#12172B] mb-2">8. Kontaktai</h2>
          <p>
            Dėl klausimų, susijusių su asmens duomenų tvarkymu, ar norėdamas pasinaudoti savo teisėmis, susisiek
            el. paštu{" "}
            <a href="mailto:pcturgus@outlook.com" className="text-[#5B4FE5] font-semibold hover:underline">pcturgus@outlook.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
