import Link from "next/link";

/*
 * AUTH LAYOUT — Layout condiviso per login e registrazione.
 *
 * In Next.js 14, una cartella tra parentesi come (auth)
 * è un "Route Group": raggruppa le pagine SENZA creare
 * un segmento nell'URL.
 *
 * Struttura:
 *   src/app/(auth)/layout.tsx    → questo file
 *   src/app/(auth)/login/page.tsx  → URL: /login (NON /auth/login)
 *   src/app/(auth)/register/page.tsx → URL: /register
 *
 * Le parentesi dicono a Next.js: "usa questo layout per
 * queste pagine, ma NON mettere (auth) nell'URL".
 *
 * PERCHÉ UN LAYOUT SEPARATO?
 *
 * Login e Register condividono la stessa struttura visiva:
 * - Logo centrato in alto
 * - Card con il form al centro
 * - Sfondo con blob decorativo
 *
 * Invece di ripetere questo HTML in entrambe le pagine,
 * lo mettiamo nel layout e le pagine contengono solo il form.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-primary relative overflow-hidden">
      {/*
       * BLOB DECORATIVO — stesso trucco della landing page.
       * Un cerchio viola sfocato che dà profondità allo sfondo.
       */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 w-[500px] h-[500px] bg-brand-200 rounded-full blur-3xl opacity-20" />

      {/* Logo in alto — cliccabile, riporta alla landing */}
      <div className="pt-8 pb-4 text-center">
        <Link
          href="/"
          className="text-2xl font-semibold text-text-primary tracking-tight inline-block"
        >
          Quiz<span className="text-brand-600">Duello</span>
        </Link>
      </div>

      {/*
       * AREA CENTRALE — Il form (children) viene renderizzato qui.
       *
       * flex-1 → occupa tutto lo spazio verticale disponibile
       * items-center justify-center → centra il form sia
       * orizzontalmente che verticalmente.
       *
       * NOTA: items-start + pt-8 su mobile perché su schermi
       * piccoli centrare verticalmente spinge il form troppo
       * in basso. Meglio allinearlo in alto con un po' di padding.
       * Su desktop (md:) lo centriamo verticalmente.
       */}
      <main className="flex-1 flex items-start md:items-center justify-center px-5 pt-8 md:pt-0 pb-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </div>
  );
}
