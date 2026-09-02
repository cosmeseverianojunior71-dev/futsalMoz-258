import type { Card, Match, Team } from './queries';

export interface SuspensionInfo {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  reason: 'expulsao' | 'tres_amarelos';
}

export interface PlayerCardTotals {
  playerId: string;
  playerName: string;
  teamName: string;
  yellows: number;
  reds: number;
}

function matchTime(m: Match): number {
  return m.datetime ? Date.parse(m.datetime) : Number.MAX_SAFE_INTEGER;
}

/** Ordenação cronológica: data/hora, depois fase, depois ordem dentro da fase. */
function chronologicalSort(a: Match, b: Match): number {
  return matchTime(a) - matchTime(b) || a.round_order - b.round_order || a.seq - b.seq;
}

/**
 * Motor de suspensões automáticas (regras de futsal):
 *  - 2.º cartão amarelo na mesma partida = vermelho (expulsão) -> suspensão na próxima partida;
 *  - cartão vermelho direto -> suspensão na próxima partida;
 *  - 3.º cartão amarelo acumulado (em partidas distintas) -> suspensão na próxima partida;
 *  - após o cumprimento da suspensão, o contador de amarelos volta a zero.
 *
 * @returns mapa matchId -> jogadores suspensos nessa partida
 */
export function computeSuspensions(
  matches: Match[],
  cards: Card[],
  teams: Team[]
): Map<string, SuspensionInfo[]> {
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const teamOfPlayer = new Map<string, string>(); // playerId -> teamId
  const playerName = new Map<string, string>();

  const finished = matches.filter((m) => m.status === 'terminada').sort(chronologicalSort);
  const allOrdered = matches.slice().sort(chronologicalSort);

  const cardsByMatch = new Map<string, Card[]>();
  for (const c of cards) {
    const list = cardsByMatch.get(c.match_id) ?? [];
    list.push(c);
    cardsByMatch.set(c.match_id, list);
    if (c.player_name) {
      playerName.set(c.player_id, c.player_name);
      teamOfPlayer.set(c.player_id, c.team_id);
    }
  }

  const yellows = new Map<string, number>(); // amarelos acumulados por jogador
  const result = new Map<string, SuspensionInfo[]>();

  for (const match of finished) {
    const matchCards = cardsByMatch.get(match.id) ?? [];

    // cartões desta partida por jogador
    const perPlayer = new Map<string, { y: number; r: number }>();
    for (const c of matchCards) {
      const p = perPlayer.get(c.player_id) ?? { y: 0, r: 0 };
      if (c.type === 'yellow') p.y++;
      else p.r++;
      perPlayer.set(c.player_id, p);
    }

    for (const [pid, p] of perPlayer) {
      const teamId = teamOfPlayer.get(pid);
      if (!teamId) continue;
      const ejection = p.r >= 1 || p.y >= 2;
      const threeYellows = !ejection && p.y === 1 && (yellows.get(pid) ?? 0) + 1 === 3;
      if (!ejection && !threeYellows) continue;

      // próxima partida da equipa do jogador
      const curKey = [matchTime(match), match.round_order, match.seq];
      const next = allOrdered.find((m) => {
        if (m.id === match.id) return false;
        const k = [matchTime(m), m.round_order, m.seq];
        if (k[0] === curKey[0] && k[1] === curKey[1] && k[2] === curKey[2]) return false;
        if (k[0] < curKey[0]) return false;
        if (k[0] === curKey[0] && (k[1] < curKey[1] || (k[1] === curKey[1] && k[2] <= curKey[2]))) return false;
        return m.home_team_id === teamId || m.away_team_id === teamId;
      });

      if (next) {
        const list = result.get(next.id) ?? [];
        list.push({
          playerId: pid,
          playerName: playerName.get(pid) ?? 'Jogador',
          teamId,
          teamName: teamName.get(teamId) ?? '—',
          reason: ejection ? 'expulsao' : 'tres_amarelos',
        });
        result.set(next.id, list);
      }
      // reinicia o contador de amarelos após a suspensão
      yellows.set(pid, 0);
    }
  }

  return result;
}

/** Totais de cartões por jogador (para exibição na janela de suspensões). */
export function computePlayerCardTotals(cards: Card[], teams: Team[]): PlayerCardTotals[] {
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const map = new Map<string, PlayerCardTotals>();
  for (const c of cards) {
    const row =
      map.get(c.player_id) ??
      ({
        playerId: c.player_id,
        playerName: c.player_name ?? 'Jogador',
        teamName: teamName.get(c.team_id) ?? '—',
        yellows: 0,
        reds: 0,
      } as PlayerCardTotals);
    if (c.type === 'yellow') row.yellows++;
    else row.reds++;
    map.set(c.player_id, row);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.yellows - a.yellows || b.reds - a.reds || a.playerName.localeCompare(b.playerName)
  );
}
