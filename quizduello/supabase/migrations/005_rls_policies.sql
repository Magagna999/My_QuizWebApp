/*
 * MIGRATION 005 — Row Level Security (RLS) Policies
 *
 * RLS è il sistema di sicurezza di PostgreSQL/Supabase.
 * Funziona così: OGNI query che arriva dal client viene
 * filtrata automaticamente in base a delle regole.
 *
 * Senza RLS, un utente malintenzionato potrebbe:
 * - Leggere i profili privati di tutti
 * - Modificare il punteggio degli altri
 * - Eliminare domande dal database
 *
 * Con RLS, OGNI operazione deve passare un controllo:
 *
 *   "L'utente che sta facendo questa query ha il PERMESSO
 *    di leggere/scrivere/modificare questa specifica riga?"
 *
 * auth.uid() → restituisce l'UUID dell'utente loggato
 * (estratto dal JWT nei cookies).
 *
 * NOTA: Le API Routes di Next.js usano il Server Client
 * di Supabase, che include automaticamente il JWT.
 * Le RLS si applicano quindi sia al browser che al server.
 */

-- ========================
-- PROFILES
-- ========================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tutti possono LEGGERE i profili (classifica pubblica)
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

-- Solo il proprietario può MODIFICARE il proprio profilo
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

/*
 * USING vs WITH CHECK:
 *
 * USING → filtra le righe che puoi LEGGERE (SELECT) o su cui
 *          puoi agire (UPDATE/DELETE). "Vedi solo le tue righe."
 *
 * WITH CHECK → controlla che i NUOVI DATI siano validi.
 *              "Puoi modificare solo se il risultato è ancora tuo."
 *
 * Per UPDATE servono entrambi:
 * - USING: "puoi modificare solo la tua riga" (prima del cambio)
 * - WITH CHECK: "il risultato deve essere ancora la tua riga" (dopo)
 *
 * Senza WITH CHECK, un utente potrebbe fare:
 *   UPDATE profiles SET id = 'altro-uuid' WHERE id = 'mio-uuid'
 * e "rubare" un altro profilo.
 */

-- ========================
-- CATEGORIES
-- ========================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Tutti possono LEGGERE le categorie
CREATE POLICY "categories_select_all"
  ON public.categories FOR SELECT
  USING (true);

-- Solo gli admin possono INSERIRE/MODIFICARE/ELIMINARE
CREATE POLICY "categories_admin_insert"
  ON public.categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "categories_admin_update"
  ON public.categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "categories_admin_delete"
  ON public.categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================
-- QUESTIONS & ANSWERS
-- ========================

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Le domande sono leggibili da tutti (servono nel gameplay)
CREATE POLICY "questions_select_all"
  ON public.questions FOR SELECT
  USING (true);

CREATE POLICY "answers_select_all"
  ON public.answers FOR SELECT
  USING (true);

-- Solo admin per scrittura
CREATE POLICY "questions_admin_insert"
  ON public.questions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "questions_admin_update"
  ON public.questions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "questions_admin_delete"
  ON public.questions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "answers_admin_insert"
  ON public.answers FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "answers_admin_update"
  ON public.answers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "answers_admin_delete"
  ON public.answers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ========================
-- DUELS, ROUNDS, ROUND_ANSWERS
-- ========================

ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_answers ENABLE ROW LEVEL SECURITY;

-- Un duello è visibile SOLO ai due giocatori coinvolti
CREATE POLICY "duels_select_own"
  ON public.duels FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Chiunque sia loggato può CREARE un duello (come challenger)
CREATE POLICY "duels_insert_auth"
  ON public.duels FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

-- Solo i giocatori del duello possono aggiornarlo
CREATE POLICY "duels_update_own"
  ON public.duels FOR UPDATE
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- I round sono visibili solo ai giocatori del duello
CREATE POLICY "rounds_select_own"
  ON public.rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.duels
      WHERE duels.id = rounds.duel_id
        AND (duels.challenger_id = auth.uid() OR duels.opponent_id = auth.uid())
    )
  );

CREATE POLICY "rounds_insert_own"
  ON public.rounds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.duels
      WHERE duels.id = duel_id
        AND (duels.challenger_id = auth.uid() OR duels.opponent_id = auth.uid())
    )
  );

CREATE POLICY "rounds_update_own"
  ON public.rounds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.duels
      WHERE duels.id = rounds.duel_id
        AND (duels.challenger_id = auth.uid() OR duels.opponent_id = auth.uid())
    )
  );

-- Le risposte: visibili solo ai giocatori del duello
CREATE POLICY "round_answers_select_own"
  ON public.round_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds
      JOIN public.duels ON duels.id = rounds.duel_id
      WHERE rounds.id = round_answers.round_id
        AND (duels.challenger_id = auth.uid() OR duels.opponent_id = auth.uid())
    )
  );

-- Solo il giocatore stesso può inserire le proprie risposte
CREATE POLICY "round_answers_insert_own"
  ON public.round_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
