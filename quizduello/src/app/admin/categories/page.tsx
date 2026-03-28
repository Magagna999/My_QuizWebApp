import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import CategoryForm from "@/components/admin/CategoryForm";
import type { Category } from "@/types/database";

/*
 * ADMIN CATEGORIES PAGE — Lista + form creazione categorie.
 *
 * Struttura:
 * - Colonna sinistra: lista categorie esistenti
 * - Colonna destra: form per crearne una nuova
 *
 * La lista è un Server Component (fetch nel server).
 * Il form è un Client Component (interattività nel browser).
 *
 * Quando il form salva, chiama router.refresh() →
 * Next.js ri-esegue QUESTO Server Component →
 * la lista si aggiorna automaticamente con la nuova categoria.
 */

export const metadata: Metadata = { title: "Categorie" };

export default async function CategoriesPage() {
  const supabase = await createClient();

  /*
   * QUERY SUPABASE
   *
   * .from("categories") → tabella categories
   * .select("*") → tutti i campi (SELECT *)
   * .order("name") → ORDER BY name ASC
   *
   * Il risultato è { data: Category[], error: Error | null }
   * Usiamo ?? [] come fallback: se data è null, usa array vuoto.
   */
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Categorie
      </h1>
      <p className="text-text-secondary mb-8">
        Gestisci le categorie delle domande
      </p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        {/* Lista categorie */}
        <div>
          {(categories ?? []).length === 0 ? (
            /*
             * EMPTY STATE
             *
             * Fondamentale per la UX: non lasciare mai una pagina
             * vuota senza spiegazione. L'utente deve capire cosa
             * fare. "Nessuna categoria" + invito all'azione.
             */
            <div className="card text-center py-12">
              <p className="text-text-secondary mb-2">
                Nessuna categoria creata
              </p>
              <p className="text-sm text-text-muted">
                Usa il form a destra per creare la prima categoria.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(categories as Category[]).map((cat) => (
                <div key={cat.id} className="card flex items-center gap-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-text-primary">
                        {cat.name}
                      </h3>
                      {!cat.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-warning-50 text-warning-800">
                          Disattivata
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary">
                      /{cat.slug} · {cat.question_count} domande
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form creazione */}
        <div>
          <div className="card">
            <h2 className="font-semibold text-text-primary mb-4">
              Nuova categoria
            </h2>
            <CategoryForm />
          </div>
        </div>
      </div>
    </div>
  );
}
