import express, { type Request, type Response } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3001;

// ===== Database setup =====
const db = new Database(path.join(__dirname, 'rsvps.db'));
db.pragma('journal_mode = WAL');

db.exec(`
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
`);

interface RsvpInput {
  name?: string;
  phone?: string;
  attending?: string;
  bias?: string;
  allergies?: string;
  notes?: string;
}

interface RsvpRow {
  id: number;
  name: string;
  phone: string;
  attending: string;
  bias: string | null;
  allergies: string | null;
  notes: string | null;
  submitted_at: string;
}

const insertRsvp = db.prepare(`
  INSERT INTO rsvps (name, phone, attending, bias, allergies, notes)
  VALUES (@name, @phone, @attending, @bias, @allergies, @notes)
`);

const selectAllRsvps = db.prepare<[], RsvpRow>(
  `SELECT * FROM rsvps ORDER BY datetime(submitted_at) DESC`,
);

const deleteRsvpById = db.prepare(`DELETE FROM rsvps WHERE id = ?`);

// ===== App =====
const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/rsvp', (req: Request, res: Response) => {
  const body = req.body as RsvpInput;
  const name = body.name?.trim() ?? '';
  const phone = body.phone?.trim() ?? '';
  const attending = body.attending?.trim() ?? '';
  const bias = body.bias?.trim() ?? '';
  const allergies = body.allergies?.trim() ?? '';
  const notes = body.notes?.trim() ?? '';

  if (!name || !phone || !attending || !allergies) {
    return res.status(400).json({
      ok: false,
      error: 'Missing required fields: name, phone, attending, allergies',
    });
  }

  const result = insertRsvp.run({ name, phone, attending, bias, allergies, notes });
  return res.json({ ok: true, id: result.lastInsertRowid });
});

app.get('/api/rsvp', (_req: Request, res: Response) => {
  const rows = selectAllRsvps.all();
  res.json({ ok: true, count: rows.length, rsvps: rows });
});

app.delete('/api/rsvp/:id', (req: Request, res: Response) => {
  const id = Number.parseInt(req.params.id ?? '', 10);
  if (Number.isNaN(id)) return res.status(400).json({ ok: false, error: 'Invalid id' });
  deleteRsvpById.run(id);
  res.json({ ok: true });
});

// ===== Simple admin view =====
function escapeHtml(value: string | null): string {
  if (value == null) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function attendingPill(value: string): string {
  const v = value.toLowerCase();
  const cls = v === 'yes' ? 'yes' : v === 'no' ? 'no' : 'maybe';
  const label = v === 'yes' ? '✓ Yes' : v === 'no' ? '✗ No' : '? Maybe';
  return `<span class="pill ${cls}">${label}</span>`;
}

app.get('/admin', (_req: Request, res: Response) => {
  const rows = selectAllRsvps.all();
  const yes = rows.filter((r) => r.attending.toLowerCase() === 'yes').length;
  const maybe = rows.filter((r) => r.attending.toLowerCase() === 'maybe').length;
  const no = rows.filter((r) => r.attending.toLowerCase() === 'no').length;

  const tableRows = rows.length
    ? rows
        .map(
          (r) => `
        <tr>
          <td>${r.id}</td>
          <td><strong>${escapeHtml(r.name)}</strong></td>
          <td>${escapeHtml(r.phone)}</td>
          <td>${attendingPill(r.attending)}</td>
          <td>${escapeHtml(r.bias)}</td>
          <td class="allergy">${escapeHtml(r.allergies)}</td>
          <td>${escapeHtml(r.notes)}</td>
          <td class="muted">${escapeHtml(r.submitted_at)}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="8" class="empty">No RSVPs yet — share the link!</td></tr>`;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>RSVP Admin · Priscilla's Birthday</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #0a0420 0%, #2d0a5c 100%);
    color: white;
    min-height: 100vh;
    padding: 2rem;
  }
  h1 {
    margin: 0 0 0.5rem;
    background: linear-gradient(135deg, #ffd60a, #ff2e9a);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-size: 2rem;
  }
  .sub { color: #b8a8d8; margin-bottom: 2rem; }
  .stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 2rem;
  }
  .stat {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,214,10,0.3);
    border-radius: 12px;
    padding: 1rem 1.5rem;
    min-width: 120px;
  }
  .stat .num {
    font-size: 2rem;
    font-weight: 800;
    color: #ffd60a;
    display: block;
  }
  .stat .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #b8a8d8;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: rgba(255,255,255,0.03);
    border-radius: 12px;
    overflow: hidden;
  }
  th, td {
    padding: 0.85rem 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    vertical-align: top;
  }
  th {
    background: rgba(0,0,0,0.4);
    color: #ffd60a;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .pill {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .pill.yes { background: rgba(6,214,160,0.2); color: #06d6a0; border: 1px solid #06d6a0; }
  .pill.no  { background: rgba(255,107,157,0.2); color: #ff6b9d; border: 1px solid #ff6b9d; }
  .pill.maybe { background: rgba(255,214,10,0.2); color: #ffd60a; border: 1px solid #ffd60a; }
  .allergy { color: #ff8a8a; font-weight: 500; }
  .muted { color: #888; font-size: 0.85rem; }
  .empty { text-align: center; padding: 3rem; color: #b8a8d8; font-style: italic; }
  .refresh {
    display: inline-block;
    background: linear-gradient(135deg, #ff2e9a, #8b5cf6);
    color: white;
    padding: 0.5rem 1.25rem;
    border-radius: 20px;
    text-decoration: none;
    font-weight: 600;
    margin-bottom: 1rem;
  }
</style>
</head>
<body>
  <h1>⚡ RSVP Admin Dashboard ⚡</h1>
  <p class="sub">Priscilla's HUNTR/X 9th Birthday · Friday, August 22nd, 2026</p>

  <div class="stats">
    <div class="stat"><span class="num">${rows.length}</span><span class="label">Total RSVPs</span></div>
    <div class="stat"><span class="num">${yes}</span><span class="label">Coming ✓</span></div>
    <div class="stat"><span class="num">${maybe}</span><span class="label">Maybe</span></div>
    <div class="stat"><span class="num">${no}</span><span class="label">Can't make it</span></div>
  </div>

  <a href="/admin" class="refresh">↻ Refresh</a>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Phone</th>
        <th>Attending</th>
        <th>Bias</th>
        <th>Food Allergies</th>
        <th>Notes</th>
        <th>Submitted</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`\n⚡ RSVP server running at http://localhost:${PORT}`);
  console.log(`   POST /api/rsvp   – submit an RSVP`);
  console.log(`   GET  /api/rsvp   – list all RSVPs (JSON)`);
  console.log(`   GET  /admin      – view all RSVPs in the browser\n`);
});
