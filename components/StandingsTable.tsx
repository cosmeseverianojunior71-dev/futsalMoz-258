import type { StandingsRow } from '@/lib/standings';

/**
 * Janela de classificação.
 * `highlight` opcional: n.º de posições destacadas (ex.: apuramento para a eliminatória).
 */
export default function StandingsTable({
  rows,
  highlight,
}: {
  rows: StandingsRow[];
  highlight?: number;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Ainda não há equipas inscritas.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="th w-10">Pos</th>
            <th className="th">Equipa</th>
            <th className="th text-center">P</th>
            <th className="th text-center">J</th>
            <th className="th text-center">V</th>
            <th className="th text-center">E</th>
            <th className="th text-center">D</th>
            <th className="th text-center">GM</th>
            <th className="th text-center">GS</th>
            <th className="th text-center">DG</th>
            <th className="th text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const pos = i + 1;
            const isLeader = pos === 1;
            const isHighlight = highlight != null && pos <= highlight;
            return (
              <tr
                key={r.teamId}
                className={`border-b border-slate-100 last:border-0 ${
                  isLeader ? 'bg-pitch-50' : isHighlight ? 'bg-pitch-50/40' : ''
                }`}
              >
                <td className="td">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isLeader
                        ? 'bg-pitch-700 text-white'
                        : isHighlight
                          ? 'bg-pitch-200 text-pitch-900'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {pos}
                  </span>
                </td>
                <td className="td font-semibold">
                  {r.name}
                  {r.city ? <span className="ml-1 text-xs font-normal text-slate-400">({r.city})</span> : null}
                </td>
                <td className="td text-center font-bold">{r.Pts}</td>
                <td className="td text-center">{r.P}</td>
                <td className="td text-center">{r.W}</td>
                <td className="td text-center">{r.D}</td>
                <td className="td text-center">{r.L}</td>
                <td className="td text-center">{r.GF}</td>
                <td className="td text-center">{r.GA}</td>
                <td className={`td text-center font-semibold ${r.GD > 0 ? 'text-pitch-700' : r.GD < 0 ? 'text-red-600' : ''}`}>
                  {r.GD > 0 ? `+${r.GD}` : r.GD}
                </td>
                <td className="td text-center font-bold">{r.Pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
