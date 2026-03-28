/*
 * MIGRATION 003 — Tabelle questions e answers
 *
 * Ogni domanda ha esattamente 4 risposte, di cui UNA sola corretta.
 *
 * Le tabelle sono separate (non un JSON con le risposte dentro la domanda)
 * perché:
 * 1. Possiamo fare query sulle risposte (es. "quante volte è stata scelta la B?")
 * 2. È più facile modificare una singola risposta
 * 3. È il pattern relazionale corretto (normalizzazione)
 *
 * STATISTICHE INTEGRATE
 *
 * `times_shown` e `times_correct` sulla domanda ci permettono di
 * calcolare la percentuale di risposte corrette:
 *   % corrette = (times_correct / times_shown) * 100
 *
 * Questo dato è utile per:
 * - Identificare domande troppo facili o troppo difficili
 * - Bilanciare la difficoltà dei duelli
 * - Mostrare statistiche nel pannello admin
 */

CREATE TABLE public.questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  difficulty      INTEGER NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  explanation     TEXT,           -- Spiegazione mostrata dopo la risposta
  active          BOOLEAN NOT NULL DEFAULT true,
  times_shown     INTEGER NOT NULL DEFAULT 0,
  times_correct   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indici per le query più frequenti
CREATE INDEX idx_questions_category ON public.questions (category_id);
CREATE INDEX idx_questions_active ON public.questions (active, category_id) WHERE active = true;

CREATE TABLE public.answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text     TEXT NOT NULL,
  is_correct      BOOLEAN NOT NULL DEFAULT false,
  position        INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4)
);

CREATE INDEX idx_answers_question ON public.answers (question_id);

/*
 * TRIGGER — Aggiorna question_count nelle categories.
 *
 * Quando inserisci una domanda attiva, incrementa il contatore.
 * Quando elimini o disattivi una domanda, decrementa.
 *
 * TG_OP è una variabile speciale che contiene l'operazione:
 * 'INSERT', 'UPDATE', o 'DELETE'.
 *
 * OLD è la riga PRIMA della modifica (disponibile in UPDATE e DELETE).
 * NEW è la riga DOPO la modifica (disponibile in INSERT e UPDATE).
 */
CREATE OR REPLACE FUNCTION public.update_question_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.active = true THEN
    UPDATE public.categories
    SET question_count = question_count + 1
    WHERE id = NEW.category_id;

  ELSIF TG_OP = 'DELETE' AND OLD.active = true THEN
    UPDATE public.categories
    SET question_count = question_count - 1
    WHERE id = OLD.category_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Se la domanda è stata disattivata
    IF OLD.active = true AND NEW.active = false THEN
      UPDATE public.categories
      SET question_count = question_count - 1
      WHERE id = OLD.category_id;
    -- Se la domanda è stata riattivata
    ELSIF OLD.active = false AND NEW.active = true THEN
      UPDATE public.categories
      SET question_count = question_count + 1
      WHERE id = NEW.category_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_question_count();
