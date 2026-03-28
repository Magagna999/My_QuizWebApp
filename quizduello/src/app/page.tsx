import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import {
  Swords,
  Clock,
  Trophy,
  BookOpen,
  Users,
  Zap,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

/*
 * LANDING PAGE (app/page.tsx)
 *
 * Questa è la homepage, la prima cosa che un visitatore vede.
 * È un Server Component (nessun "use client") perché non ha
 * interattività propria — la Navbar gestisce il suo stato internamente.
 *
 * Struttura della pagina:
 * 1. Navbar (componente separato, client)
 * 2. Hero section (headline + CTA + mockup)
 * 3. Stats bar (numeri chiave)
 * 4. Come funziona (3 step)
 * 5. Feature grid (vantaggi)
 * 6. Categorie preview
 * 7. CTA finale
 * 8. Footer
 *
 * RESPONSIVE:
 * - Mobile: tutto stacked verticalmente, 1 colonna
 * - Tablet (md): 2 colonne dove serve
 * - Desktop (lg): layout completo con hero a 2 colonne
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ============================================
       *  SEZIONE 1: HERO
       *  La parte più importante — cattura l'attenzione
       *  Mobile: centrato, 1 colonna
       *  Desktop: 2 colonne (testo sx, visual dx)
       * ============================================ */}
      <section className="container-app pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="lg:flex lg:items-center lg:gap-16">

          {/* Colonna sinistra: testo */}
          <div className="lg:flex-1 text-center lg:text-left">

            {/* Badge — piccolo pill che comunica il target */}
            <span className="inline-block px-4 py-1.5 text-xs font-medium bg-brand-50 text-brand-800 rounded-pill mb-6 animate-fade-in-up opacity-0">
              Preparati ai concorsi
            </span>

            {/* Headline principale */}
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-gray-900 leading-[1.1] mb-6 animate-fade-in-up opacity-0 delay-100">
              Sfida i tuoi amici.{" "}
              <span className="text-brand-600">Impara giocando.</span>
            </h1>

            {/* Sottotitolo */}
            <p className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8 animate-fade-in-up opacity-0 delay-200">
              Duelli di conoscenza su materie universitarie e concorsi per la PA.
              Asincroni, veloci, coinvolgenti.
            </p>

            {/* Call to action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start animate-fade-in-up opacity-0 delay-300">
              <Link href="/register" className="btn-primary text-base px-8 py-3.5 inline-flex items-center justify-center gap-2">
                Registrati gratis
                <ArrowRight size={18} />
              </Link>
              <a href="#come-funziona" className="btn-secondary text-base px-8 py-3.5 inline-flex items-center justify-center">
                Scopri come funziona
              </a>
            </div>
          </div>

          {/* Colonna destra: mockup del quiz (solo desktop) */}
          <div className="hidden lg:block lg:flex-1 animate-fade-in-up opacity-0 delay-400">
            <div className="relative max-w-sm mx-auto">
              {/* Sfondo decorativo */}
              <div className="absolute -inset-4 bg-brand-50 rounded-3xl -rotate-3" />

              {/* Card mockup quiz */}
              <div className="relative bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                {/* Timer */}
                <div className="flex justify-center mb-5">
                  <div className="w-16 h-16 rounded-full border-[3px] border-brand-600 flex items-center justify-center">
                    <span className="font-display font-bold text-xl text-brand-600">15</span>
                  </div>
                </div>

                {/* Categoria + domanda */}
                <p className="text-xs font-medium text-brand-600 text-center mb-1">Diritto Civile</p>
                <p className="text-sm font-medium text-gray-900 text-center mb-5 leading-snug">
                  Quale articolo del Codice Civile disciplina la responsabilità extracontrattuale?
                </p>

                {/* Risposte */}
                <div className="space-y-2.5">
                  {[
                    { letter: "A", text: "Art. 1218", correct: false, selected: false },
                    { letter: "B", text: "Art. 2043", correct: true, selected: true },
                    { letter: "C", text: "Art. 1176", correct: false, selected: false },
                    { letter: "D", text: "Art. 2059", correct: false, selected: false },
                  ].map((ans) => (
                    <div
                      key={ans.letter}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm transition-all ${
                        ans.selected
                          ? "border-brand-600 bg-brand-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                          ans.selected
                            ? "bg-brand-600 text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {ans.letter}
                      </span>
                      <span className={ans.selected ? "text-brand-800 font-medium" : "text-gray-700"}>
                        {ans.text}
                      </span>
                      {ans.correct && ans.selected && (
                        <CheckCircle size={16} className="ml-auto text-teal-600" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Score strip */}
                <div className="flex justify-between mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>Tu: <strong className="text-gray-900">42</strong></span>
                  <span>Avversario: <strong className="text-gray-900">38</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
       *  SEZIONE 2: STATS BAR
       *  Numeri che danno credibilità (social proof)
       * ============================================ */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <div className="container-app py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "2.4k", label: "Giocatori attivi" },
              { number: "12k", label: "Duelli completati" },
              { number: "5", label: "Categorie" },
              { number: "542", label: "Domande" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display font-bold text-2xl md:text-3xl text-brand-600">
                  {stat.number}
                </p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
       *  SEZIONE 3: COME FUNZIONA
       *  3 step semplici che spiegano il flusso di gioco
       * ============================================ */}
      <section id="come-funziona" className="container-app py-20 lg:py-28">
        <div className="text-center mb-14">
          <h2 className="font-display font-bold text-3xl lg:text-4xl text-gray-900 mb-4">
            Come funziona
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Tre passi per iniziare a giocare. Nessuna attesa, nessuna complicazione.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {[
            {
              step: "01",
              icon: Swords,
              title: "Sfida un avversario",
              desc: "Cerca un amico per username o lancia una sfida casuale. Il sistema troverà un avversario del tuo livello.",
              color: "bg-brand-50 text-brand-600",
            },
            {
              step: "02",
              icon: BookOpen,
              title: "Scegli e rispondi",
              desc: "Scegli la categoria a turno. Rispondi a 3 domande per round, hai 20 secondi per ciascuna.",
              color: "bg-teal-50 text-teal-600",
            },
            {
              step: "03",
              icon: Trophy,
              title: "Scala la classifica",
              desc: "Vinci duelli per guadagnare punti ELO. Più vinci, più sali in classifica.",
              color: "bg-amber-50 text-amber-600",
            },
          ].map((item) => (
            <div key={item.step} className="relative text-center md:text-left">
              {/* Numero step */}
              <span className="font-display font-bold text-6xl text-gray-100 absolute -top-4 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0">
                {item.step}
              </span>

              {/* Icona */}
              <div className={`relative inline-flex items-center justify-center w-14 h-14 rounded-xl ${item.color} mb-5`}>
                <item.icon size={24} />
              </div>

              <h3 className="font-display font-semibold text-lg text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================
       *  SEZIONE 4: FEATURE GRID
       *  Vantaggi e caratteristiche dell'app
       * ============================================ */}
      <section className="bg-gray-50 py-20 lg:py-28">
        <div className="container-app">
          <div className="text-center mb-14">
            <h2 className="font-display font-bold text-3xl lg:text-4xl text-gray-900 mb-4">
              Perché QuizDuello
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Progettato per chi si prepara ai concorsi e vuole rendere lo studio più efficace.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: "Gioca quando vuoi",
                desc: "Turni asincroni. Rispondi con calma, l'avversario aspetta fino a 48 ore.",
              },
              {
                icon: Swords,
                title: "5 round, 3 domande",
                desc: "Partite brevi ma strategiche. Scegli la categoria a turno per mettere in difficoltà l'avversario.",
              },
              {
                icon: Trophy,
                title: "Classifica ELO",
                desc: "Rating dinamico come negli scacchi. Ogni duello conta per la tua posizione.",
              },
              {
                icon: Zap,
                title: "Bonus velocità",
                desc: "Più rispondi velocemente, più punti guadagni. La velocità premia.",
              },
              {
                icon: BookOpen,
                title: "Materie concorsi",
                desc: "Domande aggiornate su Diritto, Economia, Amministrativo e altre materie per la PA.",
              },
              {
                icon: Users,
                title: "Sfida chiunque",
                desc: "Cerca amici per username o lanciati in un matchmaking casuale basato sul tuo livello.",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-brand-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 mb-4">
                  <feat.icon size={20} />
                </div>
                <h3 className="font-display font-semibold text-base text-gray-900 mb-2">
                  {feat.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
       *  SEZIONE 5: CATEGORIE PREVIEW
       *  Mostra le materie disponibili
       * ============================================ */}
      <section id="categorie" className="container-app py-20 lg:py-28">
        <div className="text-center mb-14">
          <h2 className="font-display font-bold text-3xl lg:text-4xl text-gray-900 mb-4">
            Le categorie
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Domande curate per le materie più richieste nei concorsi pubblici.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: "Diritto Civile", count: 142, color: "bg-brand-50 text-brand-800 border-brand-200" },
            { name: "Economia", count: 98, color: "bg-teal-50 text-teal-800 border-teal-200" },
            { name: "Costituzionale", count: 115, color: "bg-amber-50 text-amber-800 border-amber-200" },
            { name: "Amministrativo", count: 87, color: "bg-coral-50 text-coral-800 border-coral-200" },
            { name: "Penale", count: 100, color: "bg-danger-50 text-danger-800 border-red-200" },
          ].map((cat) => (
            <div
              key={cat.name}
              className={`rounded-xl border p-5 text-center ${cat.color}`}
            >
              <p className="font-display font-semibold text-sm mb-1">{cat.name}</p>
              <p className="text-xs opacity-70">{cat.count} domande</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================
       *  SEZIONE 6: CTA FINALE
       *  Ultimo invito all'azione prima del footer
       * ============================================ */}
      <section className="bg-brand-600 py-20 lg:py-24">
        <div className="container-app text-center">
          <h2 className="font-display font-bold text-3xl lg:text-4xl text-white mb-4">
            Pronto a metterti alla prova?
          </h2>
          <p className="text-brand-200 text-lg max-w-xl mx-auto mb-8">
            Registrati in 30 secondi e lancia il tuo primo duello. È gratis.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-600 font-display font-semibold rounded-lg text-lg hover:bg-brand-50 transition-colors"
          >
            Inizia ora
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ============================================
       *  FOOTER
       *  Informazioni legali e link utili
       * ============================================ */}
      <footer className="border-t border-gray-100 py-12">
        <div className="container-app">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <p className="font-display font-bold text-lg text-gray-900">
                Quiz<span className="text-brand-600">Duello</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Impara giocando. Un duello alla volta.
              </p>
            </div>

            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Termini</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Contatti</a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              © 2026 QuizDuello. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
