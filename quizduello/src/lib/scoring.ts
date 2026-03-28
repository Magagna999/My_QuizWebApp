/*
 * SCORING — Calcolo punti per ogni risposta.
 *
 * Il sistema di punteggio è composto da due parti:
 *
 * 1. PUNTI BASE: 10 punti per risposta corretta, 0 per errata
 * 2. BONUS VELOCITÀ: fino a +5 punti proporzionali al tempo rimasto
 *
 * Formula bonus: floor((tempoRimasto / tempoTotale) * MAX_BONUS)
 *
 * Esempi con 20 secondi totali:
 *   Risposta in 2s  → bonus = floor((18/20) * 5) = 4 punti
 *   Risposta in 5s  → bonus = floor((15/20) * 5) = 3 punti
 *   Risposta in 10s → bonus = floor((10/20) * 5) = 2 punti
 *   Risposta in 18s → bonus = floor((2/20) * 5)  = 0 punti
 *   Tempo scaduto   → 0 punti totali
 *
 * PERCHÉ FLOOR E NON ROUND?
 *
 * floor() arrotonda SEMPRE per difetto.
 * round() a volte arrotonda per eccesso.
 *
 * Con floor(), il bonus massimo si ottiene SOLO rispondendo
 * istantaneamente (0ms). Questo rende il bonus una ricompensa
 * per la velocità, non un "regalo" per chi ci mette quasi tutto il tempo.
 *
 * PUNTI MASSIMI PER DUELLO:
 * 5 round × 3 domande × (10 + 5) = 225 punti
 */

/** Tempo massimo per rispondere a una domanda (in millisecondi) */
export const QUESTION_TIME_MS = 20_000; // 20 secondi

/** Punti base per risposta corretta */
const BASE_POINTS = 10;

/** Bonus massimo per velocità */
const MAX_SPEED_BONUS = 5;

/** Numero di domande per round */
export const QUESTIONS_PER_ROUND = 3;

/** Numero totale di round per duello */
export const ROUNDS_PER_DUEL = 5;

/*
 * INTERFACCIA — Definisce la forma dei dati in input.
 *
 * `is_correct`: se la risposta è corretta
 * `time_ms`: millisecondi impiegati per rispondere
 *
 * Avremmo potuto usare due parametri separati, ma un oggetto
 * è più leggibile: calculatePoints({ is_correct: true, time_ms: 5000 })
 * vs calculatePoints(true, 5000) — il primo si auto-documenta.
 */
interface AnswerResult {
  is_correct: boolean;
  time_ms: number;
}

/**
 * Calcola i punti per una singola risposta.
 *
 * @param answer - Il risultato della risposta
 * @returns Punti totali (0-15)
 */
export function calculatePoints(answer: AnswerResult): number {
  // Risposta errata o tempo scaduto → 0 punti
  if (!answer.is_correct) return 0;

  /*
   * CALCOLO BONUS VELOCITÀ
   *
   * 1. Calcola il tempo rimasto (totale - impiegato)
   * 2. Calcola la percentuale di tempo rimasto (rimasto / totale)
   * 3. Moltiplica per il bonus massimo
   * 4. Arrotonda per difetto con Math.floor
   *
   * Math.max(0, ...) previene valori negativi se per qualche
   * motivo time_ms > QUESTION_TIME_MS (bug nel timer client).
   */
  const timeRemaining = Math.max(0, QUESTION_TIME_MS - answer.time_ms);
  const speedRatio = timeRemaining / QUESTION_TIME_MS;
  const speedBonus = Math.floor(speedRatio * MAX_SPEED_BONUS);

  return BASE_POINTS + speedBonus;
}

/**
 * Calcola il punteggio totale di un array di risposte.
 * Usato per il riepilogo di un round.
 *
 * @param answers - Array di risultati
 * @returns Somma dei punti
 */
export function calculateRoundScore(answers: AnswerResult[]): number {
  /*
   * .reduce() è un metodo degli array che "riduce" tutti gli
   * elementi a un singolo valore. Qui somma tutti i punti:
   *
   * [5, 10, 15].reduce((acc, val) => acc + val, 0) → 30
   *
   * - acc (accumulatore): il risultato parziale (parte da 0)
   * - val: il valore corrente
   * - Alla fine, acc contiene la somma totale
   */
  return answers.reduce((total, answer) => total + calculatePoints(answer), 0);
}
