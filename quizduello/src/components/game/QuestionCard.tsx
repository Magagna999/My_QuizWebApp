"use client";

import { useState, useCallback } from "react";
import { useTimer } from "@/hooks/useTimer";
import TimerCircle from "./TimerCircle";
import { cn } from "@/lib/utils";
import { QUESTION_TIME_MS } from "@/lib/scoring";

/*
 * QUESTION CARD — Il componente gameplay principale.
 *
 * Mostra: timer, domanda, 4 risposte cliccabili.
 * Gestisce: countdown, selezione risposta, invio risposta.
 *
 * FLUSSO:
 * 1. Il componente riceve la domanda e le 4 risposte
 * 2. Il timer parte automaticamente (autoStart: true)
 * 3. L'utente clicca una risposta → onAnswer viene chiamato
 *    con l'ID della risposta e il tempo impiegato
 * 4. Se il timer scade → onAnswer viene chiamato con
 *    answer_id: null (tempo scaduto)
 *
 * STATO "LOCKED":
 *
 * Dopo che l'utente clicca una risposta, il componente
 * si "blocca" (locked = true). Non può cambiare risposta.
 * Il timer si ferma. L'interfaccia mostra quale risposta
 * è stata selezionata.
 *
 * Il feedback (corretta/errata) NON viene mostrato qui.
 * Viene mostrato nel componente parent dopo che il server
 * ha verificato la risposta. Anti-cheat: il client non
 * conosce la risposta corretta.
 */

interface QuestionData {
  id: string;
  question_text: string;
  difficulty: number;
  category?: { name: string; icon: string };
  answers: {
    id: string;
    answer_text: string;
    position: number;
  }[];
}

interface QuestionCardProps {
  question: QuestionData;
  questionNumber: number;    // 1, 2, o 3
  totalQuestions: number;    // Sempre 3
  onAnswer: (questionId: string, answerId: string | null, timeMs: number) => void;
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: QuestionCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  /*
   * CALLBACK per il timer scaduto.
   *
   * useCallback memorizza la funzione tra i render.
   * È NECESSARIO qui perché la passiamo a useTimer come
   * onComplete. Senza useCallback, ogni render creerebbe
   * una nuova funzione → useTimer vedrebbe una nuova prop
   * → potenziali bug con il ref interno.
   */
  const handleTimeUp = useCallback(() => {
    if (!locked) {
      setLocked(true);
      onAnswer(question.id, null, QUESTION_TIME_MS);
    }
  }, [locked, onAnswer, question.id]);

  const { timeLeft, progress } = useTimer({
    duration: QUESTION_TIME_MS,
    onComplete: handleTimeUp,
    autoStart: true,
  });

  function handleSelectAnswer(answerId: string) {
    if (locked) return; // Già risposto

    const elapsed = QUESTION_TIME_MS - timeLeft;
    setSelectedId(answerId);
    setLocked(true);
    onAnswer(question.id, answerId, elapsed);
  }

  const LETTERS = ["A", "B", "C", "D"];

  return (
    <div className="flex flex-col items-center">
      {/* Timer */}
      <TimerCircle timeLeft={timeLeft} progress={progress} size={80} />

      {/* Categoria + contatore */}
      <div className="text-center mt-4 mb-2">
        {question.category && (
          <p className="text-sm text-brand-600 font-medium">
            {question.category.icon} {question.category.name}
          </p>
        )}
        <p className="text-xs text-text-muted mt-1">
          Domanda {questionNumber} di {totalQuestions}
        </p>
      </div>

      {/* Testo domanda */}
      <p className="text-lg font-medium text-text-primary text-center leading-relaxed max-w-lg mx-auto mb-8 px-4">
        {question.question_text}
      </p>

      {/* Risposte */}
      <div className="w-full max-w-lg grid gap-3 px-4">
        {/*
         * GRID A 1 COLONNA (mobile) o 2 COLONNE (desktop)
         *
         * Su mobile, le risposte sono in colonna verticale
         * (più facile toccare con il pollice).
         * Su desktop, 2×2 per usare meglio lo spazio.
         */}
        <div className="grid sm:grid-cols-2 gap-3">
          {question.answers.map((answer, index) => {
            const isSelected = selectedId === answer.id;

            return (
              <button
                key={answer.id}
                onClick={() => handleSelectAnswer(answer.id)}
                disabled={locked}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-lg border text-left transition-all",
                  isSelected
                    ? "border-brand-600 bg-brand-50 ring-2 ring-brand-600/20"
                    : locked
                      ? "border-border opacity-50 cursor-not-allowed"
                      : "border-border hover:border-brand-200 hover:bg-surface-secondary active:scale-[0.98]"
                )}
              >
                <span
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 transition-colors",
                    isSelected
                      ? "bg-brand-600 text-white"
                      : "bg-surface-secondary text-text-secondary"
                  )}
                >
                  {LETTERS[index]}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    isSelected
                      ? "text-brand-800 font-medium"
                      : "text-text-primary"
                  )}
                >
                  {answer.answer_text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
