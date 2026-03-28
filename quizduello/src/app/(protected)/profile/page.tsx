import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

/*
 * PROFILE PAGE — Profilo dell'utente con statistiche.
 *
 * Mostra:
 * - Avatar + username + data iscrizione
 * - 4 stat box: ELO, partite, vittorie, win rate
 * - Ultime partite con risultato e variazione ELO
 *
 * Server Component async: tutte le query sono fatte sul server.
 */

export const metadata: Metadata = { title: "Profilo" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: recentDuels }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("duels")
      .select(
        `id, status, challenger_score, opponent_score, winner_id, challenger_id, opponent_id, created_at,
         challenger:profiles!challenger_id(username),
         opponent:profiles!opponent_id(username)`
      )
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  if (!profile) return null;

  const totalGames = profile.wins + profile.losses + profile.draws;
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;

  const stats = [
    { label: "ELO", value: profile.elo_rating },
    { label: "Partite", value: totalGames },
    { label: "Vittorie", value: profile.wins },
    { label: "Win rate", value: `${winRate}%` },
  ];

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 md:py-10">
      {/* Header profilo */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center text-xl font-bold text-brand-800">
          {profile.username.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            {profile.username}
          </h1>
          <p className="text-sm text-text-muted">
            Iscritto da{" "}
            {new Date(profile.created_at).toLocaleDateString("it-IT", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <span className="inline-block mt-1 text-xs font-medium px-3 py-0.5 rounded-full bg-brand-50 text-brand-800">
            ELO {profile.elo_rating}
          </span>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-xl font-bold text-text-primary tabular-nums">
              {s.value}
            </p>
            <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Ultime partite */}
      <h2 className="text-base font-semibold text-text-primary mb-3">
        Ultime partite
      </h2>

      {(recentDuels ?? []).length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-text-secondary mb-4">
            Nessuna partita completata
          </p>
          <Link href="/dashboard" className="btn-primary text-sm">
            Gioca il tuo primo duello
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(recentDuels ?? []).map((duel) => {
            const d = duel as Record<string, unknown>;
            const isChallenger = (d.challenger_id as string) === user.id;
            const opponent = isChallenger
              ? (d.opponent as { username: string })
              : (d.challenger as { username: string });
            const myScore = isChallenger
              ? (d.challenger_score as number)
              : (d.opponent_score as number);
            const oppScore = isChallenger
              ? (d.opponent_score as number)
              : (d.challenger_score as number);
            const won = (d.winner_id as string) === user.id;
            const draw = d.winner_id === null;

            return (
              <div key={d.id as string} className="card flex items-center gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    won
                      ? "bg-success-50 text-success-800"
                      : draw
                        ? "bg-warning-50 text-warning-800"
                        : "bg-danger-50 text-danger-800"
                  )}
                >
                  {won ? "W" : draw ? "D" : "L"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    vs {opponent?.username ?? "???"}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(d.created_at as string).toLocaleDateString(
                      "it-IT",
                      { day: "numeric", month: "short" }
                    )}
                  </p>
                </div>
                <span className="text-sm font-bold text-text-primary tabular-nums">
                  {myScore}-{oppScore}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
