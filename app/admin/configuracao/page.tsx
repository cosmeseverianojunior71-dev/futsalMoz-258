import { hasDatabase } from '@/lib/db';
import { getChampionship, getMatches, getTeams } from '@/lib/queries';
import { toDateInput } from '@/lib/format';
import SetupScreen from '@/components/SetupScreen';
import ConfigForm from '@/components/admin/ConfigForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Configuração' };

export default async function ConfiguracaoPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  if (!hasDatabase()) return <SetupScreen />;
  const { e: urlError } = await searchParams;
  const [champ, teams, matches] = await Promise.all([getChampionship(), getTeams(), getMatches()]);
  const finishedCount = matches.filter((m) => m.status === 'terminada').length;
  const normalized = champ ? { ...champ, start_date: toDateInput(champ.start_date) } : null;
  return (
    <ConfigForm
      initial={normalized}
      teamsCount={teams.length}
      finishedMatches={finishedCount}
      hasMatches={matches.length > 0}
      initialError={urlError}
    />
  );
}
