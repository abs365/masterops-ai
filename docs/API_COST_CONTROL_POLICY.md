# API Cost Control Policy

## Thresholds

| Provider | Daily Warning | Daily Emergency |
|----------|--------------|-----------------|
| OpenAI | $2.00 | $5.00 |
| Google Maps | $1.00 | $3.00 |
| Supabase | $0.50 | $2.00 |
| Vercel | $5.00 | $15.00 |
| Resend (email) | $1.00 | $3.00 |
| Total (all) | $5.00 | $15.00 |

## Daily Limit Configuration

Set in `.env.local` or Vercel environment variables:

```env
DAILY_COST_LIMIT_GBP=10
```

- If today's total cost exceeds the limit → `critical` alert + Telegram + email
- If today's total cost exceeds 3× the limit → `emergency` alert + Telegram + email
- If today's cost is 3× yesterday's cost → `warning` alert (spike detection)

## Automatic Protection Rules

MasterOps monitors these thresholds via `/api/costs/check-usage`.

- If daily cost exceeds warning threshold → create `critical` alert
- If daily cost exceeds emergency threshold → create `emergency` alert
- If request count triples in 1 hour → create `warning` alert (rate spike)

## Developer Rules

1. Never call paid APIs in loops without rate limiting
2. Cache API responses where possible (Next.js fetch cache)
3. Use mock data in development — never call paid APIs in dev unless necessary
4. Log every paid API call to MasterOps via the usage ingest endpoint:
   ```ts
   await fetch(process.env.MASTEROPS_USAGE_URL!, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'x-masterops-secret': process.env.MASTEROPS_USAGE_INGEST_SECRET!,
     },
     body: JSON.stringify({
       project_slug: 'my-project',
       provider: 'openai',
       endpoint: 'chat/completions',
       request_count: 1,
       estimated_cost: 0.0032,
     }),
   })
   ```

## Budget Alerts

Set hard limits in each provider's dashboard as backup:
- OpenAI: Usage limits → Hard limit
- Google Cloud: Billing → Budgets & alerts
- Vercel: Settings → Spending limits
