import { neon } from '@neondatabase/serverless';
import pg from 'pg';
import { SCHEMA_DDL } from './schema';

export type Row = Record<string, any>;

/** Fachada comum: chamada como template tag, unsafe() e begin(). */
export interface Sql {
  (strings: TemplateStringsArray, ...values: any[]): Promise<Row[]>;
  unsafe(query: string, params?: any[]): Promise<Row[]>;
  begin(fn: (tx: Sql) => Promise<void>): Promise<void>;
}

let _sql: Sql | null = null;
let _schemaReady: Promise<void> | null = null;

/** Indica se existe uma base de dados configurada (DATABASE_URL). */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

function taggedQuery(strings: TemplateStringsArray, ...values: any[]): { text: string; values: any[] } {
  let text = '';
  strings.forEach((s, i) => {
    text += s + (i < values.length ? `$${i + 1}` : '');
  });
  return { text, values };
}

function toIso(v: any): any {
  return v instanceof Date ? v.toISOString() : v;
}

/** Em queries com múltiplas instruções, pg devolve um array de resultados. */
function resultRows(res: any): any[] {
  if (Array.isArray(res)) return res.flatMap((r) => r.rows ?? []);
  return res?.rows ?? [];
}

function normRows(rows: any[]): Row[] {
  return rows.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r || {})) o[k] = toIso(v);
    return o;
  });
}

/** URL é do Neon? (usa o driver serverless via HTTP/API) */
function isNeonUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return /(^|\.)neon\.tech$/i.test(host);
  } catch {
    return false;
  }
}

/** Adaptador pg (Postgres via TCP) com a mesma interface — usado em desenvolvimento local. */
function createPgSql(url: string): Sql {
  const pool = new pg.Pool({ connectionString: url, max: 10 });

  async function runPool(client: { query: (t: string, v?: any[]) => Promise<any> }, q: { text: string; values: any[] }): Promise<Row[]> {
    const r = await client.query(q.text, q.values.length ? q.values : undefined);
    return normRows(resultRows(r));
  }

  const fn = async (strings: TemplateStringsArray, ...values: any[]): Promise<Row[]> => {
    return runPool(pool, taggedQuery(strings, ...values));
  };
  (fn as any).unsafe = async (query: string, params?: any[]): Promise<Row[]> => {
    const r = await pool.query(query, params && params.length ? params : undefined);
    return normRows(resultRows(r));
  };
  (fn as any).begin = async (inner: (tx: Sql) => Promise<void>): Promise<void> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txFn = async (strings: TemplateStringsArray, ...values: any[]): Promise<Row[]> =>
        runPool(client, taggedQuery(strings, ...values));
      (txFn as any).unsafe = async (query: string, params?: any[]): Promise<Row[]> => {
        const r = await client.query(query, params && params.length ? params : undefined);
        return normRows(resultRows(r));
      };
      await inner(txFn as unknown as Sql);
      await client.query('COMMIT');
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw e;
    } finally {
      client.release();
    }
  };
  return fn as unknown as Sql;
}

/**
 * Devolve o cliente SQL (singleton por processo).
 * - URL do Neon  -> driver serverless do Neon (Vercel);
 * - outro host   -> pg via TCP (desenvolvimento local / Postgres próprio).
 */
export function getSql(): Sql {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não configurada');
    if (isNeonUrl(url)) {
      _sql = neon(url) as unknown as Sql;
    } else {
      _sql = createPgSql(url);
    }
  }
  return _sql;
}

/**
 * Garante que o esquema existe. Executa o DDL apenas uma vez por processo
 * (todas as instruções usam IF NOT EXISTS, pelo que é seguro).
 */
export async function ensureSchema(): Promise<void> {
  if (_schemaReady) return _schemaReady;
  _schemaReady = (async () => {
    const sql = getSql();
    await sql.unsafe(SCHEMA_DDL);
  })();
  return _schemaReady;
}

/** Testa a ligação e devolve true em caso de sucesso. */
export async function testConnection(): Promise<boolean> {
  try {
    const sql = getSql();
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
