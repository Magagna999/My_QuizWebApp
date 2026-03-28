"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/database";

/*
 * CATEGORY FORM — Form per creare o modificare una categoria.
 *
 * È un componente RIUSABILE: se riceve `category` come prop,
 * è in modalità MODIFICA (pre-popola i campi). Se non lo riceve,
 * è in modalità CREAZIONE (campi vuoti).
 *
 * Questo pattern si chiama "dual-mode form" ed evita di avere
 * due componenti separati (CreateCategoryForm + EditCategoryForm)
 * che fanno quasi la stessa cosa.
 */

interface Props {
  category?: Category;     // Se presente → modalità modifica
  onSuccess?: () => void;  // Callback dopo il salvataggio
}

/*
 * FUNZIONE: Genera slug da un nome.
 *
 * "Diritto Civile" → "diritto-civile"
 * "Economia Politica" → "economia-politica"
 *
 * Passi:
 * 1. toLowerCase() → tutto minuscolo
 * 2. trim() → rimuove spazi iniziali/finali
 * 3. replace(/[^\w\s-]/g, '') → rimuove tutto tranne lettere, numeri, spazi, trattini
 * 4. replace(/[\s_]+/g, '-') → spazi e underscore diventano trattini
 * 5. replace(/-+/g, '-') → trattini multipli diventano uno solo
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export default function CategoryForm({ category, onSuccess }: Props) {
  const isEditing = !!category;

  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    icon: category?.icon ?? "📚",
    description: category?.description ?? "",
    active: category?.active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Auto-genera lo slug quando modifichi il nome (solo in creazione)
      ...(name === "name" && !isEditing ? { slug: slugify(value) } : {}),
    }));
    if (error) setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Nome e slug sono obbligatori.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (isEditing) {
        /*
         * UPDATE — Modifica una categoria esistente.
         *
         * .update({ ... }) → SET name = ..., slug = ..., ecc.
         * .eq("id", category.id) → WHERE id = 'xxx'
         *
         * È equivalente a:
         *   UPDATE categories SET name='...', slug='...'
         *   WHERE id = 'xxx';
         */
        const { error: updateError } = await supabase
          .from("categories")
          .update({
            name: form.name,
            slug: form.slug,
            icon: form.icon,
            description: form.description || null,
            active: form.active,
          })
          .eq("id", category.id);

        if (updateError) throw updateError;
      } else {
        /*
         * INSERT — Crea una nuova categoria.
         *
         * .insert({ ... }) → INSERT INTO categories VALUES (...)
         *
         * L'id viene generato automaticamente da
         * DEFAULT gen_random_uuid() nel database.
         */
        const { error: insertError } = await supabase
          .from("categories")
          .insert({
            name: form.name,
            slug: form.slug,
            icon: form.icon,
            description: form.description || null,
            active: form.active,
          });

        if (insertError) {
          if (insertError.message.includes("duplicate")) {
            throw new Error("Esiste già una categoria con questo slug.");
          }
          throw insertError;
        }
      }

      /*
       * DOPO IL SALVATAGGIO
       *
       * router.refresh() → forza Next.js a ri-eseguire i Server
       * Components della pagina. Senza questo, la lista delle
       * categorie mostrerebbe ancora i dati vecchi perché i
       * Server Components sono cachati.
       *
       * onSuccess?.() → chiama il callback (se passato dal parent).
       * Il ?. è l'optional chaining: se onSuccess è undefined,
       * non fa nulla (invece di crashare).
       */
      router.refresh();
      onSuccess?.();

      // Reset form in modalità creazione
      if (!isEditing) {
        setForm({ name: "", slug: "", icon: "📚", description: "", active: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="p-3 rounded-md bg-danger-50 text-danger-800 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-[1fr_80px] gap-3">
        <div>
          <label htmlFor="cat-name" className="block text-sm font-medium text-text-secondary mb-1">
            Nome categoria
          </label>
          <input
            id="cat-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Es. Diritto Civile"
            required
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-elevated text-text-primary text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none"
          />
        </div>
        <div>
          <label htmlFor="cat-icon" className="block text-sm font-medium text-text-secondary mb-1">
            Icona
          </label>
          <input
            id="cat-icon"
            name="icon"
            value={form.icon}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-elevated text-text-primary text-sm text-center focus:border-brand-600 outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="cat-slug" className="block text-sm font-medium text-text-secondary mb-1">
          Slug (URL)
        </label>
        <input
          id="cat-slug"
          name="slug"
          value={form.slug}
          onChange={handleChange}
          placeholder="diritto-civile"
          required
          className="w-full px-3 py-2 rounded-md border border-border bg-surface-elevated text-text-primary text-sm font-mono focus:border-brand-600 outline-none"
        />
      </div>

      <div>
        <label htmlFor="cat-desc" className="block text-sm font-medium text-text-secondary mb-1">
          Descrizione (opzionale)
        </label>
        <textarea
          id="cat-desc"
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={2}
          placeholder="Breve descrizione della categoria..."
          className="w-full px-3 py-2 rounded-md border border-border bg-surface-elevated text-text-primary text-sm resize-none focus:border-brand-600 outline-none"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
          className="rounded border-border text-brand-600 focus:ring-brand-600"
        />
        <span className="text-sm text-text-secondary">Categoria attiva</span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className={cn("btn-primary text-sm w-full", loading && "opacity-70 cursor-not-allowed")}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            <Save size={16} className="mr-2" />
            {isEditing ? "Salva modifiche" : "Crea categoria"}
          </>
        )}
      </button>
    </form>
  );
}
