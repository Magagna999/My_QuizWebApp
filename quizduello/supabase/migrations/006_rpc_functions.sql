/*
 * MIGRATION 006 — Funzione RPC per aggiornare le statistiche domande.
 *
 * RPC (Remote Procedure Call) permette di chiamare funzioni
 * PostgreSQL direttamente dal client Supabase:
 *
 *   supabase.rpc('increment_question_stats', { q_id: '...', was_correct: true })
 *
 * PERCHÉ UNA FUNZIONE E NON UN UPDATE DIRETTO?
 *
 * Perché l'operazione è: times_shown = times_shown + 1
 * Questo è un incremento ATOMICO — se due giocatori rispondono
 * alla stessa domanda nello stesso istante, entrambi gli
 * incrementi vengono applicati correttamente.
 *
 * Con un UPDATE dal client:
 *   1. Client A legge times_shown = 10
 *   2. Client B legge times_shown = 10
 *   3. Client A scrive times_shown = 11
 *   4. Client B scrive times_shown = 11 ← ERRORE! Dovrebbe essere 12
 *
 * Con una funzione server-side, PostgreSQL gestisce
 * la concorrenza automaticamente con i lock.
 */

CREATE OR REPLACE FUNCTION public.increment_question_stats(
  q_id UUID,
  was_correct BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.questions
  SET
    times_shown = times_shown + 1,
    times_correct = times_correct + (CASE WHEN was_correct THEN 1 ELSE 0 END)
  WHERE id = q_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
