'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSession, destroySession, hashPassword, verifyPassword } from '../auth';
import { countUsers } from '../user-count';
import { ensureSchema, getSql, hasDatabase } from '../db';

function fail(msg: string) {
  return { ok: false, error: msg };
}

/**
 * Criação do Administrador Sénior — apenas disponível enquanto não existir
 * nenhum utilizador na base de dados.
 */
export async function createSeniorAdmin(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();

  if ((await countUsers()) > 0) {
    return fail('Já existe um administrador sénior. Utilize o login.');
  }

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (name.length < 2) return fail('Indique o nome completo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Indique um email válido.');
  if (password.length < 6) return fail('A palavra-passe deve ter pelo menos 6 caracteres.');

  await sql`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES (${name}, ${email}, ${hashPassword(password)}, 'senior', 'active')
  `;

  const rows = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  await createSession(String(rows[0].id));
  revalidatePath('/', 'layout');
  redirect('/admin');
}

/** Login de administradores (sénior ou aprovados). */
export async function login(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return fail('Preencha o email e a palavra-passe.');

  const rows = await sql`SELECT id, password_hash, status, role FROM users WHERE email = ${email} LIMIT 1`;
  if (rows.length === 0) return fail('Email ou palavra-passe incorretos.');

  const user = rows[0];
  if (!verifyPassword(password, String(user.password_hash))) {
    return fail('Email ou palavra-passe incorretos.');
  }

  const status = String(user.status);
  if (status === 'pending') return fail('Conta pendente: aguarde a aprovação do Administrador Sénior.');
  if (status === 'rejected') return fail('Esta conta de administrador foi recusada.');

  await createSession(String(user.id));
  revalidatePath('/', 'layout');
  redirect('/admin');
}

// ---------- Form actions (progressive enhancement) ----------
// Usadas como action do <form> para que, sem JavaScript, a submissão
// funcione via POST direto. Os erros são devolvidos por redirect.

export async function seniorFormAction(fd: FormData): Promise<void> {
  const r = await createSeniorAdmin(fd);
  if (r && !r.ok) redirect(`/login?e=${encodeURIComponent(r.error ?? 'Erro')}`);
}

export async function loginFormAction(fd: FormData): Promise<void> {
  const r = await login(fd);
  if (r && !r.ok) redirect(`/login?e=${encodeURIComponent(r.error ?? 'Erro')}`);
}

export async function requestFormAction(fd: FormData): Promise<void> {
  const r = await requestAdminAccount(fd);
  if (r && !r.ok) redirect(`/login?tab=pedir&e=${encodeURIComponent(r.error ?? 'Erro')}`);
}

export async function logout(): Promise<void> {
  await destroySession();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/** Pedidos de conta de administrador (ficam pendentes até aprovação do sénior). */
export async function requestAdminAccount(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!hasDatabase()) return fail('DATABASE_URL não configurada.');
  await ensureSchema();
  const sql = getSql();

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (name.length < 2) return fail('Indique o nome completo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Indique um email válido.');
  if (password.length < 6) return fail('A palavra-passe deve ter pelo menos 6 caracteres.');

  const existing = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (existing.length > 0) return fail('Já existe uma conta com este email.');

  await sql`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES (${name}, ${email}, ${hashPassword(password)}, 'admin', 'pending')
  `;
  return { ok: true };
}
