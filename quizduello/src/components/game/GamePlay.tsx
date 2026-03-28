"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QuestionCard from "./QuestionCard";
import RoundProgress from "./RoundProgress";
import CategoryPicker from "./CategoryPicker";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import type { Category } from "@/types/database";

/*
 * GAMEPLAY — Componente orchestratore del round.
 *
 * Gestisce l'intero flusso di un turno di gioco:
 *
 * 1. SCELTA CATEGORIA (se è il turno di scegliere)
 *    → Mostra CategoryPicker
 *    → Al confirm, chiama l'API per impostare la categoria
 *    → Riceve le domande dal server
 *
 * 2. DOMANDE (3 domande in sequenza)
 *    → Mostra QuestionCard per ogni domanda
 *    → Raccoglie le risposte in un array
 *    → Dopo la terza domanda, invia tutto al server
 *
 * 3. RISULTATO
 *    → Mostra il punteggio del round
 *    → Bottone per tornare alla dashboard
 *
 * PERCHÉ UN COMPONENTE "ORCHESTRATORE"?
 *
 * Invece di mettere tutta questa logica nella pagina,
 * la isoliamo in un componente. La pagina (Server Component)
 * si occupa solo di caricare i dati iniziali e passarli qui.
 *
 * Vantaggi:
 * - La pagina resta un Server Component (SEO, metadata)
 * - Tutta l'interattività è qui (client, testabile)
 * - Facile da riutilizzare se servisse un "quick play" mode
 */

interface PlayerAnswer {
  question_id: string;
  answer_id: string | null;
  time_ms: number;
}

interface QuestionData {
  id: string;
  question_text: string;
  difficulty: number;
  category?: { name: string; icon: string };
  answers: { id: string; answer_text: string; position: number }[];
}

type GamePhase = "category" | "playing" | "submitting" | "result";

interface GamePlayProps {
  duelId: string;
  currentRound: number;
  needsCategoryChoice: boolean;
  categories: Category[];
  initialQuestions?: QuestionData[];
  myScore: number;
  opponentScore: number;
  opponentName: string;
}

export default function GamePlay({
  duelId,
  currentRound,
  needsCategoryChoice,
  categories,
  initialQuestions,
  myScore,
  opponentScore,
  opponentName,
}: GamePlayProps) {
  /*
   * STATE MACHINE
   *
   * Il gameplay è modellato come una MACCHINA A STATI:
   *
   * "category"   → Scelta categoria (se necessario)
   * "playing"    → Domande in corso
   * "submitting" → Invio risposte al server
   * "result"     → Mostra risultato del round
   *
   * Ogni fase ha la sua UI. Le transizioni sono unidirezionali:
   * category → playing → submitting → result
   *
   * Questo pattern previene stati "impossibili"
   * (es. mostrare domande mentre si sceglie la categoria).
   */
  const [phase, setPhase] = useState<GamePhase>(
    needsCategoryChoice ? "category" : "playing"
  );
  const [questions, setQuestions] = useState<QuestionData[]>(
    initialQuestions ?? []
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PlayerAnswer[]>([]);
  const [roundScore, setRoundScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  /*
   * HANDLER: Categoria confermata.
   *
   * Chiama l'API per impostare la categoria e ricevere le domande.
   * L'API restituisce le domande SENZA is_correct (anti-cheat).
   */
  const handleCategoryConfirm = useCallback(
    async (categoryId: string) => {
      try {
        const res = await fetch(`/api/duels/${duelId}?withQuestions=true`, {
          method: "GET",
          headers: { "x-category-id": categoryId },
        });

        /*
         * Per semplicità, qui simuliamo la scelta categoria.
         * In un'implementazione completa, la CategoryPicker
         * chiamerebbe POST /api/duels/[id]/play con solo la
         * category_id (senza answers), e il server imposerebbe
         * la categoria + selezionerebbe le domande.
         *
         * Per l'MVP, carichiamo le domande dalla categoria
         * direttamente e le mostriamo.
         */
        const categoriesRes = await fetch(`/api/duels/${duelId}`);
        const data = await categoriesRes.json();

        if (data.currentQuestions && data.currentQuestions.length > 0) {
          setQuestions(data.currentQuestions);
        }

        setPhase("playing");
      } catch {
        setError("Errore nel caricamento delle domande.");
      }
    },
    [duelId]
  );

  /*
   * HANDLER: Risposta data a una domanda.
   *
   * Raccoglie la risposta nell'array `answers`.
   * Dopo un breve delay (per feedback visivo), passa
   * alla domanda successiva o invia tutte le risposte.
   */
  function handleAnswer(
    questionId: string,
    answerId: string | null,
    timeMs: number
  ) {
    const newAnswer: PlayerAnswer = {
      question_id: questionId,
      answer_id: answerId,
      time_ms: timeMs,
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    /*
     * DELAY DI 1.5 SECONDI
     *
     * Dopo che l'utente risponde, aspettiamo 1.5 secondi
     * prima di passare alla prossima domanda. Questo:
     *
     * 1. Dà tempo di leggere quale risposta ha selezionato
     * 2. Crea un ritmo naturale (non troppo frenetico)
     * 3. Permette future animazioni di feedback
     *
     * setTimeout è il modo più semplice per un delay.
     * In un'app più complessa, useresti un animation framework.
     */
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        // Prossima domanda
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // Ultima domanda → invia tutto al server
        submitAnswers(updatedAnswers);
      }
    }, 1500);
  }

  /*
   * INVIO RISPOSTE AL SERVER
   *
   * Tutte le risposte vengono inviate in UN'UNICA richiesta.
   * Non una per domanda, ma tutte e 3 insieme.
   *
   * Perché? Atomicità: o tutte le risposte vengono registrate,
   * o nessuna. Se inviassimo una alla volta e la rete cadesse
   * dopo la seconda, avremmo uno stato inconsistente.
   */
  async function submitAnswers(allAnswers: PlayerAnswer[]) {
    setPhase("submitting");

    try {
      const res = await fetch(`/api/duels/${duelId}/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: null, // Già impostata
          answers: allAnswers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Errore nell'invio delle risposte.");
        return;
      }

      setRoundScore(data.round_score);
      setPhase("result");
    } catch {
      setError("Errore di connessione. Riprova.");
      setPhase("playing");
    }
  }

  // ==================== RENDERING PER FASE ====================

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-5 py-12 text-center">
        <div className="card py-8">
          <XCircle size={40} className="text-danger-600 mx-auto mb-4" />
          <p className="text-text-primary font-medium mb-2">Errore</p>
          <p className="text-sm text-text-secondary mb-4">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-primary text-sm"
          >
            Torna alla dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header: avversario + round */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-sm text-text-secondary">
          vs <span className="font-medium text-text-primary">{opponentName}</span>
        </p>
        <p className="text-sm text-text-muted">
          Round {currentRound}
        </p>
      </div>

      {/* Progress bar round */}
      <RoundProgress currentRound={currentRound} />

      {/* ===== FASE: SCELTA CATEGORIA ===== */}
      {phase === "category" && (
        <CategoryPicker
          categories={categories}
          onConfirm={handleCategoryConfirm}
        />
      )}

      {/* ===== FASE: DOMANDE ===== */}
      {phase === "playing" && questions.length > 0 && (
        <div className="mt-4">
          {/*
           * KEY SUL QUESTIONCARD
           *
           * Usiamo question.id come key. Quando la key cambia,
           * React DISTRUGGE il componente vecchio e ne crea
           * uno nuovo. Questo resetta automaticamente tutto
           * lo stato interno (timer, selezione, locked).
           *
           * Senza key diversa, React "riuserebbe" il componente
           * e lo stato interno resterebbe quello della domanda
           * precedente → il timer non ripartirebbe, la risposta
           * selezionata resterebbe visibile, ecc.
           *
           * È un pattern fondamentale: cambiare la key FORZA
           * un remount completo.
           */}
          <QuestionCard
            key={questions[currentQuestionIndex].id}
            question={questions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            onAnswer={handleAnswer}
          />

          {/* Punteggio parziale */}
          <div className="flex justify-between px-4 mt-6 text-sm text-text-muted">
            <span>
              Tu: <span className="font-medium text-text-primary tabular-nums">{myScore}</span>
            </span>
            <span>
              {opponentName}:{" "}
              <span className="font-medium text-text-primary tabular-nums">{opponentScore}</span>
            </span>
          </div>
        </div>
      )}

      {/* ===== FASE: INVIO IN CORSO ===== */}
      {phase === "submitting" && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="text-brand-600 animate-spin mb-4" />
          <p className="text-text-secondary">Invio risposte...</p>
        </div>
      )}

      {/* ===== FASE: RISULTATO ===== */}
      {phase === "result" && (
        <div className="text-center py-12">
          <CheckCircle size={48} className="text-success-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Round completato!
          </h2>
          <p className="text-3xl font-bold text-brand-600 mb-1 tabular-nums">
            +{roundScore}
          </p>
          <p className="text-sm text-text-secondary mb-8">
            punti guadagnati in questo round
          </p>
          <button
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
            className="btn-primary"
          >
            Torna alla dashboard
            <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}
    </div>
  );
}
