import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const id = Number.parseInt(String(req.query.id ?? ''), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ ok: false, error: 'Invalid id' });
    return;
  }

  const db = getDb();
  await db.execute({ sql: `DELETE FROM rsvps WHERE id = ?`, args: [id] });

  res.status(200).json({ ok: true });
}
