import { createClient, type Client } from '@libsql/client';

let cached: Client | null = null;
let schemaReady: Promise<void> | null = null;

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    attending TEXT NOT NULL,
    bias TEXT,
    allergies TEXT,
    notes TEXT,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

export function getDb(): Client {
  if (cached) return cached;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL is not set. Add it in Vercel → Project → Settings → Environment Variables (and redeploy).',
    );
  }

  
  const isRemote = url.startsWith('libsql://') || url.startsWith('https://') || url.startsWith('wss://');
  if (isRemote && !authToken) {
    throw new Error(
      'TURSO_AUTH_TOKEN is not set. A remote Turso database needs an auth token. Add it in Vercel → Project → Settings → Environment Variables (and redeploy).',
    );
  }

  cached = createClient({ url, authToken });
  return cached;
}

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const db = getDb();
    schemaReady = db.execute(SCHEMA_SQL).then(() => undefined).catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}
