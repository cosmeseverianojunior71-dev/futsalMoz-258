import Link from 'next/link';
import { hasDatabase } from '@/lib/db';
import {
  getCards,
  getChampionship,
  getFouls,
  getGoals,
  getMatches,
  getPlayers,
  getSuspensionMap,
  getTeams,
  type Match,
} from '@/lib/queries';
import { formatDateTime } from '@/lib/format';
import SetupScreen from '@/components/SetupScreen';
import MatchReportForm, { type SuspendedPlayer } from '@/components/MatchReportForm';
import ReopenButton from '@/components/admin/ReopenButton';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Resultados' };

export default async function AdminResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; done?: string }>;
}) {
  if (!hasDatabase()) return <SetupScreen />;
  const { m: selectedId, done } = await searchParams;

  const [champ, matches, players, goals, cards, fouls, suspensionMap] = await Promise.all([
    getChampionship(),
    getMatches(),
    getPlayers(),
    getGoals(),
    getCards(),
    getFouls(),
    getSuspensionMap(),
  ]);
  void champ;

  const selected = matches.find((m) => m.id === selectedId) ?? null;

  // lista ordenada: agendadas por data, depois terminadas por data descendente
  const scheduled = matches
    .filter((m) => m.status === 'agendada')
    .sort((a, b) => (a.datetime ? Date.parse(a.datetime) : Infinity) - (b.datetime ? Date.parse(b.datetime) : Infinity));
  const finished = matches
    .filter((m) => m.status === 'terminada')
    .sort((a, b) => (b.datetime ? Date.parse(b.datetime) : 0) - (a.datetime ? Date.parse(a.datetime) : 0));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">Resultados</h1>
      <p className="mb-6 text-sm text-slate-500">
        Registe os placares após cada rodada: golos, cartões, faltas por tempo e guarda-redes. As suspensões são
        controladas automaticamente.
      </p>

      {done === '1' && <div className="alert-success">✔ Relatório guardado com sucesso.</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* lista de partidas */}
        <div className="card self-start overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Partidas agendadas</h2>
          </div>
          <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
            {scheduled.length === 0 && <li className="p-4 text-sm text-slate-500">Sem partidas agendadas.</li>}
            {scheduled.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/resultados?m=${m.id}`}
                  className={`block px-4 py-3 transition hover:bg-pitch-50 ${selected?.id === m.id ? 'bg-pitch-50' : ''}`}
                >
                  <p className="truncate text-sm font-semibold">
                    {m.home_name ?? '—'} × {m.away_name ?? '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {m.round_label} · {formatDateTime(m.datetime)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {finished.length > 0 && (
            <>
              <div className="border-y border-slate-100 bg-slate-50 px-4 py-2.5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Terminadas (editar)</h2>
              </div>
              <ul className="max-h-[16rem] divide-y divide-slate-100 overflow-y-auto">
                {finished.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/admin/resultados?m=${m.id}`}
                      className={`block px-4 py-2.5 transition hover:bg-pitch-50 ${selected?.id === m.id ? 'bg-pitch-50' : ''}`}
                    >
                      <p className="truncate text-sm font-semibold">
                        {m.home_name ?? '—'} {m.home_goals}:{m.away_goals} {m.away_name ?? '—'}
                      </p>
                      <p className="text-xs text-slate-500">{m.round_label}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* formulário */}
        <div className="min-w-0">
          {matches.length === 0 ? (
            <div className="card p-6 text-sm text-slate-500">
              Gere primeiro o calendário (Configuração → Gerar calendário) para registar resultados.
            </div>
          ) : selected ? (
            <MatchSection
              match={selected}
              players={players}
              goals={goals}
              cards={cards}
              fouls={fouls}
              suspensionMap={suspensionMap}
            />
          ) : (
            <div className="card p-8 text-center text-sm text-slate-500">
              Selecione uma partida à esquerda para registar o relatório.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchSection({
  match,
  players,
  goals,
  cards,
  fouls,
  suspensionMap,
}: {
  match: Match;
  players: { id: string; team_id: string; name: string; number: number | null; position: string }[];
  goals: { match_id: string; team_id: string; player_id: string | null; minute: number | null; is_penalty: boolean }[];
  cards: { match_id: string; team_id: string; player_id: string; type: 'yellow' | 'red'; minute: number | null }[];
  fouls: { match_id: string; team_id: string; half: number; count: number }[];
  suspensionMap: Map<string, { playerId: string; playerName: string; teamName: string; reason: string }[]>;
}) {
  if (!match.home_team_id || !match.away_team_id) {
    return (
      <div className="card p-8 text-center">
        <p className="mb-2 text-3xl">⏳</p>
        <p className="text-sm font-semibold text-slate-600">
          {match.round_label}: aguarda a definição das equipas.
        </p>
        <p className="text-xs text-slate-500">
          O sorteo é preenchido automaticamente quando as partidas anteriores são concluídas.
        </p>
      </div>
    );
  }

  const home = { id: match.home_team_id, name: match.home_name ?? '' };
  const away = { id: match.away_team_id, name: match.away_name ?? '' };

  const suspended: SuspendedPlayer[] = (suspensionMap.get(match.id) ?? []).map((s) => ({
    playerName: s.playerName,
    teamName: s.teamName,
    reason: s.reason === 'expulsao' ? 'expulsão / 2.º amarelo' : '3.º cartão amarelo',
  }));

  const isFinished = match.status === 'terminada';

  return (
    <div>
      {isFinished && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="badge-green">Partida terminada — pode rever e corrigir o relatório</span>
          <ReopenButton matchId={match.id} />
        </div>
      )}
      <MatchReportForm
        matchId={match.id}
        stage={match.stage}
        roundLabel={match.round_label}
        home={home}
        away={away}
        homePlayers={players.filter((p) => p.team_id === match.home_team_id)}
        awayPlayers={players.filter((p) => p.team_id === match.away_team_id)}
        suspended={suspended}
        initial={
          isFinished
            ? {
                goals: goals
                  .filter((g) => g.match_id === match.id)
                  .map((g) => ({
                    team: g.team_id === match.home_team_id ? ('home' as const) : ('away' as const),
                    playerId: g.player_id,
                    minute: g.minute,
                    penalty: g.is_penalty,
                  })),
                cards: cards
                  .filter((c) => c.match_id === match.id)
                  .map((c) => ({
                    team: c.team_id === match.home_team_id ? ('home' as const) : ('away' as const),
                    playerId: c.player_id,
                    type: c.type,
                    minute: c.minute,
                  })),
                fouls: {
                  home: {
                    h1: fouls.find((f) => f.match_id === match.id && f.team_id === match.home_team_id && f.half === 1)?.count ?? 0,
                    h2: fouls.find((f) => f.match_id === match.id && f.team_id === match.home_team_id && f.half === 2)?.count ?? 0,
                  },
                  away: {
                    h1: fouls.find((f) => f.match_id === match.id && f.team_id === match.away_team_id && f.half === 1)?.count ?? 0,
                    h2: fouls.find((f) => f.match_id === match.id && f.team_id === match.away_team_id && f.half === 2)?.count ?? 0,
                  },
                },
                home_gr: match.home_gr_id,
                away_gr: match.away_gr_id,
                home_shootout: match.home_shootout,
                away_shootout: match.away_shootout,
              }
            : undefined
        }
      />
    </div>
  );
}
