import type { Match } from '@/lib/queries';

interface TeamCell {
  name: string | null;
  score: number | null;
  winner: boolean;
}

/**
 * Janela da eliminatória: árvore de rondas com equipas, resultados e vencedores.
 */
export default function Bracket({ matches }: { matches: Match[] }) {
  const byRound = new Map<number, Match[]>();
  for (const m of matches) {
    const list = byRound.get(m.round_order) ?? [];
    list.push(m);
    byRound.set(m.round_order, list);
  }
  const roundOrders = Array.from(byRound.keys()).sort((a, b) => a - b);

  if (roundOrders.length === 0) {
    return <p className="text-sm text-slate-500">A eliminatória ainda não foi gerada.</p>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-center gap-6">
        {roundOrders.map((order) => {
          const round = (byRound.get(order) ?? []).slice().sort((a, b) => a.seq - b.seq);
          const label = round[0]?.round_label ?? `Ronda ${order}`;
          return (
            <div key={order} className="flex flex-col items-center gap-3">
              <p className="whitespace-nowrap text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
              <div
                className="flex flex-col justify-around gap-3"
                style={{ minHeight: `${round.length * 76}px` }}
              >
                {round.map((m) => {
                  const homeDone = m.status === 'terminada';
                  const homeWin = homeDone && m.winner_team_id != null && m.winner_team_id === m.home_team_id;
                  const awayWin = homeDone && m.winner_team_id != null && m.winner_team_id === m.away_team_id;
                  const cell = (name: string | null, score: number | null, winner: boolean): React.ReactNode => (
                    <div
                      className={`flex items-center gap-2 rounded px-2 py-0.5 ${
                        winner ? 'bg-pitch-100 font-bold text-pitch-900' : name ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{name ?? 'A definir'}</span>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${
                          homeDone ? (winner ? 'bg-pitch-700 text-white' : 'bg-slate-200 text-slate-600') : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {homeDone ? score : ''}
                      </span>
                    </div>
                  );
                  const note = m.status === 'terminada' && m.home_shootout != null && m.away_shootout != null ? `  (${m.home_shootout}:${m.away_shootout} GP)` : '';
                  return (
                    <div key={m.id} className="w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      {cell(m.home_name, m.home_goals, homeWin)}
                      <div className="mx-2 border-t border-slate-100" />
                      {cell(m.away_name, m.away_goals, awayWin)}
                      {note && <p className="px-2 pb-1 text-[10px] text-slate-400">{note}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
