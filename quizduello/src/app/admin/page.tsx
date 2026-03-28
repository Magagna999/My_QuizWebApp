import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

/*
 * ADMIN DASHBOARD — Panoramica con statistiche.
 *
 * Server Component async: fa le query direttamente nel componente.
 * Questo è un pattern potente di Next.js 14: niente useEffect,
 * niente loading state manuale. Il componente attende i dati
 * e renderizza tutto in un colpo lato server.
 */

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboard() {
  const supabase = await createClient();

  /*
   * QUERY PARALLELE con Promise.all
   *
   * Invece di fare le query una dopo l'altra (sequenziale):
   *   const cats = await supabase.from("categories")...
   *   const questions = await supabase.from("questions")...
   *   // Tempo totale = tempo_cats + tempo_questions
   *
   * Le facciamo in PARALLELO:
   *   const [cats, questions] = await Promise.all([...])
   *   // Tempo totale = max(tempo_cats, tempo_questions)
   *
   * Se ogni query impiega 100ms, sequenziale = 400ms, parallelo = 100ms.
   */
  const [
    { count: categoriesCount },
    { count: questionsCount },
    { count: usersCount },
    { count: duelsCount },
  ] = await Promise.all([
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("questions").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("duels").select("*", { count: "exact", head: true }),
  ]);

  /*
   * { count: "exact", head: true }
   *
   * head: true → NON scarica i dati, restituisce solo il conteggio.
   * È come fare SELECT COUNT(*) instead of SELECT *.
   * Molto più veloce e leggero.
   */

  const stats = [
    { label: "Categorie", value: categoriesCount ?? 0 },
    { label: "Domande", value: questionsCount ?? 0 },
    { label: "Utenti", value: usersCount ?? 0 },
    { label: "Duelli", value: duelsCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">Dashboard</h1>
      <p className="text-text-secondary mb-8">
        Panoramica di QuizDuello
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-3xl font-bold text-brand-600">
              {stat.value}
            </p>
            <p className="text-sm text-text-secondary mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
