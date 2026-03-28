import { createBrowserClient } from "@supabase/ssr";

/*
 * CLIENT SUPABASE (Browser)
 *
 * Questo file crea il client Supabase per il BROWSER.
 * Lo usi nei Client Components ("use client") per:
 * - Login / Logout
 * - Fetch dati in tempo reale
 * - Sottoscrizioni Realtime
 *
 * PERCHÉ UN FILE SEPARATO?
 *
 * Supabase ha bisogno di 2 variabili per connettersi:
 * - URL del progetto (NEXT_PUBLIC_SUPABASE_URL)
 * - Chiave anonima (NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *
 * "NEXT_PUBLIC_" significa che queste variabili sono
 * accessibili nel browser. È sicuro perché la chiave
 * anonima ha poteri limitati (le RLS policies la controllano).
 *
 * Creiamo il client UNA VOLTA e lo esportiamo.
 * Così ogni componente che importa `supabase` usa
 * la stessa istanza → meno connessioni, più efficienza.
 *
 * NOTA: createBrowserClient viene da @supabase/ssr,
 * NON da @supabase/supabase-js. La versione SSR gestisce
 * automaticamente i cookie per mantenere la sessione
 * tra server e browser in Next.js.
 */

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
