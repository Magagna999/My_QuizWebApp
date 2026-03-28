import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * API: /api/leaderboard
 *
 * GET → Classifica globale con paginazione.
 *
 * Query params opzionali:
 * - limit: quanti risultati (default 20, max 50)
 * - offset: da quale posizione partire (per paginazione)
 *
 * La classifica ordina per ELO decrescente.
 * Include anche la posizione dell'utente loggato.
 */

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  /*
   * URL SEARCH PARAMS
   *
   * request.nextUrl.searchParams legge i parametri dall'URL:
   * /api/leaderboard?limit=10&offset=0
   *
   * parseInt(...) || default → se il parsing fallisce (NaN),
   * usa il valore di default. || funziona perché NaN è falsy.
   *
   * Math.min/max limita i valori per prevenire abusi
   * (es. limit=10000 scaricherebbe tutto il database).
   */
  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20") || 20, 50);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0") || 0, 0);

  // Query classifica
  const { data: leaderboard, count, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, elo_rating, wins, losses, draws", {
      count: "exact",
    })
    .order("elo_rating", { ascending: false })
    .range(offset, offset + limit - 1);

  /*
   * .range(offset, offset + limit - 1)
   *
   * Supabase usa range INCLUSIVO su entrambi gli estremi.
   * Per ottenere 20 risultati partendo da 0:
   *   .range(0, 19) → righe 0, 1, 2, ..., 19 (20 righe)
   *
   * Quindi: .range(offset, offset + limit - 1)
   */

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /*
   * POSIZIONE DELL'UTENTE
   *
   * Per mostrare "Tu sei alla posizione #12", contiamo quanti
   * giocatori hanno un ELO superiore al nostro.
   * La nostra posizione = quel conteggio + 1.
   *
   * Questo è più efficiente che scorrere tutta la classifica.
   */
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("elo_rating")
    .eq("id", user.id)
    .single();

  let userRank = null;
  if (userProfile) {
    const { count: aboveCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gt("elo_rating", userProfile.elo_rating);

    userRank = (aboveCount ?? 0) + 1;
  }

  return NextResponse.json({
    leaderboard: leaderboard ?? [],
    total: count ?? 0,
    offset,
    limit,
    user_rank: userRank,
  });
}
