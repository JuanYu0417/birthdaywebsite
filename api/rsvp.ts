import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../lib/db.js';

interface RsvpInput {
  name?: string;
  phone?: string;
  attending?: string;
  bias?: string;
  allergies?: string;
  notes?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const db = getDb();

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as RsvpInput;

    const name = body.name?.trim() ?? '';
    const phone = body.phone?.trim() ?? '';
    const attending = body.attending?.trim() ?? '';
    const bias = body.bias?.trim() ?? '';
    const allergies = body.allergies?.trim() ?? '';
    const notes = body.notes?.trim() ?? '';

    if (!name || !phone || !attending || !allergies) {
      res.status(400).json({
        ok: false,
        error: 'Missing required fields: name, phone, attending, allergies',
      });
      return;
    }

    const result = await db.execute({
      sql: `INSERT INTO rsvps (name, phone, attending, bias, allergies, notes)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [name, phone, attending, bias, allergies, notes],
    });

    res.status(200).json({ ok: true, id: Number(result.lastInsertRowid ?? 0) });
    return;
  }

  if (req.method === 'GET') {
    const { rows } = await db.execute(
      `SELECT * FROM rsvps ORDER BY datetime(submitted_at) DESC`,
    );
    res.status(200).json({ ok: true, count: rows.length, rsvps: rows });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ ok: false, error: 'Method not allowed' });
}
