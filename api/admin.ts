import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../lib/db.js';

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
  const label = v === 'yes' ? '\u2713 Yes' : v === 'no' ? '\u2717 No' : '? Maybe';
  return `<span class="pill ${cls}">${label}</span>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const db = getDb();
  const { rows } = await db.execute(
    `SELECT * FROM rsvps ORDER BY datetime(submitted_at) DESC`,
  );
  const results = rows as unknown as RsvpRow[];

  const yes = results.filter((r) => r.attending.toLowerCase() === 'yes').length;
  const maybe = results.filter((r) => r.attending.toLowerCase() === 'maybe').length;
  const no = results.filter((r) => r.attending.toLowerCase() === 'no').length;

  const tableRows = results.length
    ? results
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
    : `<tr><td colspan="8" class="empty">No RSVPs yet \u2014 share the link!</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>RSVP Admin \u00b7 Priscilla's Birthday</title>
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
  .stats { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
  .stat {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,214,10,0.3);
    border-radius: 12px;
    padding: 1rem 1.5rem;
    min-width: 120px;
  }
  .stat .num { font-size: 2rem; font-weight: 800; color: #ffd60a; display: block; }
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
  <h1>\u26a1 RSVP Admin Dashboard \u26a1</h1>
  <p class="sub">Priscilla's HUNTR/X 9th Birthday \u00b7 Friday, August 22nd, 2026</p>

  <div class="stats">
    <div class="stat"><span class="num">${results.length}</span><span class="label">Total RSVPs</span></div>
    <div class="stat"><span class="num">${yes}</span><span class="label">Coming \u2713</span></div>
    <div class="stat"><span class="num">${maybe}</span><span class="label">Maybe</span></div>
    <div class="stat"><span class="num">${no}</span><span class="label">Can't make it</span></div>
  </div>

  <a href="/admin" class="refresh">\u21bb Refresh</a>

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
</html>`;

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
