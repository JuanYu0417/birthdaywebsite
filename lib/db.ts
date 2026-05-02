import { createClient, type Client } from '@libsql/client';

let cached: Client | null = null;

export function getDb(): Client {
  if (cached) return cached;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL is not set. Add it in Vercel → Project → Settings → Environment Variables.',
    );
  }

  cached = createClient({ url, authToken });
  return cached;
}
