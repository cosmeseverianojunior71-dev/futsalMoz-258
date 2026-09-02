import crypto from 'crypto';
import { cookies } from 'next/headers';
import { ensureSchema, getSql } from './db';

const COOKIE_NAME = 'fm258_session';
const SESSION_DAYS = 7;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'senior' | 'admin';
  status: 'active' | 'pending' | 'rejected';
}

// ---------- Passwords (scrypt, salt por palavra-passe) ----------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hash] = parts;
  try {
    const check = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), check);
  } catch {
    return false;
  }
}

// ---------- Sessões (cookie httpOnly + tabela sessions) ----------

export async function createSession(userId: string): Promise<void> {
  const sql = getSql();
  const token = crypto.randomBytes(32).toString('hex');
  await sql`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, now() + ${SESSION_DAYS} * interval '1 day')
  `;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const sql = getSql();
      await sql`DELETE FROM sessions WHERE token = ${token}`;
    } catch {
      /* base de dados indisponível — apenas remover cookie */
    }
  }
  store.delete(COOKIE_NAME);
}

/** Utilizador autenticado no pedido atual (ou null). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const sql = getSql();
  const rows = await sql`
    SELECT u.id, u.name, u.email, u.role, u.status
    FROM users u
    JOIN sessions s ON s.user_id = u.id
    WHERE s.token = ${token} AND s.expires_at > now()
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    role: r.role as 'senior' | 'admin',
    status: r.status as 'active' | 'pending' | 'rejected',
  };
}


