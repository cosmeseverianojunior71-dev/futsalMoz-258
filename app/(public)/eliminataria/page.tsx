import { hasDatabase } from '@/lib/db';
import { getPublicData } from '@/lib/queries';
import PublicNav, { PublicFooter } from '@/components/PublicNav';
import SetupScreen from '@/components/SetupScreen';
import Bracket from '@/components/Bracket';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Eliminatória' };

export default async function EliminatariaPage() {
  if (!hasDatabase()) return <SetupScreen />;
  const data = await getPublicData();

  const knockout = data.matches.filter((m) => m.stage === 'eliminataria');
  const champion = knockout
    .filter((m) => m.round_label === 'Final' && m.status === 'terminada')
    .map((m) => m.winner_team_id)
    .find((id) => id != null);
  const championTeam = data.teams.find((t) => t.id === champion);

  return (
    <div className="min-h-screen">
      <PublicNav />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-extrabold">Eliminatória</h1>
        <p className="mb-6 text-sm text-slate-500">Desenho e avançamentos da fase a eliminar.</p>

        {championTeam && (
          <div className="card mb-6 flex items-center gap-4 border-amber-300 bg-gradient-to-r from-amber-50 to-white p-5">
            <span className="text-4xl">🏆</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Campeão</p>
              <p className="text-xl font-black text-slate-900">{championTeam.name}</p>
            </div>
          </div>
        )}

        <div className="card p-4">
          <Bracket matches={knockout} />
        </div>

        {knockout.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">
            A fase eliminatória ainda não foi gerada pelo administrador (formatos “Eliminatória direta” ou “Liga +
            Fase eliminatória”).
          </p>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}
