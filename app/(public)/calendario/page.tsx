import { hasDatabase } from '@/lib/db';
import { getPublicData, type Match } from '@/lib/queries';
import { formatDateTime, isToday } from '@/lib/format';
import PublicNav, { PublicFooter } from '@/components/PublicNav';
import SetupScreen from '@/components/SetupScreen';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Calendário' };

function MatchRow({ m }: { m: Match }) {
  const done = m.status === 'terminada';
  return (
    <li className={`flex flex-col gap-1 border-b border-slate-100 px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between ${isToday(m.datetime) ? 'bg-pitch-50' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          {m.home_name ?? 'A definir'} <span className="text-slate-400">×</span> {m.away_name ?? 'A definir'}
        </p>
        <p className="text-xs text-slate-500">
          {m.datetime ? `🕒 ${formatDateTime(m.datetime)}` : '🕒 Data a definir'}
          {m.venue ? ` · 📍 ${m.venue}` : ''}
        </p>
      </div>
      {done ? (
        <span className="shrink-0 rounded-lg bg-pitch-700 px-3 py-1 text-sm font-black text-white">
          {m.home_goals} : {m.away_goals}
        </span>
      ) : (
        <span className="badge-slate shrink-0">{isToday(m.datetime) ? 'HOJE' : 'Agendada'}</span>
      )}
    </li>
  );
}

export default async function CalendarioPage() {
  if (!hasDatabase()) return <SetupScreen />;
  const data = await getPublicData();

  const byRound = new Map<number, { label: string; matches: Match[] }>();
  for (const m of data.matches) {
    const entry = byRound.get(m.round_order) ?? { label: m.round_label, matches: [] };
    entry.matches.push(m);
    byRound.set(m.round_order, entry);
  }
  const rounds = Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);

  return (
    <div className="min-h-screen">
      <PublicNav />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-extrabold">Calendário de jogos</h1>
        <p className="mb-6 text-sm text-slate-500">
          Datas, horários (hora de Maputo) e locais de cada partida.
        </p>

        {rounds.length === 0 && (
          <div className="card p-6 text-sm text-slate-500">
            O calendário ainda não foi gerado pelo administrador.
          </div>
        )}

        <div className="space-y-6">
          {rounds.map((r) => (
            <section key={r.label} className="card overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">{r.label}</h2>
              </div>
              <ul>
                {r.matches.map((m) => (
                  <MatchRow key={m.id} m={m} />
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
