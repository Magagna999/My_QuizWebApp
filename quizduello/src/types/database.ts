/*
 * DATABASE TYPES — Tipi TypeScript che rispecchiano lo schema SQL.
 *
 * PERCHÉ SERVONO?
 *
 * Senza tipi, scrivi codice come:
 *   const name = user.name;  // Funziona? Esiste .name? È string o number?
 *
 * Con tipi, TypeScript sa ESATTAMENTE cosa contiene ogni oggetto:
 *   const name: string = user.username;  // ✓ Autocompletamento + controllo errori
 *   const name = user.nome;              // ✗ Errore! "nome" non esiste in Profile
 *
 * REGOLA: Ogni tabella SQL ha un tipo TypeScript corrispondente.
 * I nomi delle proprietà corrispondono ai nomi delle colonne.
 *
 * TIPI HELPER (Row, Insert, Update):
 *
 * - Row → la riga come la LEGGI dal database (tutti i campi)
 * - Insert → i campi necessari per un INSERT (senza quelli auto-generati)
 * - Update → i campi che puoi MODIFICARE (tutti opzionali con Partial)
 *
 * Questo pattern è standard in Supabase e previene errori tipo
 * "ho dimenticato di passare l'id" (che è auto-generato).
 */

// ========================
// PROFILES
// ========================

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  elo_rating: number;
  wins: number;
  losses: number;
  draws: number;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
}

// Per aggiornare il profilo (tutti i campi opzionali)
export type ProfileUpdate = Partial<
  Pick<Profile, "username" | "avatar_url">
>;

// ========================
// CATEGORIES
// ========================

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  active: boolean;
  question_count: number;
  created_at: string;
}

// Per creare una nuova categoria (senza id e campi auto)
export type CategoryInsert = Pick<
  Category,
  "name" | "slug" | "icon"
> & Partial<Pick<Category, "description" | "active">>;

/*
 * Pick<Category, "name" | "slug" | "icon">
 *
 * Pick è un utility type di TypeScript che "estrae" solo
 * alcune proprietà da un tipo. Il risultato è:
 *   { name: string; slug: string; icon: string }
 *
 * Partial<Pick<...>> rende tutte le proprietà opzionali:
 *   { description?: string | null; active?: boolean }
 *
 * Combinandoli con & (intersezione), otteniamo un tipo dove
 * name, slug, icon sono OBBLIGATORI e description, active sono OPZIONALI.
 */

// ========================
// QUESTIONS
// ========================

export interface Question {
  id: string;
  category_id: string;
  question_text: string;
  difficulty: 1 | 2 | 3;
  explanation: string | null;
  active: boolean;
  times_shown: number;
  times_correct: number;
  created_at: string;
}

export type QuestionInsert = Pick<
  Question,
  "category_id" | "question_text"
> & Partial<Pick<Question, "difficulty" | "explanation" | "active">>;

// Domanda con le sue risposte (per il gameplay e l'admin)
export interface QuestionWithAnswers extends Question {
  answers: Answer[];
  category?: Category;
}

// ========================
// ANSWERS
// ========================

export interface Answer {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  position: 1 | 2 | 3 | 4;
}

export type AnswerInsert = Pick<
  Answer,
  "question_id" | "answer_text" | "is_correct" | "position"
>;

// ========================
// DUELS
// ========================

export type DuelStatus = "pending" | "active" | "completed" | "expired";

export interface Duel {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: DuelStatus;
  current_turn: string | null;
  current_round: number;
  challenger_score: number;
  opponent_score: number;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

// Duello con i profili dei giocatori (per la dashboard)
export interface DuelWithPlayers extends Duel {
  challenger: Profile;
  opponent: Profile;
}

// ========================
// ROUNDS
// ========================

export type RoundStatus = "waiting_choice" | "in_progress" | "completed";

export interface Round {
  id: string;
  duel_id: string;
  round_number: number;
  category_id: string | null;
  chosen_by: string | null;
  status: RoundStatus;
  created_at: string;
}

export interface RoundWithDetails extends Round {
  category: Category | null;
  answers: RoundAnswer[];
}

// ========================
// ROUND ANSWERS
// ========================

export interface RoundAnswer {
  id: string;
  round_id: string;
  user_id: string;
  question_id: string;
  answer_id: string | null;
  is_correct: boolean;
  time_ms: number;
  points: number;
  created_at: string;
}
