'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser, hashPassword } from '../auth';
import { ensureSchema, getSql, hasDatabase } from '../db';

async function requireSenior() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Não autenticado');
  if (user.role !== 'senior') throw new Error('Apenas o Administrador Sénior pode gerir utilizadores.');
  return user;
}

export async function approveUser(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return { ok: false, error: 'DATABASE_URL não configurada.' };
  const senior = await requireSenior();
  const sql = getSql();
  const id = String(formData.get('userId') ?? '');
  await sql`UPDATE users SET status = 'active' WHERE id = ${id} AND role = 'admin' AND id <> ${senior.id}`;
  revalidatePath('/admin/usuarios');
  return { ok: true };
}

export async function rejectUser(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return { ok: false, error: 'DATABASE_URL não configurada.' };
  const senior = await requireSenior();
  const sql = getSql();
  const id = String(formData.get('userId') ?? '');
  await sql`UPDATE users SET status = 'rejected' WHERE id = ${id} AND role = 'admin' AND id <> ${senior.id}`;
  revalidatePath('/admin/usuarios');
  return { ok: true };
}

export async function deleteUser(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return { ok: false, error: 'DATABASE_URL não configurada.' };
  const senior = await requireSenior();
  const sql = getSql();
  const id = String(formData.get('userId') ?? '');
  await sql`DELETE FROM users WHERE id = ${id} AND role = 'admin' AND id <> ${senior.id}`;
  revalidatePath('/admin/usuarios');
  return { ok: true };
}

/** O sénior pode também criar contas de administrador diretamente (já ativas). */
export async function createAdmin(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return { ok: false, error: 'DATABASE_URL não configurada.' };
  const senior = await requireSenior();
  const sql = getSql();

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (name.length < 2) return { ok: false, error: 'Indique o nome completo.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Indique um email válido.' };
  if (password.length < 6) return { ok: false, error: 'A palavra-passe deve ter pelo menos 6 caracteres.' };

  const existing = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (existing.length > 0) return { ok: false, error: 'Já existe uma conta com este email.' };

  await sql`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES (${name}, ${email}, ${hashPassword(password)}, 'admin', 'active')
  `;
  revalidatePath('/admin/usuarios');
  return { ok: true };
}


// ---------- Form actions (progressive enhancement / sem JS) ----------

export async function createAdminFormAction(fd: FormData): Promise<void> {
  const r = await createAdmin(fd);
  if (r && !r.ok) redirect(`/admin/usuarios?e=${encodeURIComponent(r.error ?? 'Erro')}`);
}

export async function approveFormAction(fd: FormData): Promise<void> {
  await approveUser(fd);
}
export async function rejectFormAction(fd: FormData): Promise<void> {
  await rejectUser(fd);
}
export async function deleteUserFormAction(fd: FormData): Promise<void> {
  await deleteUser(fd);
}
