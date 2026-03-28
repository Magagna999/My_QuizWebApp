"use client";

import { cn } from "@/lib/utils";
import { ROUNDS_PER_DUEL } from "@/lib/scoring";

/*
 * ROUND PROGRESS — Barra di progresso che mostra i 5 round.
 *
 * Ogni round è rappresentato da un "dot" (pallino/barra):
 * - Completato: verde
 * - Corrente: viola (più grande, pulsante)
 * - Futuro: grigio chiaro
 *
 * È una visualizzazione "stepper" — mostra dove sei nel flusso.
 */

interface RoundProgressProps {
  currentRound: number;  // 1-5
  totalRounds?: number;  // Default: 5
}

export default function RoundProgress({
  currentRound,
  totalRounds = ROUNDS_PER_DUEL,
}: RoundProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: totalRounds }, (_, i) => {
        /*
         * Array.from({ length: 5 }) crea un array di 5 elementi.
         * Il secondo argomento (_, i) è una funzione map che
         * riceve l'indice i (0, 1, 2, 3, 4).
         *
         * roundNumber = i + 1 → converte da 0-indexed a 1-indexed.
         */
        const roundNumber = i + 1;
        const isDone = roundNumber < currentRound;
        const isCurrent = roundNumber === currentRound;

        return (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all",
              isDone && "w-10 h-1.5 bg-success-600",
              isCurrent && "w-12 h-1.5 bg-brand-600",
              !isDone && !isCurrent && "w-10 h-1.5 bg-border"
            )}
          />
        );
      })}
    </div>
  );
}
