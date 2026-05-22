# Cron / Scheduled Monitoring Setup

MasterOps monitors your projects by calling:

```
GET /api/monitor/check-projects
```

This endpoint visits every project URL, measures response time, updates status in Supabase, creates alerts, and sends Telegram notifications for critical issues.

You need to call this endpoint on a schedule. Choose one of the options below.

---

## Secret Protection (Recommended)

Set `CRON_SECRET` in your environment variables to protect the endpoint from public access:

```env
CRON_SECRET=your-secret-string-here
```

When set, all calls must include the secret as a query parameter:

```
GET /api/monitor/check-projects?secret=your-secret-string-here
```

If `CRON_SECRET` is not set, the endpoint is open (fine for local development).

---

## Option 1: Vercel Cron Jobs (Recommended for Production)

Add to `vercel.json` in the project root:

```json
{
  "crons": [
    {
      "path": "/api/monitor/check-projects",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This calls the endpoint every 5 minutes automatically via Vercel's built-in cron system.

Notes:
- Available on Vercel Pro and above
- Vercel automatically adds the `Authorization: Bearer $CRON_SECRET` header — no query param needed
- Free plan supports crons at 1-hour intervals only

**To use with CRON_SECRET on Vercel:** Vercel passes the secret as `Authorization: Bearer <CRON_SECRET>`. You may want to support both header and query param — update the `authCheck` function in `route.ts` if needed.

---

## Option 2: GitHub Actions Cron

Create `.github/workflows/monitor.yml`:

```yaml
name: MasterOps Health Check

on:
  schedule:
    - cron: '*/10 * * * *'  # every 10 minutes
  workflow_dispatch:          # allow manual trigger

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Ping monitor endpoint
        run: |
          curl -X GET \
            "${{ secrets.MASTEROPS_URL }}/api/monitor/check-projects?secret=${{ secrets.CRON_SECRET }}" \
            -f -s
```

Add these GitHub secrets:
- `MASTEROPS_URL` = your Vercel production URL (e.g. `https://masterops-ai.vercel.app`)
- `CRON_SECRET` = your cron secret value

---

## Option 3: UptimeRobot (Free, No Code)

UptimeRobot can hit a URL every 5 minutes for free.

1. Go to https://uptimerobot.com
2. Add Monitor → HTTP(s)
3. URL: `https://masterops-ai.vercel.app/api/monitor/check-projects?secret=YOUR_SECRET`
4. Interval: 5 minutes

This also gives you uptime monitoring on MasterOps itself as a bonus.

---

## Option 4: Manual Browser Call

During development or when you just want to trigger a check:

1. Open your browser
2. Navigate to: `http://localhost:3000/api/monitor/check-projects`
3. Or use the **Run Check Now** button on the `/projects` page

---

## Cron Schedule Reference

| Expression | Meaning |
|-----------|---------|
| `*/5 * * * *` | Every 5 minutes |
| `*/10 * * * *` | Every 10 minutes |
| `0 * * * *` | Every hour |
| `0 */6 * * *` | Every 6 hours |
| `0 8 * * *` | Daily at 8am UTC |

---

## What the Check Does

1. Reads all projects from Supabase
2. For projects with a URL: sends GET request with 10s timeout
3. Classifies status:
   - `online` = HTTP 200–399, response < 2000ms
   - `slow` = HTTP 200–399, response ≥ 2000ms
   - `warning` = HTTP 400–499
   - `down` = HTTP 500+, timeout, or connection failure
   - `unknown` = no URL configured
4. Updates `status`, `response_time_ms`, `last_checked_at` in Supabase
5. Creates alert if project is `down` or `slow` (deduplicates — won't spam)
6. Sends Telegram notification for `critical` / `emergency` alerts
