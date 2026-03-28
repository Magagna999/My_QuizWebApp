"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { Category } from "@/types/database";

/*
 * CATEGORY PICKER — Griglia di categorie selezionabili.
 *
 * Il giocatore deve scegliere UNA categoria per il round.
 * Cliccando una card, si seleziona. Cliccando "Conferma",
 * si chiama onConfirm con l'ID della categoria.
 *
 * Separare "selezione" da "conferma" è un pattern UX importante:
 * previene click accidentali. L'utente vede la sua scelta
 * evidenziata prima di confermare.
 */

interface CategoryPickerProps {
  categories: Category[];
  onConfirm: (categoryId: string) => Promise<void>;
}

export default function CategoryPicker({
  categories,
  onConfirm,
}: CategoryPickerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!selected) return;
    setLoading(true);
    try {
      await onConfirm(selected);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-5">
      <h2 className="text-lg font-semibold text-text-primary mb-1">
        Scegli la categoria
      </h2>
      <p className="text-sm text-text-secondary mb-5">
        Le domande del round saranno su questa materia
      </p>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelected(cat.id)}
            className={cn(
              "p-4 rounded-lg border text-center transition-all",
              selected === cat.id
                ? "border-brand-600 bg-brand-50 ring-2 ring-brand-600/20"
                : "border-border hover:border-brand-200"
            )}
          >
            <span className="text-2xl block mb-1">{cat.icon}</span>
            <p className="text-sm font-medium text-text-primary">
              {cat.name}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {cat.question_count} domande
            </p>
          </button>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected || loading}
        className={cn(
          "btn-primary w-full mt-5",
          (!selected || loading) && "opacity-50 cursor-not-allowed"
        )}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          "Conferma e gioca"
        )}
      </button>
    </div>
  );
}
