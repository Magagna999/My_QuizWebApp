import { SupabaseClient } from "@supabase/supabase-js";
import { QUESTIONS_PER_ROUND } from "./scoring";

/*
 * QUESTION PICKER — Seleziona domande casuali per un round.
 *
 * REQUISITI:
 * 1. Le domande devono appartenere alla categoria scelta
 * 2. Le domande devono essere attive (active = true)
 * 3. Non devono ripetersi all'interno dello stesso duello
 * 4. Idealmente, bilanciare la difficoltà
 *
 * STRATEGIA DI SELEZIONE:
 *
 * Usiamo una query SQL che:
 * 1. Filtra per categoria e stato attivo
 * 2. Esclude le domande già usate nel duello (subquery)
 * 3. Ordina in modo casuale (ORDER BY random())
 * 4. Prende le prime 3 (LIMIT 3)
 *
 * ORDER BY random() è la soluzione più semplice per selezione
 * casuale in PostgreSQL. Per database con milioni di righe
 * sarebbe lento, ma per le nostre centinaia di domande è perfetto.
 *
 * NOTA: In un sistema più avanzato, potremmo pesare la selezione
 * in base alla difficoltà (es. 1 facile + 1 media + 1 difficile)
 * o in base alle statistiche del giocatore (domande su cui sbaglia).
 * Per l'MVP, casuale è sufficiente.
 */

/**
 * Seleziona domande casuali per un round.
 *
 * @param supabase - Client Supabase autenticato
 * @param categoryId - ID della categoria scelta
 * @param duelId - ID del duello (per escludere domande già usate)
 * @returns Array di question IDs
 */
export async function pickQuestionsForRound(
  supabase: SupabaseClient,
  categoryId: string,
  duelId: string
): Promise<string[]> {
  /*
   * STEP 1: Trova le domande già usate in questo duello.
   *
   * Facciamo una query sulle round_answers del duello per
   * raccogliere tutti i question_id già utilizzati.
   *
   * La query passa attraverso le tabelle:
   *   round_answers → rounds → duels
   *
   * In Supabase, le JOIN implicite seguono le FOREIGN KEY.
   * "round:rounds!inner(duel_id)" significa:
   * "fai una JOIN con rounds e FILTRA per duel_id"
   *
   * !inner → INNER JOIN (esclude righe senza match)
   * Senza !inner → LEFT JOIN (include righe senza match)
   */
  const { data: usedAnswers } = await supabase
    .from("round_answers")
    .select("question_id, round:rounds!inner(duel_id)")
    .eq("round.duel_id", duelId);

  /*
   * Set() rimuove i duplicati automaticamente.
   * Se la stessa domanda è stata risposta da entrambi i giocatori,
   * appare due volte in usedAnswers ma una sola volta nel Set.
   *
   * new Set([1, 2, 2, 3]) → Set {1, 2, 3}
   */
  const usedQuestionIds = new Set(
    (usedAnswers ?? []).map((a) => a.question_id)
  );

  /*
   * STEP 2: Seleziona domande casuali dalla categoria,
   * escludendo quelle già usate.
   *
   * Il filtro .not("id", "in", ...) è il WHERE NOT IN.
   * Equivalente SQL:
   *   WHERE category_id = 'xxx'
   *     AND active = true
   *     AND id NOT IN ('q1', 'q2', 'q3')
   *   ORDER BY random()
   *   LIMIT 3
   *
   * NOTA: Se non ci sono abbastanza domande non usate,
   * il risultato sarà un array più corto di 3.
   * In quel caso, si potrebbe riutilizzare domande già
   * viste, ma per l'MVP restituiamo quello che c'è.
   */
  const excludeIds = Array.from(usedQuestionIds);

  let query = supabase
    .from("questions")
    .select("id")
    .eq("category_id", categoryId)
    .eq("active", true);

  // Aggiungi il filtro NOT IN solo se ci sono domande da escludere
  if (excludeIds.length > 0) {
    /*
     * Il formato per il filtro "in" di Supabase è una stringa
     * con parentesi: "(id1,id2,id3)"
     * Per il "not in" usiamo .not()
     */
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data: questions, error } = await query.limit(QUESTIONS_PER_ROUND);

  if (error) {
    throw new Error(`Errore nel selezionare le domande: ${error.message}`);
  }

  if (!questions || questions.length === 0) {
    throw new Error(
      "Non ci sono abbastanza domande in questa categoria. Chiedi all'admin di aggiungerne."
    );
  }

  return questions.map((q) => q.id);
}

/**
 * Carica i dettagli completi delle domande con le risposte.
 *
 * IMPORTANTE: NON include il campo is_correct nelle risposte!
 * Questo è fondamentale per l'anti-cheat: il client non deve
 * sapere qual è la risposta corretta prima che l'utente risponda.
 *
 * Il campo is_correct viene verificato SOLO lato server
 * quando il giocatore invia la sua risposta.
 *
 * @param supabase - Client Supabase
 * @param questionIds - Array di ID domande
 * @returns Domande con risposte (senza is_correct)
 */
export async function loadQuestionsForClient(
  supabase: SupabaseClient,
  questionIds: string[]
) {
  const { data, error } = await supabase
    .from("questions")
    .select(
      `
      id,
      question_text,
      difficulty,
      category:categories(name, icon),
      answers(id, answer_text, position)
    `
    )
    /*
     * NOTA: nella select delle answers, NON includiamo is_correct.
     * Il client riceve solo: id, answer_text, position.
     * Senza is_correct, non può barare leggendo la risposta dal network tab.
     */
    .in("id", questionIds);

  if (error) throw error;

  /*
   * Ordina le risposte per position (1, 2, 3, 4).
   * L'ordine potrebbe non essere garantito dalla query.
   */
  return (data ?? []).map((q) => ({
    ...q,
    answers: (q.answers as { id: string; answer_text: string; position: number }[])
      .sort((a, b) => a.position - b.position),
  }));
}
