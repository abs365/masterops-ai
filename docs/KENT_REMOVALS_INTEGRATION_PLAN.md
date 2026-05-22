# Kent Removals — MasterOps Integration Plan

## Current Status

Kent Removals is a Next.js 16 lead generation platform at:
`C:\Users\Admin\Workspace\projects\kent-removals`

Phase 3 of Kent Removals is complete (admin panel, cron follow-ups, analytics, Telegram, review requests).

---

## Immediate Actions (Connect to MasterOps Now)

### 1. Register in Supabase

```sql
insert into projects (name, slug, url, category)
values ('Kent Removals', 'kent-removals', 'https://kent-removals.vercel.app', 'removals')
on conflict (slug) do update set url = 'https://kent-removals.vercel.app';
```

*(Already seeded by migration 003 — just update the URL.)*

### 2. Add Health Endpoint to Kent Removals

```ts
// kent-removals/src/app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    project: 'kent-removals',
    timestamp: new Date().toISOString(),
  })
}
```

### 3. Add MasterOps Environment Variables to Kent Removals

```env
MASTEROPS_SECURITY_URL=https://your-masterops.vercel.app/api/security/log-event
MASTEROPS_SECURITY_INGEST_SECRET=your_secret
MASTEROPS_USAGE_URL=https://your-masterops.vercel.app/api/costs/log-usage
MASTEROPS_USAGE_INGEST_SECRET=your_secret
```

### 4. Copy Security Helper

Copy `logSecurityEvent()` from `docs/SECURITY_CLIENT_SNIPPETS.md` into:
`kent-removals/src/lib/masterops.ts`

Use it on:
- Failed form submissions (potential spam)
- Admin login attempts
- Unusual quote request patterns

---

## Security Events to Log from Kent Removals

| Event | Trigger | Severity |
|-------|---------|---------|
| `failed_admin_login` | Wrong password on admin panel | warning |
| `suspicious_quote_request` | Multiple quotes from same IP | warning |
| `spam_detected` | Bot-like form submission pattern | critical |
| `admin_action` | Admin deletes or modifies lead | info |
| `webhook_error` | Telegram notification failure | warning |

---

## API Cost Events to Log

| Provider | Endpoint | When |
|---------|---------|------|
| `resend` | `emails.send` | On every email sent |
| `telegram` | `sendMessage` | On every Telegram notification |
| `google_maps` | `geocode` | If added in future |

---

## Deployment Monitoring

1. Get Vercel Project ID from vercel.com → Kent Removals → Settings → General
2. Update in Supabase:

```sql
update projects
set vercel_project_id = 'prj_your_kent_removals_id'
where slug = 'kent-removals';
```

---

## Backup Strategy

- Kent Removals uses Supabase → daily automatic backups
- Add `supabase_project_id` to MasterOps project row when available
- Manual export: Supabase Dashboard → Database → Backups → Download

---

## Future Integrations (Roadmap)

### Dispatch Integration
When dispatch system is built:
- Log each booking created as security audit event (admin_action)
- Log failed payment attempts as critical security event
- Send dispatch cost (e.g. SMS notifications) to MasterOps usage logger

### Driver Tracking Integration
- Log driver location update failures as warning events
- Monitor GPS API usage cost via MasterOps cost logger

### Payment Monitoring
- Log every Stripe payment attempt to MasterOps security logger
- Log Stripe webhook failures as critical alerts
- Track Stripe API cost via usage logger

### AI Quoting Integration
- Log every OpenAI API call to MasterOps usage logger with estimated cost
- Set `DAILY_COST_LIMIT` in Kent Removals and mirror to MasterOps alerts

### Customer Portal Integration
- Log customer login attempts to MasterOps security logger
- Log failed authentication as warning
- Monitor active sessions via security events

---

## Production Readiness Checklist for Kent Removals

- [ ] Health endpoint at `/api/health` added and deployed
- [ ] URL updated in Supabase to production URL
- [ ] `vercel_project_id` set in Supabase
- [ ] `github_repo` set in Supabase (`your-username/kent-removals`)
- [ ] Security helper added and wired to admin login + form submission
- [ ] Resend cost logging added to email send calls
- [ ] MasterOps health check returns `online`
- [ ] Kent Removals visible in MasterOps `/projects`, `/deployments`, `/security`
