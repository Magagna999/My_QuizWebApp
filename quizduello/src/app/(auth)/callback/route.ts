import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * AUTH CALLBACK — /auth/callback
 *
 * Questa è una ROUTE HANDLER, non una pagina.
 * Il file si chiama route.ts (non page.tsx) → Next.js lo tratta
 * come un endpoint API, non come una pagina da renderizzare.
 *
 * QUANDO VIENE CHIAMATA:
 *
 * Quando l'utente clicca il link di conferma email che
 * Supabase gli ha inviato, il link punta a:
 *
 *   https://tuodominio.com/auth/callback?code=abc123
 *
 * Supabase include un `code` nei parametri URL.
 * Questo code è un "authorization code" monouso che deve
 * essere scambiato con una sessione vera.
 *
 * COSA FA QUESTA ROUTE:
 *
 * 1. Legge il `code` dall'URL
 * 2. Chiama supabase.auth.exchangeCodeForSession(code)
 * 3. Supabase verifica il code e crea la sessione (JWT nei cookies)
 * 4. Redirect dell'utente alla dashboard
 *
 * PERCHÉ NON FARLO NEL BROWSER?
 *
 * Lo scambio code → session deve avvenire lato server
 * per sicurezza. Se lo facessimo nel browser, il code
 * sarebbe visibile nel JS e potrebbe essere intercettato.
 *
 * NOTA: `GET` è il nome della funzione esportata.
 * Next.js la chiama quando la route riceve una richiesta GET.
 * Puoi anche esportare POST, PUT, DELETE, ecc.
 */

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Sessione creata con successo → vai alla dashboard
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Se qualcosa è andato storto, torna al login con un errore
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
