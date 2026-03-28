import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";

/*
 * LEADERBOARD PAGE — Classifica globale.
 *
 * Server Component: carica la classifica e la posizione
 * dell'utente corrente in un'unica query parallela.
 */

export const metadata: Metadata = { title: "Classifica" };

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: players }, { data: myProfile }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, elo_rating, wins, losses, draws")
      .order("elo_rating", { ascending: false })
      .limit(30),
    supabase
      .from("profiles")
      .select("elo_rating")
      .eq("id", user.id)
      .single(),
  ]);

  // Calcola la mia posizione
  let myRank = null;
  if (myProfile) {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gt("elo_rating", myProfile.elo_rating);
    myRank = (count ?? 0) + 1;
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 md:py-10">
      <h1 className="text-2xl font-bold text-text-primary mb-1">
        Classifica
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Top giocatori per rating ELO
        {myRank && (
          <span className="ml-2 text-brand-600 font-medium">
            · Tu sei #{myRank}
          </span>
        )}
      </p>

      <div className="flex flex-col gap-2">
        {(players ?? []).map((player, index) => {
          const isMe = player.id === user.id;
          const total = player.wins + player.losses + player.draws;
          const winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0;

          return (
            <div
              key={player.id}
              className={cn(
                "card flex items-center gap-3",
                isMe && "ring-2 ring-brand-600/20 border-brand-200"
              )}
            >
              {/* Posizione */}
              <span
                className={cn(
                  "w-8 text-center text-sm font-bold tabular-nums",
                  index === 0 && "text-warning-400",
                  index === 1 && "text-text-secondary",
                  index === 2 && "text-warning-800",
                  index > 2 && "text-text-muted"
                )}
              >
                {index + 1}
              </span>

              {/* Avatar */}
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                  isMe ? "bg-brand-50 text-brand-800" : "bg-surface-secondary text-text-secondary"
                )}
              >
                {player.username.slice(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    isMe ? "text-brand-600" : "text-text-primary"
                  )}
                >
                  {isMe ? `Tu (${player.username})` : player.username}
                </p>
                <p className="text-xs text-text-muted">
                  {player.wins}V {player.losses}S · {winRate}%
                </p>
              </div>

              {/* ELO */}
              <span
                className={cn(
                  "text-base font-bold tabular-nums",
                  isMe ? "text-brand-600" : "text-text-primary"
                )}
              >
                {player.elo_rating}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
