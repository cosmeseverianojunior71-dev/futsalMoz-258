'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ensureSchema, getSql, hasDatabase } from '../db';
import { getChampionship, getTeams } from '../queries';

const FORMATS = ['liga_1', 'liga_2', 'eliminataria', 'liga_final'];

export async function saveChampionship(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return { ok: false, error: 'DATABASE_URL não configurada.' };
  await ensureSchema();
  const sql = getSql();

  const name = String(formData.get('name') ?? '').trim();
  const season = String(formData.get('season') ?? '').trim();
  const format = String(formData.get('format') ?? 'liga_1');
  const numTeams = Number(formData.get('num_teams') ?? 0);
  const defaultVenue = String(formData.get('default_venue') ?? '').trim();
  const startDate = String(formData.get('start_date') ?? '');
  const defaultTime = String(formData.get('default_time') ?? '15:00');
  const pointsWin = Number(formData.get('points_win') ?? 3);
  const pointsDraw = Number(formData.get('points_draw') ?? 1);

  if (name.length < 3) return { ok: false, error: 'Indique o nome do campeonato (mín. 3 caracteres).' };
  if (!FORMATS.includes(format)) return { ok: false, error: 'Formato inválido.' };
  if (!Number.isInteger(numTeams) || numTeams < 2 || numTeams > 32) {
    return { ok: false, error: 'O número de equipas deve estar entre 2 e 32.' };
  }
  if (format !== 'eliminataria' && numTeams % 2 !== 0) {
    return { ok: false, error: 'Nos formatos de liga o número de equipas deve ser par.' };
  }
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { ok: false, error: 'Data de início inválida.' };

  const existing = await getChampionship();

  // se já existem equipas registadas, o número de equipas não pode mudar
  if (existing) {
    const teams = await getTeams();
    if (teams.length > 0 && teams.length !== numTeams) {
      return {
        ok: false,
        error: `Já existem ${teams.length} equipas inscritas. O número de equipas só pode ser alterado antes da inscrição (ou ao reiniciar o campeonato).`,
      };
    }
  }

  if (existing) {
    await sql`
      UPDATE championship SET
        name = ${name}, season = ${season || null}, format = ${format},
        num_teams = ${numTeams}, default_venue = ${defaultVenue || null},
        start_date = ${startDate || null}, default_time = ${defaultTime || null},
        points_win = ${pointsWin}, points_draw = ${pointsDraw},
        updated_at = now()
      WHERE id = ${existing.id}
    `;
  } else {
    await sql`
      INSERT INTO championship
        (name, season, format, num_teams, default_venue, start_date, default_time, points_win, points_draw, status)
      VALUES
        (${name}, ${season || null}, ${format}, ${numTeams}, ${defaultVenue || null},
         ${startDate || null}, ${defaultTime || null}, ${pointsWin}, ${pointsDraw}, 'config')
    `;
  }

  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Reinicia o campeonato (apaga tudo: equipas, jogadores, partidas, resultados). */
export async function resetChampionship(): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return { ok: false, error: 'DATABASE_URL não configurada.' };
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM matches`;
  await sql`DELETE FROM players`;
  await sql`DELETE FROM teams`;
  await sql`DELETE FROM championship`;
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Marca o campeonato como concluído / ativo. */
export async function setChampionshipStatus(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return { ok: false, error: 'DATABASE_URL não configurada.' };
  await ensureSchema();
  const sql = getSql();
  const status = String(formData.get('status') ?? 'ativo');
  await sql`UPDATE championship SET status = ${status}, updated_at = now() LIMIT 1`;
  revalidatePath('/', 'layout');
  return { ok: true };
}


// ---------- Form actions (progressive enhancement / sem JS) ----------
// Executam a ação e, em caso de erro, devolvem a página com ?e=...

export async function saveChampionshipFormAction(fd: FormData): Promise<void> {
  const r = await saveChampionship(fd);
  if (r && !r.ok) redirect(`/admin/configuracao?e=${encodeURIComponent(r.error ?? 'Erro')}`);
}

export async function statusFormAction(fd: FormData): Promise<void> {
  const r = await setChampionshipStatus(fd);
  if (r && !r.ok) redirect(`/admin/configuracao?e=${encodeURIComponent(r.error ?? 'Erro')}`);
}

export async function resetFormAction(fd: FormData): Promise<void> {
  await resetChampionship();
}
