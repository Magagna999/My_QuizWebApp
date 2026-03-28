"use client";

/*
 * TIMER CIRCLE — Cerchio SVG animato per il countdown.
 *
 * Come funziona il cerchio SVG:
 *
 * SVG <circle> può avere un bordo (stroke) tratteggiato.
 * stroke-dasharray definisce la lunghezza dei tratti.
 * stroke-dashoffset "sposta" dove inizia il tratto.
 *
 * Se dasharray = circumferenza del cerchio, il bordo è UN unico tratto
 * che copre tutto il cerchio. Spostando il dashoffset da 0 a circumferenza,
 * il tratto "scompare" progressivamente → effetto countdown!
 *
 * Formula: offset = circumferenza × (1 - progress)
 *
 * - progress = 1 (timer pieno) → offset = 0 → cerchio completo
 * - progress = 0.5 (metà tempo) → offset = metà → mezzo cerchio
 * - progress = 0 (scaduto) → offset = circumferenza → cerchio vuoto
 *
 * PERCHÉ SVG E NON CSS?
 *
 * CSS non ha un modo nativo per animare un cerchio parziale.
 * Potresti usare conic-gradient, ma SVG è più preciso e
 * supportato ovunque senza prefissi vendor.
 */

interface TimerCircleProps {
  timeLeft: number;     // Millisecondi rimasti
  progress: number;     // Da 1 a 0
  size?: number;        // Diametro in px (default 72)
  strokeWidth?: number; // Spessore del bordo (default 3)
}

export default function TimerCircle({
  timeLeft,
  progress,
  size = 72,
  strokeWidth = 3,
}: TimerCircleProps) {
  const radius = (size - strokeWidth * 2) / 2;
  /*
   * CIRCUMFERENZA = 2 × π × raggio
   *
   * Per un cerchio di raggio 33px:
   * circumference = 2 × 3.14159 × 33 ≈ 207px
   *
   * Questo valore è la lunghezza totale del bordo.
   * Lo usiamo per calcolare quanto bordo "nascondere".
   */
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const seconds = Math.ceil(timeLeft / 1000);

  /*
   * COLORE DINAMICO
   *
   * Il colore del timer cambia in base al tempo rimasto:
   * - Verde: più del 50% del tempo
   * - Giallo: tra 25% e 50%
   * - Rosso: meno del 25% (urgenza!)
   *
   * Questo dà un feedback visivo immediato senza leggere il numero.
   */
  const color =
    progress > 0.5
      ? "text-brand-600"
      : progress > 0.25
        ? "text-warning-400"
        : "text-danger-600";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        /*
         * -ROTATE-90
         *
         * I cerchi SVG partono da ore 3 (destra).
         * Ruotando di -90°, il cerchio parte da ore 12 (alto),
         * che è dove ci aspettiamo che inizi un timer.
         */
      >
        {/* Cerchio di sfondo (grigio) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-border"
        />
        {/* Cerchio di progresso (colorato) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-100`}
          style={{ stroke: "currentColor" }}
        />
      </svg>
      {/* Numero secondi al centro */}
      <span className={`absolute text-xl font-bold ${color} tabular-nums`}>
        {seconds}
      </span>
    </div>
  );
}
