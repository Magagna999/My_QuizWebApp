/*
 * MIGRATION 004 — Tabelle duels, rounds, round_answers
 *
 * Queste tre tabelle rappresentano il CUORE del gioco:
 *
 * duels → La partita tra due giocatori (5 round)
 *   └── rounds → Ogni round del duello (3 domande per round)
 *        └── round_answers → Ogni risposta data da un giocatore
 *
 * STATI DEL DUELLO (status):
 *
 * 'pending'   → Il challenger ha giocato il round 1, in attesa che
 *               l'opponent accetti e giochi
 * 'active'    → Entrambi hanno giocato almeno un round, il duello
 *               è in corso
 * 'completed' → Tutti e 5 i round sono stati giocati da entrambi
 * 'expired'   → Un giocatore non ha risposto entro 48 ore
 *
 * TURNI ASINCRONI:
 *
 * Il campo `current_turn` indica di chi è il turno.
 * Non c'è bisogno di WebSocket per il gameplay: ogni giocatore
 * gioca quando vuole. Supabase Realtime serve SOLO per la notifica
 * "Tocca a te!" nella dashboard.
 */

CREATE TABLE public.duels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id     UUID NOT NULL REFERENCES public.profiles(id),
  opponent_id       UUID NOT NULL REFERENCES public.profiles(id),

  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'completed', 'expired')),

  current_turn      UUID REFERENCES public.profiles(id),
  current_round     INTEGER NOT NULL DEFAULT 1 CHECK (current_round BETWEEN 1 AND 5),

  challenger_score  INTEGER NOT NULL DEFAULT 0,
  opponent_score    INTEGER NOT NULL DEFAULT 0,

  -- NULL = in corso o pareggio; valorizzato a fine duello
  winner_id         UUID REFERENCES public.profiles(id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dopo 48h senza risposta, il duello può scadere
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),

  -- Vincolo: non puoi sfidarti da solo!
  CONSTRAINT different_players CHECK (challenger_id != opponent_id)
);

-- Indici per le query più frequenti
-- "Mostrami i duelli attivi dove è il mio turno"
CREATE INDEX idx_duels_current_turn ON public.duels (current_turn, status);
-- "Mostrami tutti i duelli di un giocatore"
CREATE INDEX idx_duels_players ON public.duels (challenger_id, opponent_id);

CREATE TRIGGER duels_updated_at
  BEFORE UPDATE ON public.duels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

/*
 * ROUNDS — Ogni duello ha 5 round.
 *
 * Il campo `chosen_by` indica chi ha scelto la categoria.
 * Regola: round dispari → challenger sceglie, pari → opponent.
 *
 * STATI DEL ROUND:
 * 'waiting_choice' → In attesa che il giocatore scelga la categoria
 * 'in_progress'    → Categoria scelta, in attesa delle risposte
 * 'completed'      → Entrambi i giocatori hanno risposto
 */
CREATE TABLE public.rounds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id         UUID NOT NULL REFERENCES public.duels(id) ON DELETE CASCADE,
  round_number    INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 5),
  category_id     UUID REFERENCES public.categories(id),
  chosen_by       UUID REFERENCES public.profiles(id),
  status          TEXT NOT NULL DEFAULT 'waiting_choice'
                  CHECK (status IN ('waiting_choice', 'in_progress', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un duello non può avere due round con lo stesso numero
  UNIQUE (duel_id, round_number)
);

CREATE INDEX idx_rounds_duel ON public.rounds (duel_id);

/*
 * ROUND ANSWERS — Ogni risposta data da un giocatore.
 *
 * Ogni round ha 3 domande × 2 giocatori = 6 righe in round_answers.
 *
 * answer_id è NULLABLE: se il timer scade senza risposta,
 * salviamo comunque la riga con answer_id = NULL e is_correct = false.
 * Così sappiamo che il giocatore ha visto la domanda ma non ha risposto.
 *
 * time_ms salva i millisecondi impiegati per rispondere.
 * Serve per calcolare il bonus velocità:
 *   bonus = floor((tempo_rimasto / tempo_totale) * 5)
 */
CREATE TABLE public.round_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id        UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  question_id     UUID NOT NULL REFERENCES public.questions(id),
  answer_id       UUID REFERENCES public.answers(id),  -- NULL = tempo scaduto
  is_correct      BOOLEAN NOT NULL DEFAULT false,
  time_ms         INTEGER NOT NULL DEFAULT 20000,       -- default = tempo massimo
  points          INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un giocatore non può rispondere due volte alla stessa domanda nello stesso round
  UNIQUE (round_id, user_id, question_id)
);

CREATE INDEX idx_round_answers_round ON public.round_answers (round_id);
CREATE INDEX idx_round_answers_user ON public.round_answers (user_id);
