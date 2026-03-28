import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import QuestionForm from "@/components/admin/QuestionForm";
import type { Category, QuestionWithAnswers } from "@/types/database";

/*
 * ADMIN QUESTIONS PAGE — Lista domande + form creazione.
 *
 * Struttura simile alla pagina categorie:
 * - Tabella con le domande esistenti (sinistra)
 * - Form per crearne di nuove (destra)
 *
 * QUERY CON JOIN
 *
 * Per mostrare il nome della categoria accanto a ogni domanda,
 * facciamo una JOIN implicita con la sintassi Supabase:
 *
 *   .select("*, category:categories(name, icon)")
 *
 * Questo è equivalente a:
 *   SELECT questions.*, categories.name, categories.icon
 *   FROM questions
 *   JOIN categories ON questions.category_id = categories.id
 *
 * Supabase deduce la JOIN dalla FOREIGN KEY nel schema.
 * "category:categories" significa: "chiama il risultato 'category'
 * e fai la JOIN con la tabella 'categories'".
 */

export const metadata: Metadata = { title: "Domande" };

export default async function QuestionsPage() {
  const supabase = await createClient();

  /*
   * QUERY PARALLELE: domande + categorie
   *
   * Le categorie servono per il select nel form.
   * Le domande per la tabella.
   */
  const [{ data: questions }, { data: categories }] = await Promise.all([
    supabase
      .from("questions")
      .select("*, category:categories(name, icon), answers(*)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("name"),
  ]);

  const difficultyLabels: Record<number, { text: string; color: string }> = {
    1: { text: "Facile", color: "bg-success-50 text-success-800" },
    2: { text: "Media", color: "bg-warning-50 text-warning-800" },
    3: { text: "Difficile", color: "bg-danger-50 text-danger-800" },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">Domande</h1>
      <p className="text-text-secondary mb-8">
        {questions?.length ?? 0} domande totali · Ultime 50 mostrate
      </p>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Tabella domande */}
        <div>
          {(questions ?? []).length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-text-secondary mb-2">Nessuna domanda creata</p>
              <p className="text-sm text-text-muted">
                Usa il form a destra per creare la prima domanda.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(questions as QuestionWithAnswers[]).map((q) => {
                const diff = difficultyLabels[q.difficulty] ?? difficultyLabels[2];
                /*
                 * PERCENTUALE RISPOSTE CORRETTE
                 *
                 * Se la domanda non è mai stata mostrata (times_shown = 0),
                 * non possiamo calcolare la percentuale → mostriamo "—".
                 *
                 * Math.round() arrotonda all'intero più vicino.
                 * 67.3% → 67%
                 */
                const correctPct =
                  q.times_shown > 0
                    ? Math.round((q.times_correct / q.times_shown) * 100)
                    : null;

                return (
                  <div key={q.id} className="card">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary text-sm leading-snug">
                          {q.question_text}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {/* Badge categoria */}
                          <span className="text-xs text-text-secondary">
                            {(q.category as unknown as { icon: string; name: string })?.icon}{" "}
                            {(q.category as unknown as { name: string })?.name}
                          </span>
                          <span className="text-text-muted">·</span>
                          {/* Badge difficoltà */}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.color}`}
                          >
                            {diff.text}
                          </span>
                          {/* Statistiche */}
                          {correctPct !== null && (
                            <>
                              <span className="text-text-muted">·</span>
                              <span className="text-xs text-text-secondary">
                                {correctPct}% corrette ({q.times_shown} volte)
                              </span>
                            </>
                          )}
                          {/* Stato */}
                          {!q.active && (
                            <>
                              <span className="text-text-muted">·</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-warning-50 text-warning-800">
                                Disattivata
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Preview risposte */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {q.answers
                        ?.sort((a, b) => a.position - b.position)
                        .map((a) => (
                          <div
                            key={a.id}
                            className={cn(
                              "text-xs px-2.5 py-1.5 rounded",
                              a.is_correct
                                ? "bg-success-50 text-success-800 font-medium"
                                : "bg-surface-secondary text-text-secondary"
                            )}
                          >
                            {String.fromCharCode(64 + a.position)}.{" "}
                            {a.answer_text}
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Form creazione */}
        <div>
          <div className="card sticky top-8">
            {/*
             * STICKY TOP-8
             *
             * Quando scrolli la lista delle domande, il form
             * resta "incollato" in alto a destra. Così puoi
             * consultare le domande esistenti mentre ne crei
             * una nuova senza perdere il form dallo schermo.
             */}
            <h2 className="font-semibold text-text-primary mb-4">
              Nuova domanda
            </h2>
            <QuestionForm categories={(categories as Category[]) ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}
