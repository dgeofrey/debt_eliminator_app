# Debt Eliminator

Personal finance app with debt payoff strategies (Avalanche / Snowball), a Canadian mortgage calculator with home affordability analysis, dark/light mode, and an optional AI assistant named Geo.

## Features

- **Dashboard** — income, expenses, debt ledger, cash flow waterfall, payoff simulation (Avalanche & Snowball), debt-free countdown
- **Mortgage calculator** — Canadian semi-annual compounding, all six payment frequencies (including accelerated), amortization schedule, payment breakdown visualisation
- **Home affordability** — GDS/TDS ratio calculator, CMHC insurance, stress test, supports 1st home / 2nd home / investment property
- **Geo** — optional AI financial assistant (disabled by default)
- **Auth** — JWT + bcrypt, per-user data isolation, super admin role
- **Design** — Montserrat UI font, Calibri for numbers, Tesla-inspired dark/light theme

## Quick start

```bash
cp .env.example .env       # set JWT_SECRET before production
docker compose up --build
# → http://localhost:7070/register
```

MySQL initialises automatically from `sql/init.sql` on first launch.

## Super admin

| Field | Value |
|---|---|
| Email | `dgeofrey@admin.local` |
| Password | `YourSuperAdminPassword!` |

Override `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` in `.env` before first launch. Super admins see a shield badge in the sidebar.

## Enable Geo (AI chat) — optional

Geo is off by default — no API keys or downloads needed to run the app.

```env
GEO_ENABLED=true
```

Pick a backend:

| Option | Setup |
|---|---|
| **Gemini (free cloud)** | `GEO_BACKEND=gemini` + `GEMINI_API_KEY=your_key` |
| **Ollama (local/private)** | `GEO_BACKEND=ollama` + `OLLAMA_HOST=http://host.docker.internal:11434` + `OLLAMA_MODEL=qwen2.5:0.5b` |

## Local dev (no Docker)

```bash
docker compose up db -d    # MySQL only
# set DB_HOST=localhost in .env
bun install && bun run dev
# Server → :7070  |  Vite dev → :5173
```

## Stack

| Layer | Choice |
|---|---|
| Runtime | Bun |
| Backend | Hono |
| Database | MySQL 8 |
| Auth | JWT + bcryptjs |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS · Montserrat · Calibri (numbers) |
| Icons | Lucide React |
| Container | Docker + docker-compose |
