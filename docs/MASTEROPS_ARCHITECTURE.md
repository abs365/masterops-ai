# MasterOps AI Control Centre — Architecture

## Overview

MasterOps is a standalone Next.js 16 admin dashboard that monitors, secures, and manages all other platforms. It does NOT share code or databases with any monitored project — it connects to them via external APIs only.

## MasterOps Multi-Business Architecture

MasterOps is designed as a permanent, growing central command centre. New business platforms are added without changing MasterOps code — they register themselves in the database.

```
┌─────────────────────────────────────────────────────┐
│                  MasterOps                          │
│           (Central Command Centre)                  │
│   Dashboard · Alerts · Security · Costs · Reports   │
└──────────────────┬──────────────────────────────────┘
                   │  Reads via:
    ┌──────────────┼──────────────────────────┐
    │              │                          │
    ▼              ▼                          ▼
HTTP health    Vercel API              GitHub API
   checks    (deployments)          (repo + CI runs)
    │
    │  Receives via POST:
    ├──── /api/security/log-event  ◄── All projects
    ├──── /api/costs/log-usage     ◄── All projects
    └──── /api/monitor/check-projects ◄── Cron

Connected projects (each isolated, separate DB):
  ├── Kent Removals          (removals)
  ├── Lead Gen System        (leadgen)
  ├── Bold English Coach     (education)
  ├── Angel 11Plus           (education)
  └── Future projects...
```

### Isolation Principles

- Each business platform has its own Supabase project (separate database)
- Each business platform has its own Vercel deployment
- MasterOps never writes to any monitored project's database
- Connection is READ-ONLY (health checks, GitHub, Vercel) or RECEIVE-ONLY (ingest APIs)
- Projects can be added without redeploying MasterOps — just register in the `projects` table

### Project Categories

Projects are categorised for filtering and reporting:
`saas` · `leadgen` · `education` · `removals` · `logistics` · `events` · `operations` · `internal` · `general`

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (Route Handlers) |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |
| Notifications | Telegram Bot API + Resend (email) |
| Monitoring | Self-hosted health checks via cron |
| Error tracking | Sentry (Phase 4) |
| Security | Cloudflare (Phase 4) |

## Ingest APIs (Phase 3)

Other projects POST data to MasterOps via three ingestion endpoints:

| Endpoint | Purpose | Secret Header |
|----------|---------|---------------|
| `POST /api/security/log-event` | Security events (failed logins, suspicious IPs) | `x-masterops-secret: SECURITY_INGEST_SECRET` |
| `POST /api/costs/log-usage` | API usage cost tracking | `x-masterops-secret: USAGE_INGEST_SECRET` |
| `POST /api/monitor/check-projects` | Trigger health check (cron) | `?secret=CRON_SECRET` |

## How Security Event Ingestion Works

1. A monitored project detects a security event (failed login, rate limit, etc.)
2. It POSTs to `https://masterops.vercel.app/api/security/log-event` with the `x-masterops-secret` header
3. MasterOps resolves `project_slug` → `project_id`
4. Event is stored in `security_events` table with optional `metadata` JSON
5. If severity is `critical` or `emergency`: alert created + Telegram + email fired

See `docs/SECURITY_CLIENT_SNIPPETS.md` for copy-paste code.

## How Cost Monitoring Works

1. A monitored project logs each paid API call to `POST /api/costs/log-usage`
2. MasterOps stores it in `api_usage_logs` with provider, endpoint, and estimated cost
3. `/api/costs/check-usage` aggregates daily totals, detects spikes, and fires alerts if `DAILY_COST_LIMIT_GBP` is exceeded

## How Vercel Deployment Monitoring Works

1. Set `VERCEL_TOKEN` and optionally `VERCEL_TEAM_ID` in MasterOps env vars
2. Add `vercel_project_id` to each project row in Supabase
3. The `/deployments` page and `/api/deployments/status` query the Vercel API per project
4. Latest deployment state is shown: `READY`, `ERROR`, `BUILDING`, `CANCELED`

## How Notifications Work

- **Telegram**: fires first for `critical` and `emergency` alerts via Telegram Bot API
- **Email (Resend)**: fires in parallel as backup for `critical` and `emergency` alerts
- Both are best-effort — if not configured, the main operation never fails

## How Monitoring Works (Phase 2)

1. A cron job (Vercel cron, GitHub Actions, or UptimeRobot) calls `GET /api/monitor/check-projects` on a schedule
2. The API reads all projects from Supabase and fetches each project URL
3. Response time and HTTP status determine the project status (`online`, `slow`, `warning`, `down`, `unknown`)
4. Supabase is updated with the new status and response time
5. If a project is `down` or `slow`, an alert is created (deduplication prevents spam)
6. Critical/emergency alerts trigger a Telegram notification

## How Alerts Work

- Alerts are stored in the `alerts` table in Supabase
- Severity levels: `info`, `warning`, `critical`, `emergency`
- Status: `open` → `acknowledged` → `resolved`
- Deduplication: if an open alert with the same title and project already exists, no duplicate is created
- Critical and emergency alerts send a Telegram message automatically

## How to Add a Project URL

1. Open your Supabase project → Table Editor → `projects`
2. Find the project row and click Edit
3. Add the live URL (e.g. `https://bold-english-coach.vercel.app`)
4. Save — the next monitoring check will pick it up automatically

## Telegram Notifications

Set in `.env.local`:
```
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

To get these:
1. Create a bot via @BotFather on Telegram → copy the token
2. Start a chat with your bot, then call: `https://api.telegram.org/bot<TOKEN>/getUpdates` to find your chat ID

## Data Flow

```
External Projects
      │
      │  Health check HTTP GET (from MasterOps)
      │  Security events HTTP POST (from each project to MasterOps API)
      ▼
MasterOps API Routes
      │
      ▼
Supabase (masterops DB — separate from all other project DBs)
      │
      ▼
Dashboard UI (server components, real-time data)
```

## Project Isolation

- MasterOps has its own Supabase project
- Monitored projects connect only via:
  - Health-check URLs (read-only HTTP GET)
  - GitHub tokens (read-only repo access)
  - Vercel tokens (read-only deployment info)
  - Supabase credentials per project (read-only stats)
- No code is shared between MasterOps and monitored projects

## Directory Structure

```
src/
  app/
    (main)/          ← shared sidebar/header layout
      dashboard/
      projects/
      security/
      alerts/
      costs/
      backups/
      deployments/
      leads/
      reports/
      settings/
    api/
      monitor/check-projects/
      security/log-event/
      alerts/create/
      reports/daily/
      costs/check-usage/
      backups/status/
      deployments/status/
  components/
    layout/          ← Sidebar, Header
    dashboard/       ← StatCards, RecentAlerts, ProjectStatusTable
    projects/        ← ProjectsTable
    security/        ← SecurityEventsTable
    alerts/          ← AlertsTable
  lib/
    supabase/        ← client.ts, server.ts
    monitoring/      ← health check logic
    security/        ← event helpers
    notifications/   ← Telegram, email
  types/             ← shared TypeScript interfaces
supabase/
  migrations/        ← SQL schema files
docs/               ← this file and all policy docs
```
