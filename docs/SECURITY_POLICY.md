# Security Policy

## Admin Access

- Dashboard is restricted to emails listed in `ADMIN_EMAILS` environment variable
- Default admin: tosinlawal05@gmail.com
- No public registration or sign-up

## API Security

- All write API routes require service role key (server-side only)
- Public anon key used only for read-only dashboard queries
- `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to the browser

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| info | Normal activity | Log only |
| warning | Unusual activity | Log + dashboard alert |
| critical | Active threat | Log + alert + Telegram notification |
| emergency | System breach or extreme cost spike | Log + alert + immediate action required |

## Security Events to Monitor

- Suspicious IPs (repeated failed requests)
- Failed login attempts
- API abuse (request rate spikes)
- Unusual request patterns
- Database permission errors
- Exposed API keys in logs

## Incident Response

See `INCIDENT_RESPONSE_PLAN.md` for full procedure.

## Environment Variable Rules

- Never commit `.env.local`
- Rotate all keys if any are exposed in git history
- Use Vercel environment variables for production
- Separate keys per environment (dev / preview / production)

## Security Ingestion Endpoint (Phase 3)

Other projects send events to MasterOps via:

```
POST /api/security/log-event
x-masterops-secret: SECURITY_INGEST_SECRET
```

Body fields:
- `project_slug` (required if project-specific)
- `event_type` (required) — e.g. `failed_login`, `suspicious_ip`
- `severity` — `info` | `warning` | `critical` | `emergency`
- `description` — human-readable detail
- `ip_address`, `user_agent`, `metadata` — optional

See `docs/SECURITY_CLIENT_SNIPPETS.md` for copy-paste helpers.

## Notification Chain

For `critical` and `emergency` events:
1. Alert created in Supabase `alerts` table
2. Telegram message sent (bot token + chat ID)
3. Email sent via Resend (parallel, best-effort)

## Cloudflare (Phase 4)

- WAF rules to block malicious traffic
- Rate limiting at edge level
- DDoS protection
- Bot filtering
