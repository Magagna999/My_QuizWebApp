/*
 * MIGRATION 002 — Tabella categories
 *
 * Le categorie organizzano le domande per materia.
 * Esempi: "Diritto Civile", "Economia Politica", "Diritto Amministrativo".
 *
 * Il campo `slug` è una versione URL-friendly del nome:
 * "Diritto Civile" → "diritto-civile"
 * Serve per URL leggibili: /categories/diritto-civile
 *
 * `question_count` è un COUNTER CACHE: invece di fare
 * COUNT(*) ogni volta che mostri una categoria (lento su
 * milioni di righe), salviamo il conteggio qui e lo
 * aggiorniamo con un trigger quando aggiungiamo/rimuoviamo domande.
 */

CREATE TABLE public.categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  icon            TEXT DEFAULT '📚',     -- Emoji della categoria
  description     TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  question_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice per filtrare solo le categorie attive
CREATE INDEX idx_categories_active ON public.categories (active) WHERE active = true;
