import { hasDatabase } from '@/lib/db';
import { getChampionship, getMatches, getPlayers, getTeams } from '@/lib/queries';
import SetupScreen from '@/components/SetupScreen';
import TeamsManager from '@/components/admin/TeamsManager';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Equipas' };

export default async function EquipasPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  if (!hasDatabase()) return <SetupScreen />;
  const { e: urlError } = await searchParams;
  const [champ, teams, players, matches] = await Promise.all([
    getChampionship(),
    getTeams(),
    getPlayers(),
    getMatches(),
  ]);
  const finishedByTeam = new Map<string, number>();
  for (const m of matches) {
    if (m.status !== 'terminada') continue;
    if (m.home_team_id) finishedByTeam.set(m.home_team_id, (finishedByTeam.get(m.home_team_id) ?? 0) + 1);
    if (m.away_team_id) finishedByTeam.set(m.away_team_id, (finishedByTeam.get(m.away_team_id) ?? 0) + 1);
  }
  return (
    <TeamsManager
      championship={champ}
      teams={teams}
      players={players}
      finishedByTeam={Array.from(finishedByTeam.entries()).map(([id, n]) => ({ teamId: id, count: n }))}
      initialError={urlError}
    />
  );
}
