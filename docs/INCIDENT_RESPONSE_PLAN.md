# Incident Response Plan

## Severity Definitions

| Level | Example | SLA |
|-------|---------|-----|
| P1 Emergency | Project completely down, data breach, API key exposed | Immediate |
| P2 Critical | Project degraded >5min, security breach attempt | Within 1 hour |
| P3 Warning | Slow response, cost spike | Within 4 hours |
| P4 Info | Routine alerts, low-risk events | Next business day |

---

## P1 Emergency Response Steps

1. **Identify** — Check MasterOps dashboard /alerts and /security
2. **Contain** — Disable exposed API keys immediately in each provider dashboard
3. **Assess** — Determine scope: which project, which data, which users affected
4. **Restore** — Roll back deployment in Vercel if caused by code change
5. **Communicate** — Notify affected users if data was accessed
6. **Document** — Log full incident in /security_events via API

### If API key is exposed in Git:
```
1. Rotate key immediately in provider dashboard
2. Update Vercel environment variables
3. Run: git filter-repo or BFG to remove key from history
4. Force push (last resort — coordinate with team)
```

---

## P2 Critical Response Steps

1. Check MasterOps /projects for which project is affected
2. Check Vercel deployment logs for recent failures
3. Check Supabase logs for database errors
4. Roll back if last deployment caused issue
5. Create incident alert via /api/alerts/create

---

## Project Down Response

```
1. Verify: is it actually down? Check from separate network.
2. Check Vercel deployment status
3. Check Supabase connection
4. Check environment variables are set
5. Redeploy if no obvious cause
6. If still down: rollback to last working deployment
```

---

## Cost Emergency Response

1. MasterOps creates emergency alert when daily cost exceeds threshold
2. Immediately check /costs dashboard
3. Identify which API provider spiked
4. Check for infinite loops, duplicate requests, or abuse
5. Add rate limiting or circuit breaker if needed
6. Rotate/restrict API key if abuse is external
