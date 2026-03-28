import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/*
 * CLIENT SUPABASE (Server)
 *
 * Questo file crea il client Supabase per il SERVER.
 * Lo usi nei Server Components e nelle API Routes per:
 * - Leggere l'utente corrente (sessione)
 * - Fetch dati con le RLS policies applicate
 * - Operazioni protette lato server
 *
 * DIFFERENZA CON IL CLIENT BROWSER:
 *
 * | Browser client         | Server client              |
 * |------------------------|----------------------------|
 * | Gira nel browser       | Gira sul server Node.js    |
 * | Usa localStorage       | Usa i cookies HTTP         |
 * | Per "use client"       | Per Server Components/API  |
 * | Sessione automatica    | Sessione via cookies       |
 *
 * COME FUNZIONA LA SESSIONE:
 *
 * Quando un utente fa login, Supabase crea un JWT (token).
 * - Nel browser: il token va in localStorage
 * - Sul server: il token va nei cookies HTTP
 *
 * Il server client legge i cookies per sapere CHI è
 * l'utente che sta facendo la richiesta.
 *
 * PERCHÉ `cookies()` È ASYNC:
 *
 * In Next.js 14, `cookies()` è una funzione async perché
 * accede all'HTTP request headers. Questo significa che
 * anche `createClient()` deve essere async.
 */

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /*
         * getAll() → legge TUTTI i cookies dalla request.
         * Supabase li usa per ricostruire la sessione utente.
         */
        getAll() {
          return cookieStore.getAll();
        },
        /*
         * setAll() → scrive cookies nella response.
         * Supabase li usa per aggiornare il token JWT
         * (es. dopo un refresh del token scaduto).
         *
         * Il try/catch è necessario perché in alcuni contesti
         * (Server Components statici) i cookies sono read-only.
         * In quel caso, ignoriamo silenziosamente l'errore.
         */
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorato nei Server Components read-only
          }
        },
      },
    }
  );
}
