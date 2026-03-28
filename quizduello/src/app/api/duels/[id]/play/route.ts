import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { playRound, PlayerAnswer } from "@/lib/duel-engine";

/*
 * API: /api/duels/[id]/play
 *
 * POST → Invia le risposte per un round.
 *
 * Questa è l'endpoint più critica del gioco.
 * Qui avviene il gameplay effettivo:
 *
 * 1. Il client invia le risposte con i tempi
 * 2. Il server verifica tutto e calcola i punti
 * 3. Il turno passa all'avversario
 *
 * BODY ATTESO:
 * {
 *   category_id: string | null,  // Solo se è il turno di scegliere
 *   answers: [
 *     { question_id: "q1", answer_id: "a2", time_ms: 5000 },
 *     { question_id: "q2", answer_id: null, time_ms: 20000 },  // tempo scaduto
 *     { question_id: "q3", answer_id: "a1", time_ms: 8500 },
 *   ]
 * }
 *
 * SICUREZZA:
 *
 * - Il client NON conosce le risposte corrette
 * - Il server verifica ogni answer_id contro il database
 * - Il server calcola i punti (non il client)
 * - time_ms è accettato dal client ma potrebbe essere validato
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: duelId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  /*
   * VALIDAZIONE INPUT
   *
   * Verifichiamo la struttura del body prima di passarlo
   * al duel engine. Questo previene crash per dati malformati.
   *
   * In produzione, useresti Zod per validazione schema:
   *
   *   const schema = z.object({
   *     category_id: z.string().nullable(),
   *     answers: z.array(z.object({
   *       question_id: z.string(),
   *       answer_id: z.string().nullable(),
   *       time_ms: z.number().min(0).max(20000),
   *     })).length(3),
   *   });
   *
   * Per l'MVP, facciamo validazione manuale.
   */
  let body: { category_id: string | null; answers: PlayerAnswer[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body JSON non valido" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.answers)) {
    return NextResponse.json(
      { error: "Il campo 'answers' deve essere un array" },
      { status: 400 }
    );
  }

  // Validazione di ogni risposta
  for (const answer of body.answers) {
    if (!answer.question_id) {
      return NextResponse.json(
        { error: "Ogni risposta deve avere un question_id" },
        { status: 400 }
      );
    }
    if (typeof answer.time_ms !== "number" || answer.time_ms < 0) {
      return NextResponse.json(
        { error: "time_ms deve essere un numero positivo" },
        { status: 400 }
      );
    }
  }

  try {
    const result = await playRound(
      supabase,
      duelId,
      user.id,
      body.category_id,
      body.answers
    );

    /*
     * RISPOSTA DI SUCCESSO
     *
     * Restituiamo il punteggio del round e il totale.
     * Il client usa questi dati per mostrare il riepilogo.
     *
     * NON restituiamo le risposte corrette qui.
     * Il client le chiederà con una GET separata al
     * dettaglio del duello, dove sono incluse nelle
     * round_answers (che contengono is_correct).
     */
    return NextResponse.json({
      success: true,
      round_score: result.roundScore,
      total_score: result.totalScore,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    /*
     * STATUS CODES:
     *
     * 400 (Bad Request) → errore dell'utente (non è il suo turno, ecc.)
     * 500 (Internal Server Error) → errore del server (bug, DB down)
     *
     * Distinguiamo cercando parole chiave nel messaggio.
     * In produzione, il duel-engine dovrebbe lanciare errori
     * tipizzati (es. NotYourTurnError) per un handling più preciso.
     */
    const isClientError = message.includes("Non è il tuo turno")
      || message.includes("Duello già completato")
      || message.includes("Duello scaduto")
      || message.includes("Devi scegliere")
      || message.includes("Devi rispondere");

    return NextResponse.json(
      { error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
