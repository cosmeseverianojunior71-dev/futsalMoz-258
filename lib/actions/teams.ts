'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ensureSchema, getSql, hasDatabase } from '../db';
import { getChampionship, getTeams } from '../queries';

function fail(msg: string) {
  return { ok: false, error: msg };
}

export async function addTeam(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();
  const champ = await getChampionship();
  if (!champ) return fail('Configure primeiro o campeonato.');

  const name = String(formData.get('name') ?? '').trim();
  const shortName = String(formData.get('short_name') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();
  const coach = String(formData.get('coach') ?? '').trim();

  if (name.length < 2) return fail('Indique o nome da equipa.');

  const teams = await getTeams();
  if (teams.length >= champ.num_teams) {
    return fail(`Limite de ${champ.num_teams} equipas atingido (altere o número de equipas na Configuração).`);
  }
  if (teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
    return fail('Já existe uma equipa com este nome.');
  }

  await sql`
    INSERT INTO teams (championship_id, name, short_name, city, coach)
    VALUES (${champ.id}, ${name}, ${shortName || null}, ${city || null}, ${coach || null})
  `;
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function updateTeam(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();

  const id = String(formData.get('teamId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const shortName = String(formData.get('short_name') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();
  const coach = String(formData.get('coach') ?? '').trim();
  if (!id || name.length < 2) return fail('Indique o nome da equipa.');

  await sql`
    UPDATE teams SET name = ${name}, short_name = ${shortName || null}, city = ${city || null}, coach = ${coach || null}
    WHERE id = ${id}
  `;
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteTeam(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();
  const id = String(formData.get('teamId') ?? '');
  if (!id) return fail('Equipa inválida.');

  // impede remover equipas com resultados registados
  const withResults = await sql`
    SELECT count(*)::int AS n FROM matches
    WHERE status = 'terminada' AND (home_team_id = ${id} OR away_team_id = ${id})
  `;
  if (Number(withResults[0].n) > 0) {
    return fail('Esta equipa já tem resultados registados e não pode ser removida.');
  }

  await sql`DELETE FROM teams WHERE id = ${id}`;
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---------- Jogadores ----------

export async function addPlayer(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();

  const teamId = String(formData.get('teamId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const numberRaw = String(formData.get('number') ?? '').trim();
  const position = String(formData.get('position') ?? 'CAMPO') === 'GR' ? 'GR' : 'CAMPO';

  if (!teamId) return fail('Equipa inválida.');
  if (name.length < 2) return fail('Indique o nome do jogador.');
  const number = numberRaw === '' ? null : Number(numberRaw);
  if (number !== null && (!Number.isInteger(number) || number < 1 || number > 99)) {
    return fail('O dorsal deve ser um número entre 1 e 99.');
  }

  const dup = await sql`
    SELECT 1 FROM players WHERE team_id = ${teamId} AND number = ${number} AND number IS NOT NULL
  `;
  if (dup.length > 0) return fail('Já existe um jogador com este dorsal nesta equipa.');

  await sql`INSERT INTO players (team_id, name, number, position) VALUES (${teamId}, ${name}, ${number}, ${position})`;
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deletePlayer(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();
  const id = String(formData.get('playerId') ?? '');
  if (!id) return fail('Jogador inválido.');
  await sql`DELETE FROM players WHERE id = ${id}`;
  revalidatePath('/', 'layout');
  return { ok: true };
}


// ---------- Form actions (progressive enhancement / sem JS) ----------

export async function addTeamFormAction(fd: FormData): Promise<void> {
  const r = await addTeam(fd);
  if (r && !r.ok) redirect(`/admin/equipas?e=${encodeURIComponent(r.error ?? 'Erro')}`);
}

// form actions puros (sem JS): executam a ação e re-renderizam a página
export async function updateTeamFormAction(fd: FormData): Promise<void> {
  await updateTeam(fd);
}
export async function deleteTeamFormAction(fd: FormData): Promise<void> {
  await deleteTeam(fd);
}
export async function addPlayerFormAction(fd: FormData): Promise<void> {
  await addPlayer(fd);
}
export async function deletePlayerFormAction(fd: FormData): Promise<void> {
  await deletePlayer(fd);
}
