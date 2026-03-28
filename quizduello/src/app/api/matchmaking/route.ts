import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDuel } from "@/lib/duel-engine";

/*
 * API: /api/matchmaking
 *
 * POST → Trova un avversario casuale e crea un duello.
 *
 * STRATEGIA DI MATCHMAKING:
 *
 * 1. Cerca giocatori con ELO simile (±200 punti)
 * 2. Escludi l'utente stesso
 * 3. Escludi giocatori con cui hai già duelli attivi
 * 4. Se non trova nessuno nel range, allarga a ±400
 * 5. Se ancora nessuno, prendi un avversario qualsiasi
 *
 * Il matchmaking per ELO rende le partite più bilanciate.
 * Un giocatore da 1500 ELO non dovrebbe affrontare
 * regolarmente uno da 800 — sarebbe noioso per entrambi.
 *
 * NOTA: Questo è un matchmaking SEMPLICE (sincrono).
 * Un sistema più avanzato userebbe una coda asincrona
 * con un worker che matcha i giocatori in background.
 * Per l'MVP, questo approccio è sufficiente.
 */

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Carica il profilo dell'utente
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id, elo_rating")
    .eq("id", user.id)
    .single();

  if (!myProfile) {
    return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
  }

  // Trova i duelli attivi dell'utente (per escludere quegli avversari)
  const { data: activeDuels } = await supabase
    .from("duels")
    .select("challenger_id, opponent_id")
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .in("status", ["pending", "active"]);

  /*
   * Raccoglie gli ID degli avversari con cui hai già un duello attivo.
   * Se sei il challenger, l'avversario è l'opponent (e viceversa).
   *
   * flatMap() è come map() ma "appiattisce" gli array annidati:
   * [[1,2], [3,4]].flatMap(x => x) → [1, 2, 3, 4]
   *
   * Qui restituiamo un array per ogni duello con gli ID dei giocatori
   * diversi dall'utente corrente.
   */
  const activeOpponentIds = new Set(
    (activeDuels ?? []).flatMap((d) =>
      [d.challenger_id, d.opponent_id].filter((id) => id !== user.id)
    )
  );

  /*
   * RICERCA AVVERSARIO
   *
   * Proviamo range crescenti di ELO finché non troviamo qualcuno.
   * I range sono: ±200, ±400, ±Infinity (chiunque).
   */
  const eloRanges = [200, 400, Infinity];
  let opponent = null;

  for (const range of eloRanges) {
    let query = supabase
      .from("profiles")
      .select("id, username, elo_rating")
      .neq("id", user.id); // Escludi te stesso

    // Filtra per range ELO (solo se non è Infinity)
    if (range !== Infinity) {
      query = query
        .gte("elo_rating", myProfile.elo_rating - range)
        .lte("elo_rating", myProfile.elo_rating + range);
    }

    const { data: candidates } = await query.limit(20);

    if (candidates && candidates.length > 0) {
      /*
       * Filtra candidati che NON hanno duelli attivi con noi.
       * Poi ne sceglie uno a caso.
       *
       * Math.random() restituisce un numero tra 0 e 1.
       * Math.floor(Math.random() * array.length) dà un
       * indice casuale nell'array.
       */
      const available = candidates.filter(
        (c) => !activeOpponentIds.has(c.id)
      );

      if (available.length > 0) {
        opponent = available[Math.floor(Math.random() * available.length)];
        break; // Trovato! Esci dal loop
      }
    }
  }

  if (!opponent) {
    return NextResponse.json(
      { error: "Nessun avversario disponibile. Riprova più tardi o sfida un amico per username." },
      { status: 404 }
    );
  }

  try {
    const duel = await createDuel(supabase, user.id, opponent.id);
    return NextResponse.json({
      duel,
      opponent: {
        username: opponent.username,
        elo_rating: opponent.elo_rating,
      },
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
