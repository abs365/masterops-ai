# New Project Onboarding Guide

Follow this checklist every time a new business platform is added to the MasterOps ecosystem.

---

## Step 1 — Register in Supabase

Run this SQL in Supabase SQL Editor:

```sql
insert into projects (name, slug, url, category)
values (
  'My New Project',         -- display name
  'my-new-project',         -- unique slug (kebab-case)
  'https://myproject.vercel.app',  -- production URL
  'saas'                    -- category: saas | leadgen | education | removals | events | general
)
on conflict (slug) do nothing;
```

**Naming conventions:**
- `name`: Title Case with spaces (`Kent Removals`, `Bold English Coach`)
- `slug`: kebab-case, no spaces (`kent-removals`, `bold-english-coach`)
- `url`: full production URL including `https://`

---

## Step 2 — Required Environment Variables in MasterOps

Add to MasterOps `.env.local` (these control how MasterOps connects to the project):

```env
# No per-project env vars needed — connection is via health URL + ingest APIs
```

MasterOps connects to projects via:
- Health check URL (set in `url` column of `projects` table)
- Security events POSTed FROM the project TO MasterOps
- API cost logs POSTed FROM the project TO MasterOps
- Vercel token (one token covers all Vercel projects)
- GitHub token (one token covers all GitHub repos)

---

## Step 3 — Health Monitoring

In the new project, expose a health endpoint:

```ts
// app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}
```

Then update the project's `url` in Supabase to point to its production URL.
MasterOps will check `GET {url}` on every cron cycle.

---

## Step 4 — Security Event Ingestion

Add these to the new project's `.env.local`:

```env
MASTEROPS_SECURITY_URL=https://your-masterops.vercel.app/api/security/log-event
MASTEROPS_SECURITY_INGEST_SECRET=your_secret_from_masterops_SECURITY_INGEST_SECRET
```

Copy the helper from `docs/SECURITY_CLIENT_SNIPPETS.md` into the project's `lib/masterops.ts`.

---

## Step 5 — API Cost Ingestion

Add to the new project's `.env.local`:

```env
MASTEROPS_USAGE_URL=https://your-masterops.vercel.app/api/costs/log-usage
MASTEROPS_USAGE_INGEST_SECRET=your_secret_from_masterops_USAGE_INGEST_SECRET
```

Call `POST /api/costs/log-usage` after every paid API call with provider, endpoint, and estimated cost.

---

## Step 6 — Vercel Connection

1. Find the Vercel project ID: vercel.com → Project → Settings → General → Project ID
2. Update the project's row in Supabase:

```sql
update projects
set vercel_project_id = 'prj_xxxxxxxxxxxxx'
where slug = 'my-new-project';
```

---

## Step 7 — GitHub Connection

1. Ensure `GITHUB_TOKEN` is set in MasterOps with `repo:read` scope
2. Update the project's `github_repo` column:

```sql
update projects
set github_repo = 'your-username/my-new-project'
where slug = 'my-new-project';
```

---

## Production Readiness Checklist

- [ ] Project row inserted into Supabase `projects` table
- [ ] `url` set to production URL
- [ ] `category` set correctly
- [ ] `vercel_project_id` set
- [ ] `github_repo` set
- [ ] Health endpoint `GET /api/health` returns `{ status: 'ok' }`
- [ ] Security ingestion helper added to project
- [ ] API cost logging added for every paid API call
- [ ] MasterOps health check returns `online` in `/projects` page
- [ ] Project appears in MasterOps `/deployments` and `/security` pages
