/*
 * MIGRATION 001 — Tabella profiles
 *
 * Questa tabella ESTENDE la tabella auth.users di Supabase.
 * Supabase gestisce autenticazione (email, password, JWT) nella
 * sua tabella interna auth.users. Noi aggiungiamo i dati di GIOCO
 * (username, ELO, vittorie, ecc.) in una tabella separata.
 *
 * PERCHÉ NON MODIFICARE auth.users DIRETTAMENTE?
 *
 * Perché auth.users è gestita da Supabase e ha uno schema fisso.
 * Non possiamo aggiungere colonne come "elo_rating" lì dentro.
 * La soluzione standard è creare una tabella "profiles" collegata
 * con una FOREIGN KEY all'id di auth.users.
 *
 * IL TRIGGER
 *
 * Quando un nuovo utente si registra (INSERT in auth.users),
 * il trigger crea AUTOMATICAMENTE la riga corrispondente in profiles.
 * Così non dobbiamo fare due operazioni separate (signUp + INSERT).
 *
 * Il trigger legge lo username da auth.users.raw_user_meta_data,
 * che è dove il RegisterForm salva lo username tramite
 * supabase.auth.signUp({ options: { data: { username } } }).
 */

-- Crea la tabella profiles
CREATE TABLE public.profiles (
  -- id è la PRIMARY KEY e anche FOREIGN KEY verso auth.users
  -- Quando l'utente viene eliminato da auth, anche il profilo sparisce (CASCADE)
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  username    TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,

  -- Dati di gioco
  elo_rating  INTEGER NOT NULL DEFAULT 1000,
  wins        INTEGER NOT NULL DEFAULT 0,
  losses      INTEGER NOT NULL DEFAULT 0,
  draws       INTEGER NOT NULL DEFAULT 0,

  -- Ruolo: 'user' o 'admin'
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice per cercare utenti per username velocemente
-- LOWER(username) → la ricerca è case-insensitive
CREATE INDEX idx_profiles_username ON public.profiles (LOWER(username));

-- Indice per la classifica (ORDER BY elo_rating DESC)
CREATE INDEX idx_profiles_elo ON public.profiles (elo_rating DESC);

/*
 * FUNZIONE TRIGGER — Crea il profilo automaticamente.
 *
 * NEW è una variabile speciale di PostgreSQL che contiene
 * la riga appena inserita in auth.users.
 *
 * NEW.raw_user_meta_data è il JSON con i dati extra passati
 * nel signUp (contiene lo username).
 *
 * ->> 'username' estrae il valore della chiave 'username'
 * dal JSON come testo.
 *
 * COALESCE(..., 'user_' || ...) è un fallback: se lo username
 * non è presente nei metadata, genera uno automatico tipo
 * "user_a1b2c3d4" (primi 8 caratteri dell'UUID).
 */
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'username',
      'user_' || LEFT(NEW.id::text, 8)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/*
 * TRIGGER — Si attiva DOPO ogni INSERT in auth.users.
 *
 * FOR EACH ROW → si attiva per ogni singola riga inserita.
 * AFTER INSERT → si attiva dopo che l'INSERT è completato.
 * SECURITY DEFINER → esegue con i permessi dell'owner (superuser),
 * necessario perché auth.users è una tabella privilegiata.
 */
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

/*
 * FUNZIONE per aggiornare updated_at automaticamente.
 * La riuseremo su più tabelle.
 */
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
