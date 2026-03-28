/*
 * ELO — Sistema di classificazione dinamico.
 *
 * L'ELO è un sistema matematico inventato da Arpad Elo per
 * classificare i giocatori di scacchi. Funziona così:
 *
 * 1. Ogni giocatore ha un rating numerico (inizia a 1000)
 * 2. Quando due giocatori si sfidano, il sistema calcola
 *    la PROBABILITÀ ATTESA di vittoria per ognuno
 * 3. Se vince chi era favorito → piccola variazione di rating
 *    Se vince chi era sfavorito → grande variazione di rating
 *
 * ESEMPIO:
 *   Giocatore A: 1400 ELO (forte)
 *   Giocatore B: 1000 ELO (debole)
 *
 *   Se vince A (favorito): A guadagna pochi punti, B ne perde pochi
 *   Se vince B (sfavorito): B guadagna MOLTI punti, A ne perde MOLTI
 *
 * Questo rende il sistema GIUSTO: battere avversari più forti
 * vale di più che battere avversari più deboli.
 *
 * IL K-FACTOR
 *
 * K controlla QUANTO cambia il rating dopo ogni partita.
 * - K=16 (scacchi professionali) → variazioni piccole, classifica stabile
 * - K=32 (noi) → variazioni grandi, classifica dinamica
 *
 * Usiamo K=32 perché:
 * - Il gioco deve essere coinvolgente (ogni partita conta)
 * - Gli utenti giocano meno partite degli scacchisti professionisti
 * - Un K basso renderebbe frustrante salire di posizione
 */

const K_FACTOR = 32;

/**
 * Calcola la probabilità attesa di vittoria di un giocatore.
 *
 * Formula: 1 / (1 + 10^((ratingAvversario - ratingGiocatore) / 400))
 *
 * Questa è una funzione LOGISTICA (curva a S):
 * - Se i rating sono uguali → 0.5 (50% per ognuno)
 * - Se hai 400 punti in più → ~0.91 (91% di vincere)
 * - Se hai 400 punti in meno → ~0.09 (9% di vincere)
 *
 * Il 400 è una costante che determina la "scala":
 * ogni 400 punti di differenza, la probabilità si moltiplica ×10.
 *
 * @param playerRating - Rating del giocatore
 * @param opponentRating - Rating dell'avversario
 * @returns Probabilità di vittoria (tra 0 e 1)
 */
function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/*
 * INTERFACCIA — Risultato del calcolo ELO.
 *
 * Restituiamo sia il nuovo rating che la variazione (delta).
 * Il delta è utile per mostrare "+18" o "-12" nella UI.
 */
export interface EloResult {
  newRating: number;
  delta: number; // Positivo = guadagno, negativo = perdita
}

/**
 * Risultato del match dal punto di vista di un giocatore.
 * 1 = vittoria, 0.5 = pareggio, 0 = sconfitta
 */
type MatchResult = 1 | 0.5 | 0;

/**
 * Calcola il nuovo rating ELO per un giocatore.
 *
 * Formula: nuovoRating = vecchioRating + K × (risultato - atteso)
 *
 * - Se vinci e eri sfavorito: risultato (1) - atteso (0.2) = 0.8 → +25
 * - Se vinci e eri favorito: risultato (1) - atteso (0.8) = 0.2 → +6
 * - Se perdi e eri favorito: risultato (0) - atteso (0.8) = -0.8 → -25
 * - Se pareggi: risultato (0.5) - atteso (0.5) = 0 → ±0
 *
 * @param playerRating - Rating attuale del giocatore
 * @param opponentRating - Rating dell'avversario
 * @param result - 1 (vittoria), 0.5 (pareggio), 0 (sconfitta)
 * @returns Nuovo rating e variazione
 */
export function calculateElo(
  playerRating: number,
  opponentRating: number,
  result: MatchResult
): EloResult {
  const expected = expectedScore(playerRating, opponentRating);

  /*
   * Il delta è il CUORE della formula ELO:
   *   delta = K × (risultato_effettivo - risultato_atteso)
   *
   * Se il risultato effettivo SUPERA quello atteso → delta positivo
   * Se il risultato effettivo è INFERIORE → delta negativo
   *
   * Math.round() arrotonda all'intero più vicino.
   * Non vogliamo rating con decimali (1247.3 sarebbe strano).
   */
  const delta = Math.round(K_FACTOR * (result - expected));
  const newRating = playerRating + delta;

  return {
    newRating: Math.max(0, newRating), // Non può scendere sotto 0
    delta,
  };
}

/**
 * Calcola i nuovi rating ELO per ENTRAMBI i giocatori.
 *
 * Convenienza: un'unica chiamata per aggiornare entrambi.
 * Nota: i delta sono SIMMETRICI ma non esattamente opposti
 * a causa dell'arrotondamento.
 */
export function calculateDuelElo(
  challengerRating: number,
  opponentRating: number,
  challengerWon: boolean | null // null = pareggio
): { challenger: EloResult; opponent: EloResult } {
  let challengerResult: MatchResult;
  let opponentResult: MatchResult;

  if (challengerWon === null) {
    challengerResult = 0.5;
    opponentResult = 0.5;
  } else if (challengerWon) {
    challengerResult = 1;
    opponentResult = 0;
  } else {
    challengerResult = 0;
    opponentResult = 1;
  }

  return {
    challenger: calculateElo(challengerRating, opponentRating, challengerResult),
    opponent: calculateElo(opponentRating, challengerRating, opponentResult),
  };
}
