import { hasDatabase } from '@/lib/db';
import { getPublicData } from '@/lib/queries';
import PublicNav, { PublicFooter } from '@/components/PublicNav';
import SetupScreen from '@/components/SetupScreen';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Estatísticas' };

export default async function EstatisticasPage() {
  if (!hasDatabase()) return <SetupScreen />;
  const data = await getPublicData();

  return (
    <div className="min-h-screen">
      <PublicNav />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-extrabold">Estatísticas</h1>
        <p className="mb-6 text-sm text-slate-500">Melhor marcador, guarda-redes menos batidos e faltas.</p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* MELHOR MARCADOR */}
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h2 className="font-bold">⚽ Melhor marcador</h2>
            </div>
            {data.topScorers.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Ainda sem golos registados.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="th w-10">Pos</th>
                    <th className="th">Jogador</th>
                    <th className="th">Equipa</th>
                    <th className="th text-center">GP</th>
                    <th className="th text-center">Golos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topScorers.map((s, i) => (
                    <tr key={s.player_id ?? i} className={`border-b border-slate-100 last:border-0 ${i === 0 ? 'bg-pitch-50' : ''}`}>
                      <td className="td">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-pitch-700 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="td font-semibold">{s.name}</td>
                      <td className="td text-slate-500">{s.team}</td>
                      <td className="td text-center">{s.penalties}</td>
                      <td className="td text-center text-base font-black text-pitch-700">{s.goals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* GUARDA-REDES MENOS BATIDOS */}
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h2 className="font-bold">🧤 Guarda-redes menos batidos</h2>
            </div>
            {data.gkStats.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Sem jogos terminados com guarda-redes indicados.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="th w-10">Pos</th>
                    <th className="th">Guarda-redes</th>
                    <th className="th">Equipa</th>
                    <th className="th text-center">J</th>
                    <th className="th text-center">CS</th>
                    <th className="th text-center">Sofridos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.gkStats.map((g, i) => (
                    <tr key={g.gr_id} className={`border-b border-slate-100 last:border-0 ${i === 0 ? 'bg-pitch-50' : ''}`}>
                      <td className="td">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-pitch-700 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="td font-semibold">{g.name}</td>
                      <td className="td text-slate-500">{g.team}</td>
                      <td className="td text-center">{g.jogos}</td>
                      <td className="td text-center">{g.clean}</td>
                      <td className="td text-center text-base font-black text-pitch-700">{g.sofridos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="px-4 py-2 text-[11px] text-slate-400">
              CS = clean sheets (jogos sem sofrer golo) · ordenado por golos sofridos (menor é melhor).
            </p>
          </section>

          {/* CARTÕES */}
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h2 className="font-bold">🟨 Cartões por jogador</h2>
            </div>
            {data.cards.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Ainda sem cartões registados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="th">Jogador</th>
                      <th className="th">Equipa</th>
                      <th className="th text-center">Amarelos</th>
                      <th className="th text-center">Vermelhos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const map = new Map<string, { name: string; team: string; y: number; r: number }>();
                      for (const c of data.cards) {
                        const row = map.get(c.player_id) ?? { name: c.player_name ?? '—', team: c.team_name ?? '—', y: 0, r: 0 };
                        if (c.type === 'yellow') row.y++;
                        else row.r++;
                        map.set(c.player_id, row);
                      }
                      const rows = Array.from(map.entries()).sort(
                        (a, b) => b[1].y - a[1].y || b[1].r - a[1].r || a[1].name.localeCompare(b[1].name)
                      );
                      return rows.map(([id, v]) => (
                        <tr key={id} className="border-b border-slate-100 last:border-0">
                          <td className="td font-semibold">{v.name}</td>
                          <td className="td text-slate-500">{v.team}</td>
                          <td className="td text-center font-bold">{v.y || ''}</td>
                          <td className="td text-center font-bold">{v.r || ''}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* FALTAS */}
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h2 className="font-bold">🚫 Faltas por equipa</h2>
            </div>
            {data.teamFouls.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Ainda sem faltas registadas.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="th w-10">Pos</th>
                    <th className="th">Equipa</th>
                    <th className="th text-center">Faltas totais</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teamFouls.map((t, i) => (
                    <tr key={t.team_id} className="border-b border-slate-100 last:border-0">
                      <td className="td">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                          {i + 1}
                        </span>
                      </td>
                      <td className="td font-semibold">{t.team_name}</td>
                      <td className="td text-center font-black">{t.faltas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
