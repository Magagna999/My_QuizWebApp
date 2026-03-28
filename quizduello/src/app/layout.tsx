import type { Metadata } from "next";
import "./globals.css";

/*
 * METADATA
 * Queste informazioni appaiono nel tab del browser e quando
 * qualcuno condivide il link su social media (Open Graph)
 */
export const metadata: Metadata = {
  title: "QuizDuello — Sfida i tuoi amici. Impara giocando.",
  description:
    "Duelli di conoscenza su materie universitarie e concorsi per la PA. Asincroni, veloci, coinvolgenti.",
  openGraph: {
    title: "QuizDuello",
    description: "Sfida i tuoi amici in duelli di conoscenza",
    type: "website",
  },
};

/*
 * ROOT LAYOUT
 *
 * Questo è il componente che wrappa TUTTE le pagine dell'app.
 * In Next.js 14 (App Router), ogni cartella in /app può avere
 * un layout.tsx che avvolge le pagine al suo interno.
 *
 * Questo layout root fa 3 cose:
 * 1. Imposta la lingua del documento HTML (italiano)
 * 2. Applica il font body a tutto il <body>
 * 3. Renderizza {children} = la pagina corrente
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="font-body">
        {children}
      </body>
    </html>
  );
}
