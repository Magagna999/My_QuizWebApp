import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadQuestionsForClient } from "@/lib/question-picker";

/*
 * API: /api/duels/[id]
 *
 * GET → Dettaglio completo di un duello.
 *
 * [id] È un DYNAMIC SEGMENT in Next.js.
 * La cartella si chiama [id], e il valore viene passato
 * come parametro alla funzione.
 *
 * URL: /api/duels/abc-123 → params.id = "abc-123"
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Carica il duello con tutte le relazioni
  const { data: duel, error } = await supabase
    .from("duels")
    .select(
      `
      *,
      challenger:profiles!challenger_id(*),
      opponent:profiles!opponent_id(*),
      rounds(
        *,
        category:categories(name, icon, slug),
        answers:round_answers(*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !duel) {
    return NextResponse.json({ error: "Duello non trovato" }, { status: 404 });
  }

  // Verifica che l'utente sia uno dei due giocatori
  if (duel.challenger_id !== user.id && duel.opponent_id !== user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  /*
   * CARICA LE DOMANDE DEL ROUND CORRENTE
   *
   * Se è il turno dell'utente e c'è un round in progress,
   * carichiamo le domande (SENZA is_correct) per il gameplay.
   */
  let currentQuestions = null;

  if (duel.current_turn === user.id) {
    const currentRound = (duel.rounds as Array<{ round_number: number; status: string; id: string; category_id: string | null }>)
      ?.find((r) => r.round_number === duel.current_round);

    if (currentRound && currentRound.status === "in_progress" && currentRound.category_id) {
      // Trova le domande da round_answers del primo giocatore
      const { data: roundAnswers } = await supabase
        .from("round_answers")
        .select("question_id")
        .eq("round_id", currentRound.id);

      if (roundAnswers && roundAnswers.length > 0) {
        const questionIds = [...new Set(roundAnswers.map((a) => a.question_id))];
        currentQuestions = await loadQuestionsForClient(supabase, questionIds);
      }
    }
  }

  return NextResponse.json({
    duel,
    currentQuestions,
    isMyTurn: duel.current_turn === user.id,
    myRole: duel.challenger_id === user.id ? "challenger" : "opponent",
  });
}
