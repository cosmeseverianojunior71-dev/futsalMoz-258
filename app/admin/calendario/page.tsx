import { hasDatabase } from '@/lib/db';
import { getChampionship, getMatches, getTeams } from '@/lib/queries';
import { formatDateTime, isoToLocalInput } from '@/lib/format';
import SetupScreen from '@/components/SetupScreen';
import MatchEditForm from '@/components/admin/MatchEditForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Calendário' };

export default async function AdminCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  if (!hasDatabase()) return <SetupScreen />;
  const { e: urlError } = await searchParams;
  const [champ, matches, teams] = await Promise.all([getChampionship(), getMatches(), getTeams()]);

  if (!champ) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-extrabold">Calendário</h1>
        <div className="card p-6 text-sm text-slate-500">Configure primeiro o campeonato.</div>
      </div>
    );
  }

  const byRound = new Map<number, typeof matches>();
  for (const m of matches) {
    const list = byRound.get(m.round_order) ?? [];
    list.push(m);
    byRound.set(m.round_order, list);
  }
  const rounds = Array.from(byRound.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">Calendário</h1>
      <p className="mb-4 text-sm text-slate-500">
        Defina as datas, os horários (hora de Maputo) e os locais de cada partida. As alterações ficam
        imediatamente visíveis no site público.
      </p>
      {urlError && <div className="alert-error mb-4">{urlError}</div>}

      {matches.length === 0 && (
        <div className="card p-6 text-sm text-slate-500">
          Ainda não existe calendário. Inscreva as equipas e gere o calendário na aba Configuração.
        </div>
      )}

      <div className="space-y-6">
        {rounds.map(([, list]) => (
          <section key={list[0].round_order} className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">{list[0].round_label}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {list.map((m) => (
                <div key={m.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {m.home_name ?? 'A definir'} <span className="text-slate-400">×</span> {m.away_name ?? 'A definir'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {m.status === 'terminada' ? (
                        <span className="font-bold text-pitch-700">
                          Terminado {m.home_goals}:{m.away_goals}
                          {m.home_shootout != null ? ` (GP ${m.home_shootout}:${m.away_shootout})` : ''}
                        </span>
                      ) : m.datetime ? (
                        formatDateTime(m.datetime)
                      ) : (
                        'Data a definir'
                      )}
                      {m.venue ? ` · 📍 ${m.venue}` : ' · sem local'}
                    </p>
                  </div>
                  {m.status === 'agendada' ? (
                    <MatchEditForm
                      matchId={m.id}
                      initialDate={isoToLocalInput(m.datetime).date}
                      initialTime={isoToLocalInput(m.datetime).time}
                      initialVenue={m.venue ?? ''}
                      defaultVenue={champ.default_venue ?? ''}
                    />
                  ) : (
                    <span className="badge-slate shrink-0">
                      {teams.length > 0 ? 'Ver no site' : '—'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
