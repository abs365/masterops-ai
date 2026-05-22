# Standard Project Environment Template

Every project connected to MasterOps should include these environment variables.

Copy this template into the new project's `.env.example`.

---

## Core (Required)

```env
# Supabase — project-specific DB
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## MasterOps Integration (Required for Monitoring)

```env
# MasterOps security event ingestion
MASTEROPS_SECURITY_URL=https://your-masterops.vercel.app/api/security/log-event
MASTEROPS_SECURITY_INGEST_SECRET=

# MasterOps API cost logging
MASTEROPS_USAGE_URL=https://your-masterops.vercel.app/api/costs/log-usage
MASTEROPS_USAGE_INGEST_SECRET=
```

---

## Notifications (Optional but Recommended)

```env
# Resend email (for project-level alerts, separate from MasterOps)
RESEND_API_KEY=
NOTIFICATION_EMAIL_TO=
NOTIFICATION_EMAIL_FROM=

# Telegram (for project-level urgent alerts)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

---

## Security Variables

```env
# Rate limiting config
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60

# CRON / webhook protection
CRON_SECRET=
WEBHOOK_SECRET=
```

---

## Deployment / Infra Variables

```env
# App URL (used for internal callbacks and absolute URLs)
NEXT_PUBLIC_APP_URL=https://yourproject.vercel.app

# Node environment
NODE_ENV=production
```

---

## Cost Monitoring Variables

```env
# Daily API spend limit (optional — used by your own project-level cost logic)
DAILY_COST_LIMIT=5.00

# Per-service API keys
OPENAI_API_KEY=
GOOGLE_MAPS_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Notes

- Never commit `.env.local` — add to `.gitignore`
- Store production values in Vercel environment variables
- Use separate keys for dev, preview, and production environments
- Rotate all keys if any are exposed in git history
