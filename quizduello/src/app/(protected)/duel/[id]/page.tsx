import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import GamePlay from "@/components/game/GamePlay";
import Link from "next/link";
import type { Category } from "@/types/database";

/*
 * DUEL PAGE — /duel/[id]
 *
 * Questa è la pagina che gestisce un singolo duello.
 * È un Server Component che:
 *
 * 1. Carica il duello dal database
 * 2. Verifica che l'utente sia uno dei due giocatori
 * 3. Determina lo stato attuale del duello
 * 4. Passa tutti i dati a GamePlay (Client Component)
 *
 * DYNAMIC SEGMENT [id]:
 *
 * La cartella si chiama [id]. Next.js cattura il valore
 * dall'URL e lo passa come parametro:
 *
 *   /duel/abc-123 → params.id = "abc-123"
 *
 * In Next.js 14, params è una Promise (await necessario).
 */

export const metadata: Metadata = { title: "Duello" };

export default async function DuelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Carica il duello con tutte le relazioni
  const { data: duel, error } = await supabase
    .from("duels")
    .select(
      `
      *,
      challenger:profiles!challenger_id(id, username, elo_rating),
      opponent:profiles!opponent_id(id, username, elo_rating),
      rounds(
        *,
        category:categories(id, name, icon, slug),
        answers:round_answers(*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !duel) redirect("/dashboard");

  // Verifica accesso
  if (duel.challenger_id !== user.id && duel.opponent_id !== user.id) {
    redirect("/dashboard");
  }

  const isChallenger = duel.challenger_id === user.id;
  const opponent = (isChallenger ? duel.opponent : duel.challenger) as {
    id: string;
    username: string;
    elo_rating: number;
  };
  const myScore = isChallenger ? duel.challenger_score : duel.opponent_score;
  const oppScore = isChallenger ? duel.opponent_score : duel.challenger_score;
  const isMyTurn = duel.current_turn === user.id;

  // Carica le categorie (per il picker)
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("name");

  // Determina lo stato del round corrente
  const rounds = (duel.rounds as Array<{
    round_number: number;
    status: string;
    category_id: string | null;
    category: { id: string; name: string; icon: string } | null;
  }>) ?? [];

  const currentRound = rounds.find(
    (r) => r.round_number === duel.current_round
  );

  const needsCategoryChoice =
    isMyTurn && currentRound?.status === "waiting_choice";

  // Se il duello è completato, mostra il risultato
  if (duel.status === "completed") {
    const won = duel.winner_id === user.id;
    const draw = duel.winner_id === null;

    return (
      <div className="max-w-lg mx-auto px-5 py-12 text-center">
        <div className="card py-10">
          <div
            className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
              won ? "bg-success-50" : draw ? "bg-warning-50" : "bg-danger-50"
            )}
          >
            <span className="text-2xl">
              {won ? "🏆" : draw ? "🤝" : "😢"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {won ? "Hai vinto!" : draw ? "Pareggio!" : "Hai perso"}
          </h1>
          <p className="text-text-secondary mb-2">vs {opponent.username}</p>
          <p className="text-3xl font-bold text-text-primary mb-6 tabular-nums">
            {myScore} - {oppScore}
          </p>
          <Link href="/dashboard" className="btn-primary text-sm">
            Torna alla dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Se non è il mio turno, mostra un messaggio di attesa
  if (!isMyTurn) {
    return (
      <div className="max-w-lg mx-auto px-5 py-12 text-center">
        <div className="card py-10">
          <div className="w-16 h-16 rounded-full bg-surface-secondary mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">⏳</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">
            In attesa di {opponent.username}
          </h1>
          <p className="text-text-secondary mb-2">
            Round {duel.current_round} di 5
          </p>
          <p className="text-2xl font-bold text-text-primary mb-6 tabular-nums">
            {myScore} - {oppScore}
          </p>
          <Link href="/dashboard" className="btn-secondary text-sm">
            Torna alla dashboard
          </Link>
        </div>
      </div>
    );
  }

  // È il mio turno → mostra il gameplay
  return (
    <GamePlay
      duelId={id}
      currentRound={duel.current_round}
      needsCategoryChoice={needsCategoryChoice}
      categories={(categories as Category[]) ?? []}
      myScore={myScore}
      opponentScore={oppScore}
      opponentName={opponent.username}
    />
  );
}

/*
 * Helper cn() inline — serve solo per la pagina risultato.
 * In un progetto più grande, importeremmo da utils.
 */
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
