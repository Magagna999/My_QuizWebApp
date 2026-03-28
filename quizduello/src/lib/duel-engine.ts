import { SupabaseClient } from "@supabase/supabase-js";
import { calculatePoints, QUESTIONS_PER_ROUND, ROUNDS_PER_DUEL } from "./scoring";
import { calculateDuelElo } from "./elo";
import { pickQuestionsForRound } from "./question-picker";

/*
 * DUEL ENGINE — Logica core per la gestione dei duelli.
 *
 * Questo file è il "cervello" del gioco. Contiene le funzioni
 * che orchestrano le operazioni sul database per:
 *
 * 1. Creare un nuovo duello
 * 2. Giocare un round (inviare risposte + scegliere prossima categoria)
 * 3. Completare un duello (calcolo vincitore + aggiornamento ELO)
 *
 * PRINCIPIO: Tutta la logica di gioco è QUI, non nelle API routes.
 * Le API routes si occupano solo di autenticazione e validazione input.
 * Questo rende il codice più testabile e riutilizzabile.
 *
 * ANTI-CHEAT:
 * - Le risposte corrette non vengono mai inviate al client
 * - Il calcolo dei punti avviene server-side
 * - Il time_ms viene accettato dal client ma potrebbe essere
 *   validato contro un timestamp server (miglioramento futuro)
 */

/*
 * INTERFACCIA — Dati per una singola risposta del giocatore.
 *
 * Il client invia: quale domanda, quale risposta ha scelto,
 * e quanto tempo ha impiegato. Il server verifica tutto il resto.
 */
export interface PlayerAnswer {
  question_id: string;
  answer_id: string | null; // null = tempo scaduto
  time_ms: number;
}

/**
 * Crea un nuovo duello tra due giocatori.
 *
 * FLUSSO:
 * 1. Crea il record del duello (status: 'pending')
 * 2. Crea il round 1 (status: 'waiting_choice')
 * 3. Imposta current_turn al challenger (deve scegliere la categoria)
 *
 * @param supabase - Client Supabase autenticato
 * @param challengerId - ID di chi lancia la sfida
 * @param opponentId - ID di chi viene sfidato
 * @returns Il duello creato
 */
export async function createDuel(
  supabase: SupabaseClient,
  challengerId: string,
  opponentId: string
) {
  // Verifica che l'avversario esista
  const { data: opponent } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", opponentId)
    .single();

  if (!opponent) {
    throw new Error("Avversario non trovato.");
  }

  // Crea il duello
  const { data: duel, error: duelError } = await supabase
    .from("duels")
    .insert({
      challenger_id: challengerId,
      opponent_id: opponentId,
      status: "pending",
      current_turn: challengerId,
      current_round: 1,
    })
    .select("*")
    .single();

  if (duelError) throw duelError;

  // Crea il round 1 (in attesa della scelta categoria)
  const { error: roundError } = await supabase.from("rounds").insert({
    duel_id: duel.id,
    round_number: 1,
    chosen_by: challengerId, // Round 1: il challenger sceglie
    status: "waiting_choice",
  });

  if (roundError) throw roundError;

  return duel;
}

/**
 * Gioca un round: invia le risposte e scegli la prossima categoria.
 *
 * Questa è la funzione PIÙ complessa del gioco. Ecco cosa fa:
 *
 * 1. VALIDAZIONE: Verifica che sia il turno del giocatore
 * 2. CATEGORIA: Se il round è in 'waiting_choice', imposta la categoria
 *    e seleziona le domande
 * 3. RISPOSTE: Verifica ogni risposta e calcola i punti
 * 4. TURNO: Passa il turno all'avversario o al prossimo round
 * 5. COMPLETAMENTO: Se era l'ultimo round, chiude il duello
 *
 * @param supabase - Client Supabase autenticato
 * @param duelId - ID del duello
 * @param userId - ID del giocatore che sta giocando
 * @param categoryId - ID della categoria scelta (se è il turno di scegliere)
 * @param answers - Array di risposte del giocatore
 */
export async function playRound(
  supabase: SupabaseClient,
  duelId: string,
  userId: string,
  categoryId: string | null,
  answers: PlayerAnswer[]
) {
  // ===== STEP 1: Carica il duello e verifica il turno =====

  const { data: duel } = await supabase
    .from("duels")
    .select("*")
    .eq("id", duelId)
    .single();

  if (!duel) throw new Error("Duello non trovato.");
  if (duel.status === "completed") throw new Error("Duello già completato.");
  if (duel.status === "expired") throw new Error("Duello scaduto.");
  if (duel.current_turn !== userId) throw new Error("Non è il tuo turno.");

  /*
   * Determina il RUOLO del giocatore nel duello.
   * Serve per sapere quale campo del punteggio aggiornare
   * (challenger_score o opponent_score).
   */
  const isChallenger = duel.challenger_id === userId;
  const opponentId = isChallenger ? duel.opponent_id : duel.challenger_id;

  // ===== STEP 2: Carica il round corrente =====

  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("duel_id", duelId)
    .eq("round_number", duel.current_round)
    .single();

  if (!round) throw new Error("Round non trovato.");

  // ===== STEP 3: Se il round è in attesa della categoria, impostala =====

  let questionIds: string[] = [];

  if (round.status === "waiting_choice") {
    if (!categoryId) throw new Error("Devi scegliere una categoria.");

    // Seleziona le domande per il round
    questionIds = await pickQuestionsForRound(supabase, categoryId, duelId);

    // Aggiorna il round con la categoria e cambia stato
    await supabase
      .from("rounds")
      .update({
        category_id: categoryId,
        status: "in_progress",
      })
      .eq("id", round.id);
  } else {
    /*
     * Se il round è già 'in_progress', il primo giocatore ha
     * già scelto la categoria e le domande sono già state create.
     * Le recuperiamo dalle round_answers esistenti.
     */
    const { data: existingAnswers } = await supabase
      .from("round_answers")
      .select("question_id")
      .eq("round_id", round.id)
      .limit(QUESTIONS_PER_ROUND);

    /*
     * Se non ci sono risposte precedenti (primo giocatore),
     * selezioniamo le domande dalla categoria del round.
     */
    if (existingAnswers && existingAnswers.length > 0) {
      questionIds = [...new Set(existingAnswers.map((a) => a.question_id))];
    } else {
      questionIds = await pickQuestionsForRound(
        supabase,
        round.category_id!,
        duelId
      );
    }
  }

  // ===== STEP 4: Verifica e registra le risposte =====

  if (answers.length !== QUESTIONS_PER_ROUND) {
    throw new Error(`Devi rispondere a ${QUESTIONS_PER_ROUND} domande.`);
  }

  let roundScore = 0;

  /*
   * Per ogni risposta, verifichiamo lato server se è corretta.
   *
   * for...of è preferito a .forEach() quando la callback è async,
   * perché .forEach() non attende le Promise (le lancia tutte
   * in parallelo senza ordine garantito).
   */
  for (const answer of answers) {
    let isCorrect = false;

    if (answer.answer_id) {
      /*
       * VERIFICA SERVER-SIDE
       *
       * Carichiamo la risposta dal database e controlliamo
       * se is_correct è true. Il client non ha mai visto
       * questo campo — è il momento della verità.
       */
      const { data: dbAnswer } = await supabase
        .from("answers")
        .select("is_correct")
        .eq("id", answer.answer_id)
        .eq("question_id", answer.question_id)
        .single();

      isCorrect = dbAnswer?.is_correct ?? false;
    }

    const points = calculatePoints({
      is_correct: isCorrect,
      time_ms: answer.time_ms,
    });

    roundScore += points;

    // Registra la risposta nel database
    await supabase.from("round_answers").insert({
      round_id: round.id,
      user_id: userId,
      question_id: answer.question_id,
      answer_id: answer.answer_id,
      is_correct: isCorrect,
      time_ms: answer.time_ms,
      points,
    });

    // Aggiorna le statistiche della domanda
    await supabase.rpc("increment_question_stats", {
      q_id: answer.question_id,
      was_correct: isCorrect,
    });
  }

  // ===== STEP 5: Aggiorna punteggio e gestisci turno =====

  /*
   * Aggiorna il punteggio totale del giocatore nel duello.
   * Usiamo un campo diverso in base al ruolo (challenger o opponent).
   */
  const scoreField = isChallenger ? "challenger_score" : "opponent_score";
  const newTotalScore = (isChallenger ? duel.challenger_score : duel.opponent_score) + roundScore;

  /*
   * LOGICA DEI TURNI
   *
   * Ci sono due casi dopo che un giocatore gioca un round:
   *
   * A) L'avversario non ha ancora giocato QUESTO round
   *    → Il turno passa all'avversario per lo STESSO round
   *    → Lo stato del round resta 'in_progress'
   *
   * B) L'avversario ha GIÀ giocato questo round (siamo il secondo)
   *    → Il round è completato
   *    → Se non è l'ultimo round, creiamo il round successivo
   *    → Se è l'ultimo round, chiudiamo il duello
   */

  // Controlla se l'avversario ha già giocato questo round
  const { count: opponentAnswerCount } = await supabase
    .from("round_answers")
    .select("*", { count: "exact", head: true })
    .eq("round_id", round.id)
    .eq("user_id", opponentId);

  const opponentAlreadyPlayed = (opponentAnswerCount ?? 0) >= QUESTIONS_PER_ROUND;

  if (!opponentAlreadyPlayed) {
    // CASO A: l'avversario deve ancora giocare questo round
    await supabase
      .from("duels")
      .update({
        [scoreField]: newTotalScore,
        current_turn: opponentId,
        status: "active",
      })
      .eq("id", duelId);
  } else {
    // CASO B: il round è completato
    await supabase
      .from("rounds")
      .update({ status: "completed" })
      .eq("id", round.id);

    if (duel.current_round < ROUNDS_PER_DUEL) {
      // Non è l'ultimo round → crea il prossimo
      const nextRound = duel.current_round + 1;

      /*
       * CHI SCEGLIE LA CATEGORIA?
       * Round dispari: challenger sceglie
       * Round pari: opponent sceglie
       */
      const nextChooser = nextRound % 2 === 1
        ? duel.challenger_id
        : duel.opponent_id;

      await supabase.from("rounds").insert({
        duel_id: duelId,
        round_number: nextRound,
        chosen_by: nextChooser,
        status: "waiting_choice",
      });

      await supabase
        .from("duels")
        .update({
          [scoreField]: newTotalScore,
          current_round: nextRound,
          current_turn: nextChooser,
        })
        .eq("id", duelId);
    } else {
      // Ultimo round → chiudi il duello
      await completeDuel(supabase, duelId, {
        ...duel,
        [scoreField]: newTotalScore,
      });
    }
  }

  return { roundScore, totalScore: newTotalScore };
}

/**
 * Completa un duello: determina il vincitore e aggiorna l'ELO.
 */
async function completeDuel(
  supabase: SupabaseClient,
  duelId: string,
  duelData: {
    challenger_id: string;
    opponent_id: string;
    challenger_score: number;
    opponent_score: number;
  }
) {
  // Determina il vincitore
  let winnerId: string | null = null;
  let challengerWon: boolean | null = null;

  if (duelData.challenger_score > duelData.opponent_score) {
    winnerId = duelData.challenger_id;
    challengerWon = true;
  } else if (duelData.opponent_score > duelData.challenger_score) {
    winnerId = duelData.opponent_id;
    challengerWon = false;
  }
  // Se i punteggi sono uguali → pareggio (winnerId = null, challengerWon = null)

  // Carica i rating attuali
  const { data: players } = await supabase
    .from("profiles")
    .select("id, elo_rating, wins, losses, draws")
    .in("id", [duelData.challenger_id, duelData.opponent_id]);

  if (!players || players.length !== 2) {
    throw new Error("Impossibile caricare i profili dei giocatori.");
  }

  const challenger = players.find((p) => p.id === duelData.challenger_id)!;
  const opponent = players.find((p) => p.id === duelData.opponent_id)!;

  // Calcola nuovi ELO
  const eloResults = calculateDuelElo(
    challenger.elo_rating,
    opponent.elo_rating,
    challengerWon
  );

  // Aggiorna il duello
  await supabase
    .from("duels")
    .update({
      status: "completed",
      winner_id: winnerId,
      challenger_score: duelData.challenger_score,
      opponent_score: duelData.opponent_score,
      current_turn: null,
    })
    .eq("id", duelId);

  // Aggiorna i profili (ELO + contatori vittorie/sconfitte)
  await supabase
    .from("profiles")
    .update({
      elo_rating: eloResults.challenger.newRating,
      wins: challenger.wins + (challengerWon === true ? 1 : 0),
      losses: challenger.losses + (challengerWon === false ? 1 : 0),
      draws: challenger.draws + (challengerWon === null ? 1 : 0),
    })
    .eq("id", duelData.challenger_id);

  await supabase
    .from("profiles")
    .update({
      elo_rating: eloResults.opponent.newRating,
      wins: opponent.wins + (challengerWon === false ? 1 : 0),
      losses: opponent.losses + (challengerWon === true ? 1 : 0),
      draws: opponent.draws + (challengerWon === null ? 1 : 0),
    })
    .eq("id", duelData.opponent_id);
}
