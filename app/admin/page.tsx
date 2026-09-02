import Link from 'next/link';
import { hasDatabase } from '@/lib/db';
import { FORMAT_LABELS, getChampionship, getMatches, getPlayers, getStandings, getTeams, getUsers } from '@/lib/queries';
import { formatDateTime } from '@/lib/format';
import SetupScreen from '@/components/SetupScreen';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  if (!hasDatabase()) return <SetupScreen />;

  const [champ, teams, players, matches, users] = await Promise.all([
    getChampionship(),
    getTeams(),
    getPlayers(),
    getMatches(),
    getUsers(),
  ]);
  const { rows: standings } = await getStandings();

  const finished = matches.filter((m) => m.status === 'terminada');
  const scheduled = matches
    .filter((m) => m.status === 'agendada')
    .sort((a, b) => (a.datetime ? Date.parse(a.datetime) : Infinity) - (b.datetime ? Date.parse(b.datetime) : Infinity));
  const pendingUsers = users.filter((u) => u.status === 'pending');

  if (!champ) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-extrabold">Painel</h1>
        <div className="card p-6">
          <p className="mb-4 text-sm text-slate-600">
            Comece por configurar o campeonato (nome, formato, número de equipas) e depois inscreva as equipas.
          </p>
          <Link href="/admin/configuracao" className="btn-primary">
            ⚙️ Configurar campeonato
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { done: true, label: 'Configurar campeonato' },
    { done: teams.length === champ.num_teams, label: `Inscrição de equipas (${teams.length}/${champ.num_teams})` },
    { done: matches.length > 0, label: 'Gerar calendário' },
    { done: finished.length > 0, label: 'Registar resultados' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Painel</h1>
          <p className="text-sm text-slate-500">
            {champ.name} {champ.season ? `· ${champ.season}` : ''} · {FORMAT_LABELS[champ.format]}
          </p>
        </div>
        <Link href="/" className="btn-ghost btn-sm">
          Ver site público ↗
        </Link>
      </div>

      {pendingUsers.length > 0 && (
        <div className="alert-warn">
          <b>{pendingUsers.length}</b> pedido(s) de conta de administrador por aprovar —{' '}
          <Link href="/admin/usuarios" className="font-bold underline">
            rever agora
          </Link>
          .
        </div>
      )}

      {/* progresso */}
      <div className="card mb-6 p-4">
        <p className="card-title mb-3">Estado do campeonato</p>
        <ol className="grid gap-2 sm:grid-cols-4">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span className={s.done ? 'text-pitch-700' : 'text-slate-300'}>{s.done ? '✅' : '⬜'}</span>
              <span className={s.done ? 'font-semibold' : 'text-slate-500'}>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Equipas', value: `${teams.length}/${champ.num_teams}`, href: '/admin/equipas', icon: '👕' },
          { label: 'Jogadores', value: players.length, href: '/admin/equipas', icon: '🎽' },
          { label: 'Jogos agendados', value: scheduled.length, href: '/admin/calendario', icon: '📅' },
          { label: 'Jogos terminados', value: finished.length, href: '/admin/resultados', icon: '✅' },
        ].map((c) => (
          <Link key={c.label} href={c.href} className="card p-4 transition hover:border-pitch-600">
            <p className="text-2xl">{c.icon}</p>
            <p className="mt-1 text-xl font-extrabold">{c.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* próximos jogos */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-bold">Próximas partidas</h2>
            <Link href="/admin/resultados" className="text-xs font-semibold text-pitch-700 hover:underline">
              Anotar resultados →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {scheduled.length === 0 && <li className="p-4 text-sm text-slate-500">Sem partidas agendadas.</li>}
            {scheduled.slice(0, 4).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {m.home_name ?? '—'} × {m.away_name ?? '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {m.round_label} · {formatDateTime(m.datetime)}
                  </p>
                </div>
                <Link href={`/admin/resultados?m=${m.id}`} className="btn-ghost btn-sm shrink-0">
                  Anotar
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* leaders */}
        <div className="card">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-bold">Liderança</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {standings.slice(0, 5).map((r, i) => (
              <li key={r.teamId} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? 'bg-pitch-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm font-semibold">{r.name}</p>
                </div>
                <span className="text-sm font-black text-pitch-700">{r.Pts} pts</span>
              </li>
            ))}
            {standings.length === 0 && <li className="p-4 text-sm text-slate-500">Sem equipas.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
