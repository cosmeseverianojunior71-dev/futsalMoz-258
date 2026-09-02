import Link from 'next/link';
import { hasDatabase } from '@/lib/db';
import { FORMAT_LABELS, getPublicData } from '@/lib/queries';
import { formatDateTime } from '@/lib/format';
import PublicNav, { PublicFooter } from '@/components/PublicNav';
import SetupScreen from '@/components/SetupScreen';
import StandingsTable from '@/components/StandingsTable';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  if (!hasDatabase()) {
    return <SetupScreen />;
  }

  const data = await getPublicData();
  const { championship: champ } = data;

  if (!champ) {
    return (
      <div className="min-h-screen">
        <PublicNav />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="card p-8">
            <p className="mb-2 text-5xl">⚽</p>
            <h1 className="mb-2 text-2xl font-extrabold">Bem-vindo ao FutsalMoz 258</h1>
            <p className="mb-6 text-slate-600">
              O campeonato ainda não foi configurado. O administrador deve criar o campeonato e inscrever as equipas no
              painel de administração.
            </p>
            <Link href="/login" className="btn-primary">
              Entrar como administrador
            </Link>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const finished = data.matches.filter((m) => m.status === 'terminada');
  const scheduled = data.matches
    .filter((m) => m.status === 'agendada')
    .sort((a, b) => (a.datetime ? Date.parse(a.datetime) : Infinity) - (b.datetime ? Date.parse(b.datetime) : Infinity));
  const nextMatches = scheduled.slice(0, 3);

  const lastRound = data.matches.reduce((acc, m) => Math.max(acc, m.round_order), 0);
  const currentJornada = scheduled.length > 0 ? scheduled[0].round_label : `Jornada ${lastRound}`;

  const statusBadge =
    champ.status === 'ativo' ? (
      <span className="badge-green">Em curso</span>
    ) : champ.status === 'concluido' ? (
      <span className="badge-slate">Concluído</span>
    ) : (
      <span className="badge-amber">Em preparação</span>
    );

  return (
    <div className="min-h-screen">
      <PublicNav />

      {/* HERO */}
      <section className="bg-pitch-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{champ.name}</h1>
            {statusBadge}
          </div>
          <p className="mt-2 text-pitch-100/80">
            {champ.season ? `${champ.season} · ` : ''}
            {FORMAT_LABELS[champ.format] ?? champ.format} · {data.teams.length} equipas
          </p>
          {champ.default_venue && <p className="mt-1 text-sm text-pitch-100/60">📍 {champ.default_venue}</p>}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* números */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Equipas', value: data.teams.length, icon: '👕' },
            { label: 'Jogos realizados', value: finished.length, icon: '✅' },
            { label: 'Próximos jogos', value: scheduled.length, icon: '📅' },
            { label: 'Fase atual', value: currentJornada, icon: '🏁' },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-2xl">{s.icon}</p>
              <p className="mt-1 truncate text-lg font-extrabold">{s.value}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* classificação */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-bold">Classificação</h2>
              <Link href="/classificacao" className="text-xs font-semibold text-pitch-700 hover:underline">
                Ver completa →
              </Link>
            </div>
            <StandingsTable rows={data.standings.slice(0, 6)} />
            {data.standings.length > 6 && (
              <div className="border-t border-slate-100 p-2 text-center">
                <Link href="/classificacao" className="text-xs font-semibold text-pitch-700 hover:underline">
                  + {data.standings.length - 6} equipas
                </Link>
              </div>
            )}
          </div>

          {/* próximos jogos */}
          <div className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-bold">Próximos jogos</h2>
              <Link href="/calendario" className="text-xs font-semibold text-pitch-700 hover:underline">
                Calendário →
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {nextMatches.length === 0 && (
                <li className="p-4 text-sm text-slate-500">Sem jogos agendados.</li>
              )}
              {nextMatches.map((m) => (
                <li key={m.id} className="px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {m.round_label} · {formatDateTime(m.datetime)}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {m.home_name ?? '—'} <span className="text-slate-400">×</span> {m.away_name ?? '—'}
                  </p>
                  {m.venue && <p className="text-xs text-slate-500">📍 {m.venue}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* melhor marcador */}
          <div className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-bold">Melhor marcador</h2>
              <Link href="/estatisticas" className="text-xs font-semibold text-pitch-700 hover:underline">
                Mais →
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.topScorers.length === 0 && <li className="p-4 text-sm text-slate-500">Ainda sem golos.</li>}
              {data.topScorers.slice(0, 5).map((s, i) => (
                <li key={s.player_id ?? i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.team}</p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-pitch-700">{s.goals}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* guardas-redes */}
          <div className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-bold">Guarda-redes menos batidos</h2>
              <Link href="/estatisticas" className="text-xs font-semibold text-pitch-700 hover:underline">
                Mais →
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.gkStats.length === 0 && <li className="p-4 text-sm text-slate-500">Sem dados (ainda sem jogos).</li>}
              {data.gkStats.slice(0, 5).map((g, i) => (
                <li key={g.gr_id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{g.name}</p>
                      <p className="text-xs text-slate-500">
                        {g.team} · {g.jogos} jogos · {g.clean} clean sheets
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-pitch-700">{g.sofridos}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* atalhos */}
          <div className="card p-4">
            <h2 className="mb-3 font-bold">Áreas da plataforma</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/classificacao', label: 'Classificação', icon: '🏅' },
                { href: '/calendario', label: 'Calendário', icon: '📅' },
                { href: '/resultados', label: 'Resultados', icon: '📋' },
                { href: '/estatisticas', label: 'Estatísticas', icon: '📈' },
                { href: '/eliminataria', label: 'Eliminatória', icon: '🏆' },
                { href: '/login', label: 'Administração', icon: '🔐' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg border border-slate-200 p-3 text-center text-sm font-semibold text-slate-700 transition hover:border-pitch-600 hover:bg-pitch-50"
                >
                  <span className="mb-1 block text-xl">{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
