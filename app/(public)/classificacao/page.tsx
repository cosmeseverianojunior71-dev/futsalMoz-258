import { hasDatabase } from '@/lib/db';
import { getPublicData } from '@/lib/queries';
import PublicNav, { PublicFooter } from '@/components/PublicNav';
import SetupScreen from '@/components/SetupScreen';
import StandingsTable from '@/components/StandingsTable';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Classificação' };

export default async function ClassificacaoPage() {
  if (!hasDatabase()) return <SetupScreen />;
  const data = await getPublicData();

  const isLeague = data.championship?.format === 'liga_1' || data.championship?.format === 'liga_2' || data.championship?.format === 'liga_final';
  const highlight = data.championship?.format === 'liga_final' ? (data.championship.num_teams >= 8 ? 8 : 4) : undefined;

  return (
    <div className="min-h-screen">
      <PublicNav />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-extrabold">Classificação</h1>
        {data.championship ? (
          <p className="mb-6 text-sm text-slate-500">
            {data.championship.name} {data.championship.season ? `· ${data.championship.season}` : ''}
          </p>
        ) : (
          <p className="mb-6 text-sm text-slate-500">O campeonato ainda não foi configurado.</p>
        )}

        <div className="card">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="font-bold">
              {isLeague ? 'Fase de pontos' : 'Posição das equipas'}
            </h2>
          </div>
          <StandingsTable rows={data.standings} highlight={highlight} />
        </div>

        {highlight != null && (
          <p className="mt-3 text-xs text-slate-500">
            * As {highlight} primeiras posições apuram-se para a fase eliminatória.
          </p>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Critérios de desempate: pontos → diferença de golos → golos marcados → vitórias → ordem alfabética.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
