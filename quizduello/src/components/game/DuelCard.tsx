"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/*
 * DUEL CARD — Card che mostra un duello nella dashboard.
 *
 * Visualizza: avatar avversario, nome, round corrente,
 * punteggio, e un badge che indica se è il tuo turno.
 *
 * È un Link: cliccandola, vai alla pagina del duello.
 *
 * PROPS DESTRUTTURATE:
 *
 * Invece di ricevere un oggetto `duel` e accedere a
 * `duel.opponentName`, destrutturiamo le props per chiarezza.
 * È come dire: "questo componente ha bisogno di QUESTI dati
 * specifici", non di un intero oggetto duello.
 */

interface DuelCardProps {
  duelId: string;
  opponentName: string;
  opponentInitials: string;
  roundInfo: string;        // Es. "Round 3 di 5 · Diritto Civile"
  myScore: number;
  opponentScore: number;
  isMyTurn: boolean;
  colorClass?: string;      // Colore sfondo avatar
}

export default function DuelCard({
  duelId,
  opponentName,
  opponentInitials,
  roundInfo,
  myScore,
  opponentScore,
  isMyTurn,
  colorClass = "bg-brand-50 text-brand-800",
}: DuelCardProps) {
  return (
    <Link
      href={`/duel/${duelId}`}
      className={cn(
        "card flex items-center gap-3 hover:border-brand-200 transition-all group",
        !isMyTurn && "opacity-60"
      )}
    >
      {/* Avatar avversario */}
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
          colorClass
        )}
      >
        {opponentInitials}
      </div>

      {/* Info duello */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {opponentName}
        </p>
        <p className="text-xs text-text-muted truncate">{roundInfo}</p>
      </div>

      {/* Punteggio + Badge turno */}
      <div className="text-right flex-shrink-0">
        <p className="text-base font-semibold text-text-primary tabular-nums">
          {/*
           * TABULAR-NUMS
           *
           * Classe Tailwind che rende i numeri a larghezza fissa.
           * Senza questa, "42-38" e "8-108" avrebbero larghezze diverse
           * perché le cifre normali hanno larghezze proporzionali
           * (l'1 è più stretto del 4). Con tabular-nums, tutte
           * le cifre hanno la stessa larghezza → i punteggi si
           * allineano perfettamente nelle card in colonna.
           */}
          {myScore}-{opponentScore}
        </p>
        <span
          className={cn(
            "inline-block text-[10px] font-medium px-2 py-0.5 rounded-full",
            isMyTurn
              ? "bg-brand-50 text-brand-800"
              : "bg-surface-secondary text-text-muted"
          )}
        >
          {isMyTurn ? "Tocca a te" : "Attende"}
        </span>
      </div>
    </Link>
  );
}
