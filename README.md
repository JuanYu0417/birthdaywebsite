# Birthday Girl's HUNTR/X Birthday Bash 🎤⚡
---

## 📁 Project Structure

```
birthdaywebsite/
├── index.html              ← landing page (hero, hunters, schedule, RSVP)
├── package.json            ← scripts and dependencies
├── tsconfig.json           ← TypeScript config (frontend + api)
├── vite.config.ts          ← Vite config + /api proxy to vercel dev
├── vercel.json             ← Vercel config (rewrite /admin → /api/admin)
├── schema.sql              ← Turso/SQLite schema (auto-applied at runtime too)
├── .gitignore
│
├── src/                    ← FRONTEND (TypeScript)
│   ├── main.ts             ← countdown, greeting rotator, RSVP submit,
│   │                         click sparkles, scroll reveal animations
│   └── styles.css          ← all styling (HUNTR/X dark theme)
│
├── api/                    ← BACKEND (Vercel Serverless Functions)
│   ├── admin.ts            ← GET /admin — styled RSVP dashboard
│   ├── rsvp.ts             ← POST + GET /api/rsvp
│   └── rsvp/[id].ts        ← DELETE /api/rsvp/:id
│
└── lib/
    └── db.ts               ← libSQL (Turso) client + auto schema bootstrap
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer (tested on v22)
- A free [Vercel account](https://vercel.com/signup)
- A free [Turso account](https://turso.tech/) for the database

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Turso database

1. Sign in at https://app.turso.tech (GitHub login works).
2. **Create Database** → name it `rsvps` → pick a region close to you.
3. On the database's page, copy the **Database URL** (looks like `libsql://rsvps-<your-org>.turso.io`).
4. Click **Create Token** → copy the token.


> Schema bootstrap is automatic: the API auto-runs `CREATE TABLE IF NOT EXISTS rsvps (...)` on the first request, so you don't need to apply `schema.sql` manually. The file is still there if you want to apply it explicitly via the dashboard's SQL console.

### 3. Deploy to Vercel

See [🌍 Deploying to Vercel](#-deploying-to-vercel) below for full details.

---

## 📜 Available Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Runs `vercel dev` (frontend + API functions) on `:3000` |
| `npm run web` | Runs only the Vite frontend on `:5173` (proxies API to `:3000`) |
| `npm run build` | Type-checks and builds the frontend into `dist/` |
| `npm run preview` | Serves the production `dist/` locally |
| `npm run deploy` | Deploys to Vercel production |

---

## 💾 RSVP Database

All RSVPs are stored in a Turso (libSQL / SQLite) database.

### Schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER | auto-incrementing primary key |
| `name` | TEXT | hunter's name |
| `phone` | TEXT | parent's phone |
| `attending` | TEXT | `yes` / `no` / `maybe` |
| `bias` | TEXT | favourite HUNTR/X member |
| `allergies` | TEXT | food allergies (required) |
| `notes` | TEXT | song requests, special powers, etc. |
| `submitted_at` | TEXT | ISO timestamp |

The table is created automatically by `lib/db.ts` on the first request, so a fresh empty database "just works".

### How to view RSVPs

| Method | URL / Command |
|--------|--------------|
| **Pretty admin dashboard** | `https://<your-project>.vercel.app/admin` |
| **Raw JSON** | `https://<your-project>.vercel.app/api/rsvp` |
| **Turso dashboard SQL console** | https://app.turso.tech → your database → SQL shell |

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/rsvp` | Submit a new RSVP (required: `name`, `phone`, `attending`, `allergies`) |
| `GET` | `/api/rsvp` | List all RSVPs as JSON |
| `DELETE` | `/api/rsvp/:id` | Delete an RSVP by id |
| `GET` | `/admin` | Styled HTML dashboard with stats and all RSVPs |

All endpoints return structured JSON errors instead of generic Vercel 500s. The `/admin` page renders a friendly HTML error card if the database is misconfigured, so you'll always see what's wrong.

---

## 🌍 Deploying to Vercel

Deploy entirely from the [Vercel dashboard](https://vercel.com/) — no CLI needed.

1. Push this repo to GitHub (or GitLab / Bitbucket) if you haven't already.
2. In the Vercel dashboard click **Add New → Project** and import the repo.
3. Framework preset: **Vite** (auto-detected). Build command and output dir come from `vercel.json`, leave them as-is.
4. **Settings → Environment Variables** — add both, ticking **Production**, **Preview**, and **Development**:

   | Name | Value |
   |------|-------|
   | `TURSO_DATABASE_URL` | `libsql://rsvps-<your-org>.turso.io` |
   | `TURSO_AUTH_TOKEN` | the token from the Turso dashboard |

5. Click **Deploy**.
6. **Important — if you add or change env vars later, redeploy.** Existing deployments don't pick them up automatically. In **Deployments**, click the `…` on the latest deployment → **Redeploy**.

After the first deploy your URL will be `https://<project>.vercel.app`. Visit `/admin` to see the dashboard.

> Every push to your default branch will automatically trigger a new deploy.

---

## 🔧 Tech Stack

| Layer | Tools |
|-------|-------|
| Build | [Vite](https://vitejs.dev/) 5 |
| Frontend | TypeScript (strict), vanilla DOM, CSS custom properties |
| Backend | [Vercel Serverless Functions](https://vercel.com/docs/functions) (Node.js runtime) |
| Database | [Turso](https://turso.tech/) / [libSQL](https://github.com/tursodatabase/libsql) (serverless SQLite) |
| Hosting | [Vercel](https://vercel.com/) |
| Fonts | Google Fonts — Bungee, Black Han Sans, Poppins |


