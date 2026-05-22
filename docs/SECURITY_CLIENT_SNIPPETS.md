# Security Event Client Snippets

Copy these into any monitored project to send security events to MasterOps.

## Environment Variables Required in Each Project

```env
MASTEROPS_SECURITY_URL=https://your-masterops-url.vercel.app/api/security/log-event
MASTEROPS_SECURITY_INGEST_SECRET=your-secret-from-masterops-env
```

---

## TypeScript Helper (copy into any Next.js project)

```ts
// lib/masterops.ts

interface SecurityEvent {
  project_slug: string
  event_type: string
  severity: 'info' | 'warning' | 'critical' | 'emergency'
  description?: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, unknown>
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const url = process.env.MASTEROPS_SECURITY_URL
  const secret = process.env.MASTEROPS_SECURITY_INGEST_SECRET

  if (!url || !secret) return // skip if not configured

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-masterops-secret': secret,
      },
      body: JSON.stringify(event),
    })
  } catch {
    // Never let monitoring crash the main app
  }
}
```

---

## Usage Examples

### Failed Login

```ts
await logSecurityEvent({
  project_slug: 'lead-gen-system',
  event_type: 'failed_login',
  severity: 'warning',
  description: `Failed login attempt for email: ${email}`,
  ip_address: request.headers.get('x-forwarded-for') ?? undefined,
  user_agent: request.headers.get('user-agent') ?? undefined,
})
```

### Suspicious IP (multiple requests)

```ts
await logSecurityEvent({
  project_slug: 'bold-english-coach',
  event_type: 'suspicious_ip',
  severity: 'critical',
  description: `IP ${ip} made 50 requests in 60 seconds`,
  ip_address: ip,
  metadata: { request_count: 50, window_seconds: 60 },
})
```

### API Abuse (rate limit hit)

```ts
await logSecurityEvent({
  project_slug: 'lead-gen-system',
  event_type: 'rate_limit_exceeded',
  severity: 'warning',
  description: `API rate limit hit on /api/quotes`,
  metadata: { endpoint: '/api/quotes', limit: 100 },
})
```

### Webhook Error

```ts
await logSecurityEvent({
  project_slug: 'lead-gen-system',
  event_type: 'webhook_error',
  severity: 'warning',
  description: `Stripe webhook signature verification failed`,
  metadata: { webhook_type: 'stripe', status: 400 },
})
```

### Admin Action (audit trail)

```ts
await logSecurityEvent({
  project_slug: 'angel-11plus',
  event_type: 'admin_action',
  severity: 'info',
  description: `Admin deleted quiz: ${quizId}`,
  metadata: { action: 'delete_quiz', quiz_id: quizId, admin_email: adminEmail },
})
```

---

## Severity Guide

| Severity | When to Use |
|----------|-------------|
| `info` | Audit trail, normal admin actions |
| `warning` | Failed logins, rate limits, minor anomalies |
| `critical` | Suspicious IPs, brute force, webhook failures, data errors |
| `emergency` | Active breach, exposed keys, mass data access |

---

## Event Type Conventions

Use snake_case strings. Recommended standard types:

- `failed_login`
- `suspicious_ip`
- `rate_limit_exceeded`
- `api_abuse`
- `webhook_error`
- `admin_action`
- `unauthorized_access`
- `data_export`
- `password_reset`
- `account_locked`
