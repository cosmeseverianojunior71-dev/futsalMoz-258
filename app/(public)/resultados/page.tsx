import { hasDatabase } from '@/lib/db';
import { getPublicData, type Card, type Goal, type Match } from '@/lib/queries';
import { formatDateTime } from '@/lib/format';
import PublicNav, { PublicFooter } from '@/components/PublicNav';
import SetupScreen from '@/components/SetupScreen';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Resultados' };

interface MatchDetail extends Match {
  _goals: Goal[];
  _cards: Card[];
}

function ResultCard({ m }: { m: MatchDetail }) {
  const goals = m._goals;
  const cards = m._cards;
  const homeGoals = goals.filter((g) => g.team_id === m.home_team_id);
  const awayGoals = goals.filter((g) => g.team_id === m.away_team_id);
  const homeCards = cards.filter((c) => c.team_id === m.home_team_id);
  const awayCards = cards.filter((c) => c.team_id === m.away_team_id);
  const gp = m.home_shootout != null && m.away_shootout != null;

  const scorerLine = (list: Goal[]) =>
    list
      .map((g) => `${g.player_name ?? 'Golo técnico'}${g.is_penalty ? ' (GP)' : ''}${g.minute != null ? ` ${g.minute}'` : ''}`)
      .join(', ');

  const cardLine = (cs: Card[]) => {
    const y = cs.filter((c) => c.type === 'yellow').map((c) => `${c.player_name ?? ''} ${c.minute != null ? c.minute + "'" : ''}`);
    const r = cs.filter((c) => c.type === 'red').map((c) => `${c.player_name ?? ''} ${c.minute != null ? c.minute + "'" : ''}`);
    return [...(y.length ? [`🟨 ${y.join(', ')}`] : []), ...(r.length ? [`🟥 ${r.join(', ')}`] : [])].join('   ');
  };

  return (
    <li className="card p-4">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span className="font-bold uppercase tracking-wide">{m.round_label}</span>
        <span>
          {formatDateTime(m.datetime)}
          {m.venue ? ` · ${m.venue}` : ''}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate font-bold">{m.home_name}</p>
          {cardLine(homeCards) && <p className="truncate text-[11px] text-slate-500">{cardLine(homeCards)}</p>}
        </div>
        <div className="shrink-0 rounded-lg bg-pitch-700 px-3 py-1.5 text-lg font-black text-white">
          {m.home_goals} : {m.away_goals}
          {gp && <span className="block text-[10px] font-semibold text-pitch-100">GP {m.home_shootout}:{m.away_shootout}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{m.away_name}</p>
          {cardLine(awayCards) && <p className="truncate text-[11px] text-slate-500">{cardLine(awayCards)}</p>}
        </div>
      </div>
      {(homeGoals.length > 0 || awayGoals.length > 0) && (
        <div className="mt-2 grid gap-1 border-t border-slate-100 pt-2 text-[11px] text-slate-600 sm:grid-cols-2">
          <p className="sm:text-right">
            <b>{m.home_name}:</b> {scorerLine(homeGoals)}
          </p>
          <p>{scorerLine(awayGoals) && <b>{m.away_name}: </b>}
            {scorerLine(awayGoals)}
          </p>
        </div>
      )}
    </li>
  );
}

export default async function ResultadosPage() {
  if (!hasDatabase()) return <SetupScreen />;
  const data = await getPublicData();

  // anotar golos/cartões por partida para o detalhe
  const finished: MatchDetail[] = data.matches
    .filter((m) => m.status === 'terminada')
    .map((m) => ({
      ...m,
      _goals: data.goals.filter((g) => g.match_id === m.id),
      _cards: data.cards.filter((c) => c.match_id === m.id),
    }));

  // por jornada, da mais recente para a mais antiga
  const byRound = new Map<number, MatchDetail[]>();
  for (const m of finished) {
    const list = byRound.get(m.round_order) ?? [];
    list.push(m);
    byRound.set(m.round_order, list);
  }
  const rounds = Array.from(byRound.entries()).sort((a, b) => b[0] - a[0]).map(([, v]) => v);

  return (
    <div className="min-h-screen">
      <PublicNav />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-extrabold">Resultados</h1>
        <p className="mb-6 text-sm text-slate-500">Placares, golos e cartões por jornada.</p>

        {rounds.length === 0 && (
          <div className="card p-6 text-sm text-slate-500">Ainda não existem resultados registados.</div>
        )}

        <div className="space-y-6">
          {rounds.map((list, i) => (
            <section key={i}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
                {list[0].round_label}
              </h2>
              <ul className="space-y-3">
                {list.map((m) => (
                  <ResultCard key={m.id} m={m} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
