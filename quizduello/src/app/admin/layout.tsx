import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/*
 * ADMIN LAYOUT — Layout protetto per il pannello admin.
 *
 * Questo è un SERVER COMPONENT che:
 * 1. Verifica che l'utente sia loggato
 * 2. Verifica che l'utente abbia role = 'admin'
 * 3. Se non è admin, fa redirect alla dashboard
 * 4. Se è admin, mostra la sidebar + il contenuto
 *
 * PERCHÉ LA VERIFICA È NEL LAYOUT?
 *
 * Perché il layout wrappa TUTTE le pagine admin.
 * Così non dobbiamo ripetere il controllo in ogni page.tsx.
 * Se qualcuno prova ad accedere a /admin/questions senza
 * essere admin, viene bloccato QUI, prima ancora che la
 * pagina venga renderizzata.
 *
 * NOTA SULLA SICUREZZA:
 *
 * Questo è un controllo "client-side" (lato rendering).
 * La vera sicurezza è nelle RLS policies del database:
 * anche se qualcuno bypassasse questo layout, le RLS
 * impedirebbero qualsiasi operazione non autorizzata.
 * Difesa in profondità: UI + database, non solo uno dei due.
 */

/*
 * LINK DELLA SIDEBAR
 *
 * Ogni link ha un `href` e un `label`.
 * Li mappiamo nel JSX per evitare ripetizione.
 */
const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/categories", label: "Categorie" },
  { href: "/admin/questions", label: "Domande" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * VERIFICA AUTH + RUOLO
   *
   * Questa è una funzione ASYNC perché:
   * - createClient() è async (legge i cookies)
   * - getUser() fa una chiamata al server Supabase
   *
   * I Server Components possono essere async in Next.js 14.
   * È uno dei vantaggi rispetto ai Client Components.
   */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Non loggato → redirect al login
  if (!user) {
    redirect("/login");
  }

  // Controlla il ruolo nella tabella profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Non admin → redirect alla dashboard
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex bg-surface-primary">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex flex-col bg-surface-secondary">
        <div className="p-5 border-b border-border">
          <Link href="/" className="text-lg font-semibold text-text-primary tracking-tight">
            Quiz<span className="text-brand-600">Duello</span>
          </Link>
          <p className="text-xs text-text-muted mt-1">Pannello admin</p>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2.5 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <Link
            href="/dashboard"
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            ← Torna all&apos;app
          </Link>
        </div>
      </aside>

      {/* Contenuto principale */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
