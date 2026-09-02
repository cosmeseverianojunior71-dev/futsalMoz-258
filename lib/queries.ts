import { ensureSchema, getSql } from './db';
import { computeStandings, type StandingsRow } from './standings';
import { computeSuspensions, type SuspensionInfo } from './suspensions';

export interface Championship {
  id: string;
  name: string;
  season: string | null;
  format: string;
  num_teams: number;
  default_venue: string | null;
  start_date: string | null;
  default_time: string | null;
  points_win: number;
  points_draw: number;
  status: string;
}

export interface Team {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
  coach: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  position: 'GR' | 'CAMPO';
  created_at: string;
}

export interface Match {
  id: string;
  round_label: string;
  round_order: number;
  seq: number;
  stage: 'regular' | 'eliminataria';
  home_team_id: string | null;
  away_team_id: string | null;
  home_name: string | null;
  away_name: string | null;
  home_short: string | null;
  away_short: string | null;
  datetime: string | null;
  venue: string | null;
  status: 'agendada' | 'terminada';
  home_goals: number | null;
  away_goals: number | null;
  home_gr_id: string | null;
  away_gr_id: string | null;
  winner_team_id: string | null;
  home_shootout: number | null;
  away_shootout: number | null;
}

export interface Goal {
  id: string;
  match_id: string;
  team_id: string;
  team_name: string | null;
  player_id: string | null;
  player_name: string | null;
  minute: number | null;
  is_penalty: boolean;
}

export interface Card {
  id: string;
  match_id: string;
  team_id: string;
  team_name: string | null;
  player_id: string;
  player_name: string | null;
  type: 'yellow' | 'red';
  minute: number | null;
}

export interface FoulsRow {
  match_id: string;
  team_id: string;
  half: number;
  count: number;
}

export interface TopScorer {
  player_id: string | null;
  name: string;
  team: string;
  goals: number;
  penalties: number;
}

export interface GkStat {
  gr_id: string;
  name: string;
  team: string;
  jogos: number;
  sofridos: number;
  clean: number;
}

export interface TeamFouls {
  team_id: string;
  team_name: string;
  faltas: number;
}

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  created_at: string;
}

export const FORMAT_LABELS: Record<string, string> = {
  liga_1: 'Liga — 1 volta (todos contra todos)',
  liga_2: 'Liga — 2 voltas (ida e volta)',
  eliminataria: 'Eliminatória direta',
  liga_final: 'Liga + Fase eliminatória (final)',
};

// ---------- Consultas ----------

export async function getChampionship(): Promise<Championship | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM championship LIMIT 1`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: String(r.id),
    name: String(r.name),
    season: r.season ? String(r.season) : null,
    format: String(r.format),
    num_teams: Number(r.num_teams),
    default_venue: r.default_venue ? String(r.default_venue) : null,
    start_date: r.start_date ? String(r.start_date) : null,
    default_time: r.default_time ? String(r.default_time) : null,
    points_win: Number(r.points_win),
    points_draw: Number(r.points_draw),
    status: String(r.status),
  };
}

export async function getTeams(): Promise<Team[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT t.id, t.name, t.short_name, t.city, t.coach, t.created_at
    FROM teams t ORDER BY t.created_at, t.name
  `;
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    short_name: r.short_name ? String(r.short_name) : null,
    city: r.city ? String(r.city) : null,
    coach: r.coach ? String(r.coach) : null,
    created_at: String(r.created_at),
  }));
}

export async function getPlayers(): Promise<Player[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT p.id, p.team_id, p.name, p.number, p.position, p.created_at
    FROM players p ORDER BY p.team_id, p.number, p.name
  `;
  return rows.map((r) => ({
    id: String(r.id),
    team_id: String(r.team_id),
    name: String(r.name),
    number: r.number != null ? Number(r.number) : null,
    position: (r.position as 'GR' | 'CAMPO') || 'CAMPO',
    created_at: String(r.created_at),
  }));
}

export async function getMatches(): Promise<Match[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT m.*,
      th.name AS home_name, th.short_name AS home_short,
      ta.name AS away_name, ta.short_name AS away_short
    FROM matches m
    LEFT JOIN teams th ON th.id = m.home_team_id
    LEFT JOIN teams ta ON ta.id = m.away_team_id
    ORDER BY m.round_order, m.seq, m.datetime
  `;
  return rows.map((r) => ({
    id: String(r.id),
    round_label: String(r.round_label),
    round_order: Number(r.round_order),
    seq: Number(r.seq),
    stage: r.stage as 'regular' | 'eliminataria',
    home_team_id: r.home_team_id ? String(r.home_team_id) : null,
    away_team_id: r.away_team_id ? String(r.away_team_id) : null,
    home_name: r.home_name ? String(r.home_name) : null,
    away_name: r.away_name ? String(r.away_name) : null,
    home_short: r.home_short ? String(r.home_short) : null,
    away_short: r.away_short ? String(r.away_short) : null,
    datetime: r.datetime ? String(r.datetime) : null,
    venue: r.venue ? String(r.venue) : null,
    status: r.status as 'agendada' | 'terminada',
    home_goals: r.home_goals != null ? Number(r.home_goals) : null,
    away_goals: r.away_goals != null ? Number(r.away_goals) : null,
    home_gr_id: r.home_gr_id ? String(r.home_gr_id) : null,
    away_gr_id: r.away_gr_id ? String(r.away_gr_id) : null,
    winner_team_id: r.winner_team_id ? String(r.winner_team_id) : null,
    home_shootout: r.home_shootout != null ? Number(r.home_shootout) : null,
    away_shootout: r.away_shootout != null ? Number(r.away_shootout) : null,
  }));
}

export async function getGoals(matchId?: string): Promise<Goal[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = matchId
    ? await sql`
        SELECT g.*, t.name AS team_name, pl.name AS player_name
        FROM goals g
        LEFT JOIN teams t ON t.id = g.team_id
        LEFT JOIN players pl ON pl.id = g.player_id
        WHERE g.match_id = ${matchId}
        ORDER BY g.minute, g.created_at
      `
    : await sql`
        SELECT g.*, t.name AS team_name, pl.name AS player_name
        FROM goals g
        LEFT JOIN teams t ON t.id = g.team_id
        LEFT JOIN players pl ON pl.id = g.player_id
        ORDER BY g.minute, g.created_at
      `;
  return rows.map((r) => ({
    id: String(r.id),
    match_id: String(r.match_id),
    team_id: String(r.team_id),
    team_name: r.team_name ? String(r.team_name) : null,
    player_id: r.player_id ? String(r.player_id) : null,
    player_name: r.player_name ? String(r.player_name) : null,
    minute: r.minute != null ? Number(r.minute) : null,
    is_penalty: Boolean(r.is_penalty),
  }));
}

export async function getCards(matchId?: string): Promise<Card[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = matchId
    ? await sql`
        SELECT c.*, t.name AS team_name, p.name AS player_name
        FROM cards c
        LEFT JOIN teams t ON t.id = c.team_id
        LEFT JOIN players p ON p.id = c.player_id
        WHERE c.match_id = ${matchId}
        ORDER BY c.minute, c.created_at
      `
    : await sql`
        SELECT c.*, t.name AS team_name, p.name AS player_name
        FROM cards c
        LEFT JOIN teams t ON t.id = c.team_id
        LEFT JOIN players p ON p.id = c.player_id
        ORDER BY c.minute, c.created_at
      `;
  return rows.map((r) => ({
    id: String(r.id),
    match_id: String(r.match_id),
    team_id: String(r.team_id),
    team_name: r.team_name ? String(r.team_name) : null,
    player_id: String(r.player_id),
    player_name: r.player_name ? String(r.player_name) : null,
    type: r.type as 'yellow' | 'red',
    minute: r.minute != null ? Number(r.minute) : null,
  }));
}

export async function getFouls(): Promise<FoulsRow[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT match_id, team_id, half, count FROM match_fouls`;
  return rows.map((r) => ({
    match_id: String(r.match_id),
    team_id: String(r.team_id),
    half: Number(r.half),
    count: Number(r.count),
  }));
}

export async function getStandings(): Promise<{ rows: StandingsRow[]; teams: Team[] }> {
  const [teams, matches, champ] = await Promise.all([getTeams(), getMatches(), getChampionship()]);
  const finished = matches.filter((m) => m.status === 'terminada');
  const points = { win: champ?.points_win ?? 3, draw: champ?.points_draw ?? 1 };
  const rows = computeStandings(teams, finished, points);
  return { rows, teams };
}

export async function getTopScorers(): Promise<TopScorer[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT g.player_id,
           COALESCE(p.name, 'Golo sem autor') AS name,
           COALESCE(t.name, '—') AS team,
           count(*)::int AS goals,
           count(*) FILTER (WHERE g.is_penalty)::int AS penalties
    FROM goals g
    LEFT JOIN players p ON p.id = g.player_id
    LEFT JOIN teams t ON t.id = p.team_id
    GROUP BY g.player_id, p.name, t.name
    ORDER BY goals DESC, name ASC
  `;
  return rows.map((r) => ({
    player_id: r.player_id ? String(r.player_id) : null,
    name: String(r.name),
    team: String(r.team),
    goals: Number(r.goals),
    penalties: Number(r.penalties),
  }));
}

export async function getGkStats(): Promise<GkStat[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT gr.id AS gr_id, gr.name, COALESCE(t.name, '—') AS team,
      count(*)::int AS jogos,
      COALESCE(sum(CASE
        WHEN m.home_gr_id = gr.id THEN COALESCE(m.away_goals, 0)
        WHEN m.away_gr_id = gr.id THEN COALESCE(m.home_goals, 0)
      END), 0)::int AS sofridos,
      count(*) FILTER (
        WHERE CASE
          WHEN m.home_gr_id = gr.id THEN COALESCE(m.away_goals, 0)
          WHEN m.away_gr_id = gr.id THEN COALESCE(m.home_goals, 0)
        END = 0
      )::int AS clean
    FROM players gr
    JOIN teams t ON t.id = gr.team_id
    JOIN matches m ON (m.home_gr_id = gr.id OR m.away_gr_id = gr.id)
    WHERE gr.position = 'GR' AND m.status = 'terminada'
    GROUP BY gr.id, gr.name, t.name
    ORDER BY sofridos ASC, clean DESC, jogos DESC
  `;
  return rows.map((r) => ({
    gr_id: String(r.gr_id),
    name: String(r.name),
    team: String(r.team),
    jogos: Number(r.jogos),
    sofridos: Number(r.sofridos),
    clean: Number(r.clean),
  }));
}

export async function getTeamFouls(): Promise<TeamFouls[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT f.team_id, COALESCE(t.name, '—') AS team_name, sum(f.count)::int AS faltas
    FROM match_fouls f
    LEFT JOIN teams t ON t.id = f.team_id
    GROUP BY f.team_id, t.name
    ORDER BY faltas DESC
  `;
  return rows.map((r) => ({
    team_id: String(r.team_id),
    team_name: String(r.team_name),
    faltas: Number(r.faltas),
  }));
}

export async function getUsers(): Promise<PendingUser[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, email, status, role, created_at
    FROM users ORDER BY created_at DESC
  `;
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    status: String(r.status),
    role: String(r.role),
    created_at: String(r.created_at),
  }));
}

export interface PublicData {
  championship: Championship | null;
  teams: Team[];
  matches: Match[];
  standings: StandingsRow[];
  topScorers: TopScorer[];
  gkStats: GkStat[];
  teamFouls: TeamFouls[];
  goals: Goal[];
  cards: Card[];
}

/** Bundle completo para as páginas públicas (1 pedido por tabela). */
export async function getPublicData(): Promise<PublicData> {
  const [championship, teams, matches, topScorers, gkStats, teamFouls, goals, cards] =
    await Promise.all([
      getChampionship(),
      getTeams(),
      getMatches(),
      getTopScorers(),
      getGkStats(),
      getTeamFouls(),
      getGoals(),
      getCards(),
    ]);
  const { rows } = await getStandings();
  return { championship, teams, matches, standings: rows, topScorers, gkStats, teamFouls, goals, cards };
}

/** Suspensões aplicadas a cada partida (mapa matchId -> lista). */
export async function getSuspensionMap(): Promise<Map<string, SuspensionInfo[]>> {
  const matches = await getMatches();
  const cards = await getCards();
  const teams = await getTeams();
  return computeSuspensions(matches, cards, teams);
}
