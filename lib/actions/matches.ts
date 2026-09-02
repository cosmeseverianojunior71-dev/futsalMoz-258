'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ensureSchema, getSql, hasDatabase } from '../db';
import { localInputToUtcIso } from '../format';
import {
  byeAdvance,
  knockoutDraw,
  roundRobin,
  roundNameForSize,
  winnerAdvance,
} from '../schedule';
import { getChampionship, getMatches, getStandings, getTeams } from '../queries';

function fail(msg: string) {
  return { ok: false, error: msg };
}

/** Converte 'YYYY-MM-DD' (ou ISO) para Date à meia-noite UTC. */
function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface ReportGoal {
  team: 'home' | 'away';
  playerId: string;
  minute: number | null;
  penalty: boolean;
}
interface ReportCard {
  team: 'home' | 'away';
  playerId: string;
  type: 'yellow' | 'red';
  minute: number | null;
}

/**
 * Gera o calendário do campeonato.
 * - liga_1 / liga_2: round-robin com datas automáticas (semanais a partir da data de início);
 * - eliminataria: sorteo de eliminatória com folgas para as melhores posições de seed;
 * - liga_final: apenas a fase regular (a eliminatória é gerada à parte, com as melhores classificadas).
 * Remove apenas partidas ainda agendadas (resultados registados são preservados).
 */
export async function generateSchedule(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();

  const champ = await getChampionship();
  if (!champ) return fail('Configure primeiro o campeonato.');
  const teams = await getTeams();
  if (teams.length < 2) return fail('Inscriza pelo menos 2 equipas.');
  if (teams.length !== champ.num_teams) {
    return fail(
      `O campeonato foi configurado para ${champ.num_teams} equipas mas existem ${teams.length} inscritas. Alinhe os números antes de gerar o calendário.`
    );
  }

  // preserva resultados já registados
  await sql`DELETE FROM matches WHERE status = 'agendada'`;

  const teamIds = teams.map((t) => t.id);
  const start = parseDateOnly(champ.start_date);
  const defaultTime = champ.default_time || '15:00';
  const [hh, mm] = defaultTime.split(':').map(Number);

  const autoDateTime = (weekIndex: number): string | null => {
    if (!start) return null;
    const d = new Date(start.getTime() + weekIndex * 7 * 24 * 3600 * 1000);
    const iso = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) +
        (hh || 0) * 3600 * 1000 +
        (mm || 0) * 60 * 1000 -
        2 * 3600 * 1000 // converter hora de Maputo (UTC+2) para UTC
    ).toISOString();
    return iso;
  };

  if (champ.format === 'liga_1' || champ.format === 'liga_2' || champ.format === 'liga_final') {
    const double = champ.format === 'liga_2';
    const jornadas = roundRobin(teamIds, double);
    for (let r = 0; r < jornadas.length; r++) {
      const dt = autoDateTime(r);
      for (let i = 0; i < jornadas[r].length; i++) {
        const [home, away] = jornadas[r][i];
        await sql`
          INSERT INTO matches
            (championship_id, round_label, round_order, seq, stage, home_team_id, away_team_id, datetime, venue)
          VALUES
            (${champ.id}, ${`Jornada ${r + 1}`}, ${r + 1}, ${i}, 'regular', ${home}, ${away}, ${dt}, ${champ.default_venue || null})
        `;
      }
    }
  } else if (champ.format === 'eliminataria') {
    const rounds = knockoutDraw(teamIds);
    // insere todas as rondas (1.ª com as equipas definidas)
    for (const round of rounds) {
      for (let i = 0; i < round.pairs.length; i++) {
        const [home, away] = round.pairs[i];
        await sql`
          INSERT INTO matches
            (championship_id, round_label, round_order, seq, stage, home_team_id, away_team_id, venue)
          VALUES
            (${champ.id}, ${round.label}, ${round.roundOrder}, ${i}, 'eliminataria', ${home || null}, ${away || null}, ${champ.default_venue || null})
        `;
      }
    }
    // aplica as folgas (byes) da 1.ª ronda às equipas da 2.ª ronda
    if (rounds.length > 1) {
      for (let i = 0; i < rounds[0].pairs.length; i++) {
        const [home, away] = rounds[0].pairs[i];
        const byeTeam = home && !away ? home : !home && away ? away : null;
        if (!byeTeam) continue;
        const adv = byeAdvance(1, i, byeTeam);
        const col = adv.side === 'home' ? 'home_team_id' : 'away_team_id';
        // usa unsafe para escolher a coluna dinamicamente
        await sql.unsafe(
          `UPDATE matches SET ${col} = $1
           WHERE championship_id = $2 AND round_order = $3 AND seq = $4`,
          [adv.teamId, champ.id, adv.nextRoundOrder, adv.nextIdx]
        );
      }
    }
  } else {
    return fail('Formato inválido.');
  }

  await sql`UPDATE championship SET status = 'ativo', updated_at = now() WHERE id = ${champ.id}`;
  revalidatePath('/', 'layout');
  return { ok: true };
}

/**
 * Gera a fase eliminatória final do formato "Liga + Fase eliminatória",
 * com as melhores classificadas da fase regular.
 */
export async function generateFinalKnockout(): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();

  const champ = await getChampionship();
  if (!champ) return fail('Configure primeiro o campeonato.');
  if (champ.format !== 'liga_final') return fail('Esta opção é exclusiva do formato "Liga + Fase eliminatória".');

  const matches = await getMatches();
  const regular = matches.filter((m) => m.stage === 'regular');
  if (regular.length === 0) return fail('Gere primeiro a fase regular.');
  const pending = regular.filter((m) => m.status === 'agendada');
  if (pending.length > 0) return fail(`Existem ${pending.length} partidas da fase regular por terminar.`);

  const existingKnock = matches.filter((m) => m.stage === 'eliminataria');
  if (existingKnock.some((m) => m.status === 'terminada')) {
    return fail('Já existem resultados na eliminatória — não é possível regenerar.');
  }

  const { rows: standings } = await getStandings();
  const slotCount = champ.num_teams >= 8 ? 8 : 4;
  if (standings.length < 4) return fail('São necessárias pelo menos 4 equipas para a eliminatória.');
  const top = standings.slice(0, Math.min(slotCount, standings.length));
  if (top.length % 2 !== 0) top.pop();

  const baseRound = regular.length; // rondas seguintes à fase regular
  const rounds = knockoutDraw(top.map((r) => r.teamId));

  await sql`DELETE FROM matches WHERE stage = 'eliminataria'`;
  for (const round of rounds) {
    for (let i = 0; i < round.pairs.length; i++) {
      const [home, away] = round.pairs[i];
      await sql`
        INSERT INTO matches
          (championship_id, round_label, round_order, seq, stage, home_team_id, away_team_id, venue)
        VALUES
          (${champ.id}, ${round.label}, ${baseRound + round.roundOrder}, ${i}, 'eliminataria', ${home || null}, ${away || null}, ${champ.default_venue || null})
      `;
    }
  }
  if (rounds.length > 1) {
    for (let i = 0; i < rounds[0].pairs.length; i++) {
      const [home, away] = rounds[0].pairs[i];
      const byeTeam = home && !away ? home : !home && away ? away : null;
      if (!byeTeam) continue;
      const adv = byeAdvance(1, i, byeTeam);
      const col = adv.side === 'home' ? 'home_team_id' : 'away_team_id';
      await sql.unsafe(
        `UPDATE matches SET ${col} = $1
         WHERE championship_id = $2 AND round_order = $3 AND seq = $4`,
        [adv.teamId, champ.id, baseRound + adv.nextRoundOrder, adv.nextIdx]
      );
    }
  }

  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Edita data, hora e local de uma partida agendada. */
export async function updateMatch(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();

  const id = String(formData.get('matchId') ?? '');
  const date = String(formData.get('date') ?? '');
  const time = String(formData.get('time') ?? '');
  const venue = String(formData.get('venue') ?? '').trim();
  if (!id) return fail('Partida inválida.');

  const dt = localInputToUtcIso(date, time);
  if (date && (!dt || time === '')) return fail('Indique data e hora válidas.');

  const rows = await sql`UPDATE matches SET datetime = ${dt}, venue = ${venue || null}, updated_at = now()
    WHERE id = ${id} AND status = 'agendada' RETURNING id`;
  if (rows.length === 0) return fail('Partida não encontrada ou já com resultado registado.');

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteMatch(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();
  const id = String(formData.get('matchId') ?? '');
  const rows = await sql`DELETE FROM matches WHERE id = ${id} AND status = 'agendada' RETURNING id`;
  if (rows.length === 0) return fail('Partida não encontrada ou já com resultado registado.');
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Form action (progressive enhancement) do relatório de partida. */
export async function matchReportFormAction(fd: FormData): Promise<void> {
  await saveMatchReport(fd);
}

/**
 * Regista o relatório de uma partida: golo a golo, cartões, faltas por tempo,
 * guarda-redes, grande penalidade (eliminatória) e vencedor.
 * Atualiza a classificação e controla as suspensões automaticamente.
 */
export async function saveMatchReport(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();

  const matchId = String(formData.get('matchId') ?? '');
  const mRows = await sql`SELECT * FROM matches WHERE id = ${matchId}`;
  if (mRows.length === 0) return fail('Partida não encontrada.');
  const m = mRows[0];
  if (!m.home_team_id || !m.away_team_id) return fail('Ambas as equipas devem estar definidas antes de registar o resultado.');
  const homeId = String(m.home_team_id);
  const awayId = String(m.away_team_id);

  // ---- parsing ----
  let goals: ReportGoal[] = [];
  let cards: ReportCard[] = [];
  let fouls: { home: { h1: number; h2: number }; away: { h1: number; h2: number } } = {
    home: { h1: 0, h2: 0 },
    away: { h1: 0, h2: 0 },
  };
  let shootout: { home: number | null; away: number | null } = { home: null, away: null };
  try {
    const gRaw = String(formData.get('goals_json') ?? '[]');
    goals = JSON.parse(gRaw) as ReportGoal[];
  } catch {
    return fail('Dados de golos inválidos.');
  }
  try {
    const cRaw = String(formData.get('cards_json') ?? '[]');
    cards = JSON.parse(cRaw) as ReportCard[];
  } catch {
    return fail('Dados de cartões inválidos.');
  }
  try {
    const fRaw = String(formData.get('fouls_json') ?? '');
    if (fRaw) fouls = JSON.parse(fRaw);
  } catch {
    /* faltas opcionais */
  }
  const homeGrId = String(formData.get('home_gr') ?? '') || null;
  const awayGrId = String(formData.get('away_gr') ?? '') || null;
  let winnerId = String(formData.get('winner') ?? '') || null;
  if (String(m.stage) === 'eliminataria') {
    try {
      const sRaw = String(formData.get('shootout_json') ?? '');
      if (sRaw) shootout = JSON.parse(sRaw);
    } catch {
      /* opcional */
    }
  }

  // ---- validação: jogadores pertencentes à equipa correta ----
  const playerTeam = new Map<string, string>();
  const playerRows = await sql`SELECT id, team_id FROM players`;
  for (const p of playerRows) playerTeam.set(String(p.id), String(p.team_id));

  for (const g of goals) {
    if (g.team !== 'home' && g.team !== 'away') return fail('Golo com lado inválido.');
    const teamId = g.team === 'home' ? homeId : awayId;
    if (g.playerId && playerTeam.get(g.playerId) !== teamId) {
      return fail('Um dos golos foi atribuído a um jogador de outra equipa.');
    }
    if (g.minute !== null && (!Number.isInteger(g.minute) || g.minute < 0 || g.minute > 180)) {
      return fail('Minuto de golo inválido.');
    }
  }
  for (const c of cards) {
    if (c.type !== 'yellow' && c.type !== 'red') return fail('Cartão inválido.');
    const teamId = c.team === 'home' ? homeId : awayId;
    if (!c.playerId) return fail('Indique o jogador de cada cartão.');
    if (playerTeam.get(c.playerId) !== teamId) {
      return fail('Um dos cartões foi atribuído a um jogador de outra equipa.');
    }
  }
  for (const side of ['home', 'away'] as const) {
    const f = fouls[side];
    for (const half of ['h1', 'h2'] as const) {
      const v = Number(f?.[half] ?? 0);
      if (!Number.isInteger(v) || v < 0 || v > 99) return fail('Faltas inválidas.');
      if (f?.[half] !== undefined) f[half] = v;
    }
  }

  const homeGoals = goals.filter((g) => g.team === 'home').length;
  const awayGoals = goals.filter((g) => g.team === 'away').length;

  // ---- eliminatória: determinar o vencedor ----
  if (String(m.stage) === 'eliminataria') {
    if (homeGoals !== awayGoals) {
      winnerId = homeGoals > awayGoals ? homeId : awayId;
    } else {
      const sh = Number(shootout.home ?? -1);
      const sa = Number(shootout.away ?? -1);
      if (sh >= 0 && sa >= 0 && sh !== sa) winnerId = sh > sa ? homeId : awayId;
      else if (!winnerId || (winnerId !== homeId && winnerId !== awayId)) {
        return fail('Empate na eliminatória: indique o marcador da grande penalidade ou o vencedor.');
      }
    }
  }

  // ---- gravação (transação) ----
  await sql.begin(async (tx: any) => {
    await tx`
      UPDATE matches SET
        status = 'terminada', home_goals = ${homeGoals}, away_goals = ${awayGoals},
        home_gr_id = ${homeGrId}, away_gr_id = ${awayGrId},
        winner_team_id = ${winnerId},
        home_shootout = ${shootout.home ?? null}, away_shootout = ${shootout.away ?? null},
        updated_at = now()
      WHERE id = ${matchId}
    `;
    await tx`DELETE FROM goals WHERE match_id = ${matchId}`;
    await tx`DELETE FROM cards WHERE match_id = ${matchId}`;
    await tx`DELETE FROM match_fouls WHERE match_id = ${matchId}`;

    for (const g of goals) {
      const teamId = g.team === 'home' ? homeId : awayId;
      await tx`
        INSERT INTO goals (match_id, team_id, player_id, minute, is_penalty)
        VALUES (${matchId}, ${teamId}, ${g.playerId || null}, ${g.minute ?? null}, ${Boolean(g.penalty)})
      `;
    }
    for (const c of cards) {
      const teamId = c.team === 'home' ? homeId : awayId;
      await tx`INSERT INTO cards (match_id, team_id, player_id, type, minute) VALUES (${matchId}, ${teamId}, ${c.playerId}, ${c.type}, ${c.minute ?? null})`;
    }
    const foulRows: Array<[string, number, number]> = [
      [homeId, fouls.home.h1, 1],
      [homeId, fouls.home.h2, 2],
      [awayId, fouls.away.h1, 1],
      [awayId, fouls.away.h2, 2],
    ];
    for (const [teamId, count, half] of foulRows) {
      if (count > 0) {
        await tx`
          INSERT INTO match_fouls (match_id, team_id, half, count) VALUES (${matchId}, ${teamId}, ${half}, ${count})
          ON CONFLICT (match_id, team_id, half) DO UPDATE SET count = EXCLUDED.count
        `;
      }
    }

    // ---- avançar vencedor na eliminatória ----
    if (String(m.stage) === 'eliminataria' && winnerId) {
      const adv = winnerAdvance(Number(m.round_order), Number(m.seq));
      const col = adv.side === 'home' ? 'home_team_id' : 'away_team_id';
      await tx.unsafe(
        `UPDATE matches SET ${col} = $1
         WHERE championship_id = $2 AND round_order = $3 AND seq = $4 AND ${col} IS NULL`,
        [winnerId, String(m.championship_id), adv.nextRoundOrder, adv.nextIdx]
      );
    }
  });

  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Reabre uma partida terminada (limpa resultado, cartões, golos e faltas). */
export async function reopenMatch(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();
  const id = String(formData.get('matchId') ?? '');
  const rows = await sql`SELECT * FROM matches WHERE id = ${id}`;
  if (rows.length === 0) return fail('Partida não encontrada.');
  const m = rows[0];

  await sql.begin(async (tx: any) => {
    // desfazer avanço na eliminatória, se o vencedor desta partida ocupava um lugar
    if (String(m.stage) === 'eliminataria' && m.winner_team_id) {
      const adv = winnerAdvance(Number(m.round_order), Number(m.seq));
      const col = adv.side === 'home' ? 'home_team_id' : 'away_team_id';
      await tx.unsafe(
        `UPDATE matches SET ${col} = NULL
         WHERE championship_id = $1 AND round_order = $2 AND seq = $3 AND ${col} = $4`,
        [String(m.championship_id), adv.nextRoundOrder, adv.nextIdx, String(m.winner_team_id)]
      );
    }
    await tx`DELETE FROM goals WHERE match_id = ${id}`;
    await tx`DELETE FROM cards WHERE match_id = ${id}`;
    await tx`DELETE FROM match_fouls WHERE match_id = ${id}`;
    await tx`
      UPDATE matches SET status = 'agendada', home_goals = NULL, away_goals = NULL,
        home_gr_id = NULL, away_gr_id = NULL, winner_team_id = NULL,
        home_shootout = NULL, away_shootout = NULL, updated_at = now()
      WHERE id = ${id}
    `;
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}


// ---------- Form actions (progressive enhancement / sem JS) ----------

export async function generateScheduleFormAction(fd: FormData): Promise<void> {
  const r = await generateSchedule(fd);
  if (r && !r.ok) redirect(`/admin/configuracao?e=${encodeURIComponent(r.error ?? 'Erro')}`);
}

export async function generateFinalKnockoutFormAction(): Promise<void> {
  const r = await generateFinalKnockout();
  if (r && !r.ok) redirect(`/admin/configuracao?e=${encodeURIComponent(r.error ?? 'Erro')}`);
}

export async function updateMatchFormAction(fd: FormData): Promise<void> {
  const r = await updateMatch(fd);
  if (r && !r.ok) redirect(`/admin/calendario?e=${encodeURIComponent(r.error ?? 'Erro')}`);
}
