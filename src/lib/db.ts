import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * One shared connection pool per server process. All SQL goes through
 * `query`/`withTransaction` with $1-style parameters — never string-built SQL.
 */
declare global {
  // eslint-disable-next-line no-var
  var __snackPool: Pool | undefined;
}

function getPool(): Pool {
  if (!globalThis.__snackPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    globalThis.__snackPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // Railway's private network (the default DATABASE_URL) doesn't need SSL.
      // Set DATABASE_SSL=true when connecting over a public proxy URL.
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalThis.__snackPool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
