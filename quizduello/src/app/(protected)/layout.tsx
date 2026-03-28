import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/*
 * PROTECTED LAYOUT — Layout per tutte le pagine che richiedono login.
 *
 * Route Group (protected): come (auth), le parentesi NON creano
 * un segmento nell'URL. /dashboard è /dashboard, non /(protected)/dashboard.
 *
 * RESPONSABILITÀ:
 * 1. Verifica che l'utente sia loggato (redirect a /login se no)
 * 2. Carica il profilo utente dal database
 * 3. Mostra la sidebar su desktop e la bottom nav su mobile
 * 4. Passa il profilo ai children come context (in futuro)
 *
 * DIFFERENZA DA AUTH LAYOUT:
 * - Auth layout: centrato, nessuna navigazione, per login/register
 * - Protected layout: sidebar + bottom nav, per l'app vera e propria
 */

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: `<path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/>`,
  },
  {
    href: "/leaderboard",
    label: "Classifica",
    icon: `<path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z"/>`,
  },
  {
    href: "/profile",
    label: "Profilo",
    icon: `<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/>`,
  },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const typedProfile = profile as Profile;

  return (
    <div className="min-h-screen bg-surface-primary flex">
      {/* ===== SIDEBAR DESKTOP ===== */}
      <aside className="hidden md:flex w-56 border-r border-border flex-col bg-surface-secondary fixed inset-y-0 left-0 z-40">
        {/*
         * FIXED SIDEBAR
         *
         * fixed inset-y-0 left-0 → la sidebar occupa tutta
         * l'altezza dello schermo e resta fissa durante lo scroll.
         *
         * w-56 = 224px. È una larghezza standard per le sidebar:
         * abbastanza larga per il testo, abbastanza stretta
         * per lasciare spazio al contenuto principale.
         */}
        <div className="p-5 border-b border-border">
          <Link
            href="/"
            className="text-lg font-semibold text-text-primary tracking-tight"
          >
            Quiz<span className="text-brand-600">Duello</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: item.icon }}
              />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Profilo utente in basso */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-sm font-medium text-brand-800">
              {typedProfile.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {typedProfile.username}
              </p>
              <p className="text-xs text-text-muted">
                ELO {typedProfile.elo_rating}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== CONTENUTO PRINCIPALE ===== */}
      <main className="flex-1 md:ml-56 pb-20 md:pb-0">
        {/*
         * MD:ML-56 — Margine sinistro su desktop
         *
         * La sidebar è fixed (non occupa spazio nel flow).
         * Senza ml-56, il contenuto andrebbe SOTTO la sidebar.
         * ml-56 = margin-left di 224px = larghezza della sidebar.
         *
         * PB-20 — Padding bottom su mobile
         *
         * La bottom nav è alta circa 80px. Senza padding,
         * il contenuto in fondo alla pagina finirebbe nascosto
         * dietro la bottom nav. pb-20 = 80px di respiro.
         * md:pb-0 → su desktop non serve (niente bottom nav).
         */}
        {children}
      </main>

      {/* ===== BOTTOM NAV MOBILE ===== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface-primary border-t border-border z-40">
        {/*
         * BOTTOM NAV — Visibile solo su mobile (md:hidden).
         *
         * fixed bottom-0 inset-x-0 → incollata in basso,
         * larga quanto lo schermo.
         *
         * Tre tab: Home, Classifica, Profilo.
         * Ogni tab ha un'icona SVG + etichetta testuale.
         */}
        <div className="flex justify-around py-2 pb-[env(safe-area-inset-bottom)]">
          {/*
           * ENV(SAFE-AREA-INSET-BOTTOM)
           *
           * Sui telefoni con la barra home gesture (iPhone X+),
           * c'è un'area in basso che non è "toccabile".
           * env(safe-area-inset-bottom) aggiunge padding extra
           * per evitare che i tab finiscano sotto quella barra.
           *
           * Senza questo, su iPhone i tab sarebbero parzialmente
           * coperti dall'indicatore home.
           */}
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-4 py-1.5 text-text-secondary"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: item.icon }}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
