import type { Match, Team } from './queries';

export interface StandingsRow {
  teamId: string;
  name: string;
  shortName: string;
  city: string | null;
  P: number; // jogos
  W: number; // vitórias
  D: number; // empates
  L: number; // derrotas
  GF: number; // golos marcados
  GA: number; // golos sofridos
  GD: number; // diferença
  Pts: number;
  last4?: boolean; // destaque para apuramento (quando aplicável)
}

/**
 * Classificação por pontos.
 * Critérios de desempate: pontos -> diferença de golos -> golos marcados -> vitórias -> nome.
 */
export function computeStandings(
  teams: Team[],
  finishedMatches: Match[],
  points: { win: number; draw: number }
): StandingsRow[] {
  const map = new Map<string, StandingsRow>();
  for (const t of teams) {
    map.set(t.id, {
      teamId: t.id,
      name: t.name,
      shortName: t.short_name || t.name.slice(0, 3).toUpperCase(),
      city: t.city,
      P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0,
    });
  }

  for (const m of finishedMatches) {
    if (m.status !== 'terminada') continue;
    const home = m.home_team_id ? map.get(m.home_team_id) : undefined;
    const away = m.away_team_id ? map.get(m.away_team_id) : undefined;
    if (!home || !away) continue;
    const hg = m.home_goals ?? 0;
    const ag = m.away_goals ?? 0;
    home.P++; away.P++;
    home.GF += hg; home.GA += ag;
    away.GF += ag; away.GA += hg;
    if (hg > ag) {
      home.W++; away.L++;
      home.Pts += points.win;
    } else if (hg < ag) {
      away.W++; home.L++;
      away.Pts += points.win;
    } else {
      home.D++; away.D++;
      home.Pts += points.draw;
      away.Pts += points.draw;
    }
  }

  const rows = Array.from(map.values());
  for (const r of rows) r.GD = r.GF - r.GA;

  rows.sort((a, b) =>
    b.Pts - a.Pts ||
    b.GD - a.GD ||
    b.GF - a.GF ||
    b.W - a.W ||
    a.name.localeCompare(b.name, 'pt')
  );

  return rows;
}
