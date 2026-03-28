import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import DuelCard from "@/components/game/DuelCard";
import type { Profile } from "@/types/database";

/*
 * DASHBOARD — La home dell'utente loggato.
 *
 * Mostra:
 * 1. Saluto + statistiche (ELO, vittorie, sconfitte, win rate)
 * 2. Bottoni azione (sfida casuale, cerca giocatore)
 * 3. Lista "Tocca a te" (duelli dove è il tuo turno)
 * 4. Lista "In attesa" (duelli dove aspetti l'avversario)
 *
 * È un Server Component async:
 * - Fa le query direttamente (niente useEffect)
 * - Renderizza i dati lato server (SEO + velocità)
 * - I componenti interattivi (DuelCard, bottoni) sono Client Components importati
 */

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // Il layout ha già fatto il redirect

  // Query parallele: profilo + duelli
  const [{ data: profile }, { data: duels }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("duels")
      .select(
        `*,
        challenger:profiles!challenger_id(id, username, avatar_url, elo_rating),
        opponent:profiles!opponent_id(id, username, avatar_url, elo_rating),
        rounds(round_number, category:categories(name, icon), status)`
      )
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .in("status", ["pending", "active"])
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  const p = profile as Profile;

  /*
   * CALCOLO WIN RATE
   *
   * Evita divisione per zero: se totalGames = 0, winRate = 0.
   * Math.round() arrotonda all'intero più vicino.
   */
  const totalGames = p.wins + p.losses + p.draws;
  const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : 0;

  /*
   * RAGGRUPPAMENTO DUELLI
   *
   * Dividiamo i duelli in "tocca a te" e "in attesa"
   * per mostrarli in sezioni separate nella dashboard.
   */
  const yourTurn = (duels ?? []).filter((d) => d.current_turn === user.id);
  const waiting = (duels ?? []).filter((d) => d.current_turn !== user.id);

  /*
   * HELPER: Estrai info dell'avversario da un duello.
   *
   * In un duello, l'utente corrente può essere il challenger
   * o l'opponent. L'avversario è l'altro.
   *
   * as any è un cast temporaneo — in produzione useresti
   * tipi generati da Supabase (supabase gen types).
   */
  function getOpponentInfo(duel: (typeof duels extends (infer T)[] | null ? T : never)) {
    const d = duel as Record<string, unknown>;
    const isChallenger = (d.challenger_id as string) === user!.id;
    const opp = (isChallenger ? d.opponent : d.challenger) as {
      id: string;
      username: string;
      elo_rating: number;
    };
    const myScore = isChallenger
      ? (d.challenger_score as number)
      : (d.opponent_score as number);
    const oppScore = isChallenger
      ? (d.opponent_score as number)
      : (d.challenger_score as number);

    const rounds = (d.rounds as { round_number: number; category: { name: string; icon: string } | null; status: string }[]) ?? [];
    const currentRound = rounds.find(
      (r) => r.round_number === (d.current_round as number)
    );
    const roundInfo = currentRound?.category
      ? `Round ${d.current_round} di 5 · ${currentRound.category.name}`
      : `Round ${d.current_round} di 5`;

    return {
      duelId: d.id as string,
      opponentName: opp?.username ?? "???",
      opponentInitials: (opp?.username ?? "??").slice(0, 2).toUpperCase(),
      myScore,
      oppScore,
      roundInfo,
    };
  }

  const stats = [
    { label: "ELO", value: p.elo_rating, color: "text-brand-600" },
    { label: "Vittorie", value: p.wins, color: "text-success-600" },
    { label: "Sconfitte", value: p.losses, color: "text-danger-600" },
    { label: "Win rate", value: `${winRate}%`, color: "text-text-primary" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 md:py-10">
      {/* Header */}
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        Ciao, {p.username}
      </h1>

      {/* Statistiche */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-surface-secondary rounded-lg p-3 text-center"
          >
            <p className={`text-xl font-bold ${s.color} tabular-nums`}>
              {s.value}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bottoni azione */}
      <div className="flex gap-3 mb-8">
        <Link href="/dashboard?action=random" className="btn-primary flex-1 justify-center text-sm">
          Sfida casuale
        </Link>
        <Link href="/dashboard?action=search" className="btn-secondary flex-1 justify-center text-sm">
          Cerca giocatore
        </Link>
      </div>

      {/* Tocca a te */}
      {yourTurn.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-text-primary mb-3">
            Tocca a te
            <span className="ml-2 text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
              {yourTurn.length}
            </span>
          </h2>
          <div className="flex flex-col gap-2.5">
            {yourTurn.map((duel) => {
              const info = getOpponentInfo(duel);
              return (
                <DuelCard
                  key={info.duelId}
                  duelId={info.duelId}
                  opponentName={info.opponentName}
                  opponentInitials={info.opponentInitials}
                  roundInfo={info.roundInfo}
                  myScore={info.myScore}
                  opponentScore={info.oppScore}
                  isMyTurn={true}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* In attesa */}
      {waiting.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-text-primary mb-3">
            In attesa
          </h2>
          <div className="flex flex-col gap-2.5">
            {waiting.map((duel) => {
              const info = getOpponentInfo(duel);
              return (
                <DuelCard
                  key={info.duelId}
                  duelId={info.duelId}
                  opponentName={info.opponentName}
                  opponentInitials={info.opponentInitials}
                  roundInfo={info.roundInfo}
                  myScore={info.myScore}
                  opponentScore={info.oppScore}
                  isMyTurn={false}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {yourTurn.length === 0 && waiting.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-lg font-medium text-text-primary mb-2">
            Nessun duello attivo
          </p>
          <p className="text-sm text-text-secondary mb-6">
            Lancia la tua prima sfida!
          </p>
          <Link href="/dashboard?action=random" className="btn-primary text-sm">
            Sfida casuale
          </Link>
        </div>
      )}
    </div>
  );
}
