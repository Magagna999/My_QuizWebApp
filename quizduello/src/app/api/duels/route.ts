import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDuel } from "@/lib/duel-engine";

/*
 * API: /api/duels
 *
 * GET  → Lista duelli dell'utente loggato
 * POST → Crea un nuovo duello
 *
 * PATTERN API ROUTE IN NEXT.JS 14:
 *
 * Il file route.ts esporta funzioni con il nome del metodo HTTP:
 * - export async function GET(req) { ... }  → gestisce GET
 * - export async function POST(req) { ... } → gestisce POST
 *
 * Next.js chiama automaticamente la funzione giusta
 * in base al metodo della richiesta HTTP.
 *
 * AUTENTICAZIONE:
 *
 * Ogni API route verifica che l'utente sia loggato
 * leggendo la sessione dai cookies (tramite il server client).
 * Se non è loggato, restituisce 401 Unauthorized.
 */

/**
 * GET /api/duels — Lista duelli dell'utente.
 *
 * Restituisce i duelli raggruppati per stato:
 * - your_turn: duelli dove è il turno dell'utente
 * - waiting: duelli dove è il turno dell'avversario
 * - completed: ultimi duelli completati
 */
export async function GET() {
  const supabase = await createClient();

  // Verifica autenticazione
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  /*
   * QUERY CON JOIN
   *
   * Carichiamo i duelli con i profili dei giocatori in una singola query.
   *
   * "challenger:profiles!challenger_id(id, username, avatar_url, elo_rating)"
   *
   * Significa: "fai una JOIN con profiles usando challenger_id come FK,
   * e chiama il risultato 'challenger'"
   *
   * Il "!" specifica QUALE foreign key usare (duels ha 2 FK verso profiles:
   * challenger_id e opponent_id). Senza "!", Supabase non saprebbe quale
   * usare e darebbe errore.
   */
  const { data: duels, error } = await supabase
    .from("duels")
    .select(
      `
      *,
      challenger:profiles!challenger_id(id, username, avatar_url, elo_rating),
      opponent:profiles!opponent_id(id, username, avatar_url, elo_rating)
    `
    )
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /*
   * RAGGRUPPA I DUELLI PER STATO
   *
   * Il frontend ha bisogno dei duelli separati in sezioni:
   * "Tocca a te" / "In attesa" / "Completati"
   *
   * Facciamo il raggruppamento server-side per ridurre
   * il lavoro del client e la quantità di dati trasferiti.
   *
   * .filter() crea un NUOVO array con solo gli elementi
   * che soddisfano la condizione.
   */
  const yourTurn = (duels ?? []).filter(
    (d) => d.current_turn === user.id && d.status !== "completed"
  );
  const waiting = (duels ?? []).filter(
    (d) => d.current_turn !== user.id && d.status !== "completed" && d.status !== "expired"
  );
  const completed = (duels ?? []).filter(
    (d) => d.status === "completed" || d.status === "expired"
  );

  return NextResponse.json({ your_turn: yourTurn, waiting, completed });
}

/**
 * POST /api/duels — Crea un nuovo duello.
 *
 * Body atteso: { opponent_id: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  /*
   * PARSING DEL BODY
   *
   * request.json() parsa il body della richiesta come JSON.
   * È async perché il body potrebbe essere uno stream.
   *
   * Validiamo che opponent_id sia presente e sia una stringa.
   * In un'app di produzione useresti una libreria come Zod per
   * validazione più robusta dei tipi.
   */
  const body = await request.json();
  const { opponent_id } = body;

  if (!opponent_id || typeof opponent_id !== "string") {
    return NextResponse.json(
      { error: "opponent_id è obbligatorio" },
      { status: 400 }
    );
  }

  if (opponent_id === user.id) {
    return NextResponse.json(
      { error: "Non puoi sfidare te stesso" },
      { status: 400 }
    );
  }

  try {
    const duel = await createDuel(supabase, user.id, opponent_id);
    return NextResponse.json(duel, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
