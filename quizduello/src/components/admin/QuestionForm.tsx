"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/database";

/*
 * QUESTION FORM — Form per creare una domanda con 4 risposte.
 *
 * Questo è il form più complesso dell'admin perché gestisce
 * DUE tabelle in una volta: questions + answers.
 *
 * FLUSSO:
 * 1. L'utente compila la domanda e le 4 risposte
 * 2. Seleziona quale risposta è corretta (radio button)
 * 3. Al submit:
 *    a. INSERT nella tabella questions → riceve l'id
 *    b. INSERT di 4 righe nella tabella answers con question_id
 *
 * Queste due operazioni dovrebbero essere in una TRANSAZIONE
 * (se la seconda fallisce, la prima viene annullata).
 * Per semplicità non usiamo transazioni qui, ma in produzione
 * andrebbero gestite con una Supabase Edge Function o un RPC.
 */

interface Props {
  categories: Category[];  // Lista categorie per il select
  onSuccess?: () => void;
}

export default function QuestionForm({ categories, onSuccess }: Props) {
  const [form, setForm] = useState({
    category_id: categories[0]?.id ?? "",
    question_text: "",
    difficulty: 2 as 1 | 2 | 3,
    explanation: "",
    answers: [
      { text: "", is_correct: true },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();

  /*
   * HANDLER RISPOSTE
   *
   * Aggiornare un elemento specifico di un array in React
   * richiede di creare una COPIA dell'array e modificare
   * solo l'elemento interessato.
   *
   * NON puoi fare: form.answers[index].text = "nuovo";
   * React non rileva il cambiamento (stessa reference in memoria).
   *
   * DEVI fare: creare un nuovo array con map(), dove
   * l'elemento all'indice `index` ha il valore nuovo
   * e tutti gli altri restano invariati.
   */
  function updateAnswer(index: number, text: string) {
    setForm((prev) => ({
      ...prev,
      answers: prev.answers.map((a, i) =>
        i === index ? { ...a, text } : a
      ),
    }));
  }

  /*
   * HANDLER RISPOSTA CORRETTA
   *
   * Quando selezioni una risposta come corretta,
   * TUTTE le altre diventano false.
   * Solo UNA può essere corretta alla volta.
   */
  function setCorrectAnswer(index: number) {
    setForm((prev) => ({
      ...prev,
      answers: prev.answers.map((a, i) => ({
        ...a,
        is_correct: i === index,
      })),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validazione
    if (!form.question_text.trim()) {
      setError("Il testo della domanda è obbligatorio.");
      return;
    }

    const emptyAnswers = form.answers.filter((a) => !a.text.trim());
    if (emptyAnswers.length > 0) {
      setError("Tutte e 4 le risposte devono avere un testo.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Step 1: Inserisci la domanda
      const { data: question, error: qError } = await supabase
        .from("questions")
        .insert({
          category_id: form.category_id,
          question_text: form.question_text,
          difficulty: form.difficulty,
          explanation: form.explanation || null,
        })
        .select("id")    // Ritorna l'id della domanda appena creata
        .single();        // Attende una singola riga (non un array)

      if (qError) throw qError;

      /*
       * .select("id").single()
       *
       * Dopo un INSERT, Supabase non restituisce nulla di default.
       * Con .select("id") gli diciamo: "dopo aver inserito,
       * restituiscimi il campo id della riga creata".
       *
       * .single() dice: "mi aspetto UNA sola riga" e restituisce
       * un oggetto {} invece di un array [{}].
       */

      // Step 2: Inserisci le 4 risposte
      const answersToInsert = form.answers.map((a, i) => ({
        question_id: question.id,
        answer_text: a.text,
        is_correct: a.is_correct,
        position: (i + 1) as 1 | 2 | 3 | 4,
      }));

      const { error: aError } = await supabase
        .from("answers")
        .insert(answersToInsert);

      if (aError) throw aError;

      // Successo! Reset del form
      setSuccess(true);
      setForm({
        category_id: form.category_id, // Mantiene la categoria selezionata
        question_text: "",
        difficulty: 2,
        explanation: "",
        answers: [
          { text: "", is_correct: true },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
        ],
      });

      router.refresh();
      onSuccess?.();

      // Nascondi il messaggio di successo dopo 3 secondi
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div role="alert" className="p-3 rounded-md bg-danger-50 text-danger-800 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-md bg-success-50 text-success-800 text-sm animate-fade-in">
          Domanda creata con successo!
        </div>
      )}

      {/* Categoria e Difficoltà in riga */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="q-cat" className="block text-sm font-medium text-text-secondary mb-1">
            Categoria
          </label>
          <select
            id="q-cat"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-elevated text-text-primary text-sm outline-none focus:border-brand-600"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="q-diff" className="block text-sm font-medium text-text-secondary mb-1">
            Difficoltà
          </label>
          <select
            id="q-diff"
            value={form.difficulty}
            onChange={(e) =>
              setForm({ ...form, difficulty: Number(e.target.value) as 1 | 2 | 3 })
            }
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-elevated text-text-primary text-sm outline-none focus:border-brand-600"
          >
            <option value={1}>Facile</option>
            <option value={2}>Media</option>
            <option value={3}>Difficile</option>
          </select>
        </div>
      </div>

      {/* Testo domanda */}
      <div>
        <label htmlFor="q-text" className="block text-sm font-medium text-text-secondary mb-1">
          Domanda
        </label>
        <textarea
          id="q-text"
          value={form.question_text}
          onChange={(e) => setForm({ ...form, question_text: e.target.value })}
          rows={3}
          required
          placeholder="Scrivi il testo della domanda..."
          className="w-full px-3 py-2 rounded-md border border-border bg-surface-elevated text-text-primary text-sm resize-none outline-none focus:border-brand-600"
        />
      </div>

      {/* 4 Risposte */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Risposte (seleziona quella corretta)
        </label>
        <div className="space-y-2">
          {form.answers.map((answer, index) => (
            <div key={index} className="flex items-center gap-2">
              {/*
               * RADIO BUTTON per la risposta corretta.
               *
               * Tutti i radio con lo stesso `name` formano un gruppo:
               * selezionandone uno, gli altri si deselezionano.
               *
               * checked={answer.is_correct} → selezionato se questa
               * è la risposta corretta.
               */}
              <input
                type="radio"
                name="correct_answer"
                checked={answer.is_correct}
                onChange={() => setCorrectAnswer(index)}
                className="text-brand-600 focus:ring-brand-600"
                aria-label={`Risposta ${index + 1} è corretta`}
              />
              <span className="w-6 h-6 rounded-full bg-surface-secondary flex items-center justify-center text-xs font-medium text-text-secondary flex-shrink-0">
                {String.fromCharCode(65 + index)}
                {/* 65 = 'A' in ASCII. 65+0='A', 65+1='B', 65+2='C', 65+3='D' */}
              </span>
              <input
                type="text"
                value={answer.text}
                onChange={(e) => updateAnswer(index, e.target.value)}
                placeholder={`Risposta ${String.fromCharCode(65 + index)}`}
                required
                className={cn(
                  "flex-1 px-3 py-2 rounded-md border text-sm outline-none",
                  answer.is_correct
                    ? "border-success-600 bg-success-50 text-success-800"
                    : "border-border bg-surface-elevated text-text-primary",
                  "focus:border-brand-600"
                )}
              />
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-text-muted">
          Il pallino selezionato indica la risposta corretta
        </p>
      </div>

      {/* Spiegazione */}
      <div>
        <label htmlFor="q-expl" className="block text-sm font-medium text-text-secondary mb-1">
          Spiegazione (opzionale)
        </label>
        <textarea
          id="q-expl"
          value={form.explanation}
          onChange={(e) => setForm({ ...form, explanation: e.target.value })}
          rows={2}
          placeholder="Spiegazione mostrata dopo la risposta..."
          className="w-full px-3 py-2 rounded-md border border-border bg-surface-elevated text-text-primary text-sm resize-none outline-none focus:border-brand-600"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={cn("btn-primary text-sm w-full", loading && "opacity-70 cursor-not-allowed")}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            <Plus size={16} className="mr-2" />
            Aggiungi domanda
          </>
        )}
      </button>
    </form>
  );
}
