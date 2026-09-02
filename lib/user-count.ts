// Módulo seguro para o cliente (sem next/headers, sem node:crypto).
import { getSql } from './db';

export async function countUsers(): Promise<number> {
  const sql = getSql();
  const rows = await sql`SELECT count(*)::int AS n FROM users`;
  return Number(rows[0].n);
}
