"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/*
 * USE TIMER — Hook custom per countdown con callback.
 *
 * Un "hook custom" è una funzione che inizia con "use" e
 * riutilizza gli hook di React (useState, useEffect, ecc.)
 * per incapsulare logica riutilizzabile.
 *
 * PERCHÉ UN HOOK E NON UN COMPONENTE?
 *
 * Un componente renderizza UI. Un hook fornisce LOGICA.
 * Il timer è logica pura: conteggio, start, stop, reset.
 * La UI (cerchio animato, numero) la gestisce chi usa l'hook.
 *
 * Questo separa la LOGICA dalla PRESENTAZIONE:
 * - Lo stesso hook può essere usato con un cerchio SVG,
 *   una barra di progresso, o solo un numero.
 * - Se cambi la UI, la logica resta invariata.
 *
 * COME SI USA:
 *
 * const { timeLeft, progress, isRunning, start, pause, reset } = useTimer({
 *   duration: 20000,           // 20 secondi in ms
 *   onComplete: () => { ... }, // Cosa fare quando scade
 *   autoStart: true,           // Parte subito?
 * });
 *
 * PRECISIONE:
 *
 * setInterval con 100ms di intervallo non è preciso al millisecondo.
 * Il browser potrebbe ritardare l'esecuzione (tab in background,
 * CPU occupata). Per questo usiamo Date.now() come fonte di verità:
 *
 *   tempo_trascorso = Date.now() - momento_di_start
 *
 * L'intervallo serve solo per "svegliare" il componente
 * e ricalcolare il tempo rimasto. Il valore viene sempre
 * calcolato da Date.now(), non incrementato di 100ms.
 */

interface UseTimerOptions {
  duration: number;         // Durata totale in millisecondi
  onComplete?: () => void;  // Callback quando il timer raggiunge 0
  autoStart?: boolean;      // Parte automaticamente? (default: false)
  interval?: number;        // Frequenza di aggiornamento in ms (default: 100)
}

interface UseTimerReturn {
  timeLeft: number;     // Millisecondi rimasti
  progress: number;     // Da 1 (pieno) a 0 (scaduto)
  isRunning: boolean;   // Il timer sta girando?
  start: () => void;    // Avvia il timer
  pause: () => void;    // Mette in pausa
  reset: () => void;    // Resetta al tempo iniziale
  getElapsed: () => number; // Millisecondi trascorsi dall'inizio
}

export function useTimer({
  duration,
  onComplete,
  autoStart = false,
  interval = 100,
}: UseTimerOptions): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);

  /*
   * useRef — Mantiene un valore tra i render SENZA causare re-render.
   *
   * A differenza di useState, cambiare un ref non scatena un
   * re-render del componente. Perfetto per:
   * - Timestamp di start (cambia spesso, non serve renderizzare)
   * - ID dell'intervallo (serve per clearInterval nel cleanup)
   * - Reference al callback (per evitare stale closures)
   *
   * STALE CLOSURE PROBLEM:
   *
   * Se passassimo onComplete direttamente nell'useEffect,
   * il callback "catturerebbe" i valori del primo render
   * e non si aggiornerebbe mai. Usando un ref, il callback
   * punta sempre alla versione più recente.
   */
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Aggiorna il ref del callback quando cambia
  onCompleteRef.current = onComplete;

  /*
   * FUNZIONI DI CONTROLLO
   *
   * useCallback memorizza la funzione tra i render.
   * Senza useCallback, ogni render creerebbe una nuova funzione,
   * causando re-render inutili nei componenti figli che la ricevono.
   */
  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    pausedTimeRef.current = timeLeft;
    setIsRunning(true);
  }, [timeLeft]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(duration);
    pausedTimeRef.current = duration;
  }, [duration]);

  const getElapsed = useCallback(() => {
    return duration - timeLeft;
  }, [duration, timeLeft]);

  /*
   * useEffect — L'effetto collaterale che fa girare il timer.
   *
   * Si attiva quando `isRunning` cambia:
   * - true → avvia l'intervallo
   * - false → pulisci l'intervallo
   *
   * La funzione di CLEANUP (return () => {...}) viene chiamata:
   * 1. Quando il componente viene smontato (navigazione altrove)
   * 2. Quando le dipendenze cambiano (prima di ri-eseguire l'effetto)
   *
   * Senza cleanup, l'intervallo continuerebbe a girare anche
   * dopo che il componente è stato rimosso → memory leak + errori.
   */
  useEffect(() => {
    if (!isRunning) {
      // Timer in pausa: pulisci qualsiasi intervallo esistente
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, pausedTimeRef.current - elapsed);

      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        onCompleteRef.current?.();
      }
    }, interval);

    // Cleanup: ferma l'intervallo quando l'effetto si ri-esegue
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, interval]);

  return {
    timeLeft,
    progress: timeLeft / duration, // 1 = pieno, 0 = scaduto
    isRunning,
    start,
    pause,
    reset,
    getElapsed,
  };
}
