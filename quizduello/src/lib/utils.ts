/*
 * UTILITY: cn() — Unisci classi CSS in modo sicuro
 *
 * Problema: In React, spesso vuoi combinare classi
 * condizionali con classi fisse:
 *
 *   className={`btn ${isActive ? "bg-brand-600" : ""} ${className}`}
 *
 * Questo è fragile: se `className` è undefined, ottieni
 * "btn  undefined" (con spazi in più e "undefined" letterale).
 *
 * Soluzione: cn() filtra i valori falsy e unisce il resto:
 *
 *   className={cn("btn", isActive && "bg-brand-600", className)}
 *   // → "btn bg-brand-600" (pulito, senza undefined)
 *
 * È una versione semplificata di librerie come `clsx`.
 * La usiamo ovunque nei componenti.
 */
export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/*
 * UTILITY: formatDate() — Formatta una data in italiano
 *
 * Invece di mostrare "2026-03-19T14:32:00Z" all'utente,
 * mostriamo "19 marzo 2026" o "Oggi, 14:32".
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return `Oggi, ${d.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return d.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
