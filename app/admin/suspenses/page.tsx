import { hasDatabase } from '@/lib/db';
import { getCards, getMatches, getPlayers, getSuspensionMap, getTeams } from '@/lib/queries';
import { computePlayerCardTotals } from '@/lib/suspensions';
import { formatDateTime } from '@/lib/format';
import SetupScreen from '@/components/SetupScreen';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Suspensões' };

export default async function SuspensesPage() {
  if (!hasDatabase()) return <SetupScreen />;
  const [matches, cards, teams, players, suspensionMap] = await Promise.all([
    getMatches(),
    getCards(),
    getTeams(),
    getPlayers(),
    getSuspensionMap(),
  ]);

  const scheduled = matches
    .filter((m) => m.status === 'agendada')
    .sort((a, b) => (a.datetime ? Date.parse(a.datetime) : Infinity) - (b.datetime ? Date.parse(b.datetime) : Infinity));

  const totals = computePlayerCardTotals(cards, teams);
  void players;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">Suspensões automáticas</h1>
      <p className="mb-4 text-sm text-slate-500">
        O sistema aplica as suspensões de futsal automaticamente: 2.º amarelo na mesma partida = vermelho
        (expulsão) e suspensão; 1.º vermelho = suspensão; 3.º amarelo acumulado = suspensão. A suspensão é cumprida
        na próxima partida da equipa do jogador.
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: '🟨', label: '2 amarelos = vermelho', desc: 'Expulsão na partida + 1 jogo de suspensão' },
          { icon: '🟥', label: 'Vermelho direto', desc: '1 jogo de suspensão' },
          { icon: '🟨×3', label: '3 amarelos acumulados', desc: '1 jogo de suspensão (contador reinicia)' },
        ].map((r) => (
          <div key={r.label} className="card p-4">
            <p className="text-lg font-bold">{r.icon} {r.label}</p>
            <p className="text-xs text-slate-500">{r.desc}</p>
          </div>
        ))}
      </div>

      <div className="card mb-6 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Suspensões por partida</h2>
        </div>
        {scheduled.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Sem partidas agendadas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {scheduled.map((m) => {
              const sus = suspensionMap.get(m.id) ?? [];
              return (
                <li key={m.id} className="px-4 py-3">
                  <p className="text-sm font-semibold">
                    {m.home_name ?? '—'} × {m.away_name ?? '—'}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {m.round_label} · {formatDateTime(m.datetime)}
                    </span>
                  </p>
                  {sus.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-400">Sem suspensos.</p>
                  ) : (
                    <ul className="mt-1.5 space-y-1">
                      {sus.map((s, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="badge-red">🚫 Suspenso</span>
                          <b>{s.playerName}</b>
                          <span className="text-xs text-slate-500">
                            ({s.teamName}) — {s.reason === 'expulsao' ? 'expulsão / 2.º amarelo' : '3.º cartão amarelo'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Acumulação de cartões</h2>
        </div>
        {totals.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Ainda sem cartões registados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="th">Jogador</th>
                  <th className="th">Equipa</th>
                  <th className="th text-center">Amarelos</th>
                  <th className="th text-center">Vermelhos</th>
                  <th className="th text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((t) => (
                  <tr key={t.playerId} className="border-b border-slate-100 last:border-0">
                    <td className="td font-semibold">{t.playerName}</td>
                    <td className="td text-slate-500">{t.teamName}</td>
                    <td className="td text-center">
                      {t.yellows > 0 ? <span className="font-bold">{'🟨'.repeat(t.yellows)}</span> : '—'}
                    </td>
                    <td className="td text-center">
                      {t.reds > 0 ? <span className="font-bold">{'🟥'.repeat(t.reds)}</span> : '—'}
                    </td>
                    <td className="td text-center text-xs">
                      {t.yellows >= 2 ? (
                        <span className="badge-red">a 1 amarelo de suspensão</span>
                      ) : t.yellows >= 1 ? (
                        <span className="badge-amber">{t.yellows}/3 amarelos</span>
                      ) : t.reds > 0 ? (
                        <span className="badge-amber">com vermelho registado</span>
                      ) : (
                        <span className="text-slate-400">limpo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
