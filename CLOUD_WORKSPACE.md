# MasterOps AI — Cloud Workspace Guide

This repository is configured for development in **GitHub Codespaces** and **VS Code for the Web** with zero local installation required.

---

## Quick Start

1. Go to `github.com/abs365/masterops-ai`
2. Click **Code → Codespaces → Create codespace on main**
3. Wait ~2 minutes — the container builds and `npm install` runs automatically
4. Set your Codespaces secrets (see below) — **Supabase secrets are required**
5. Run `npm run dev` in the terminal, then click **Open in Browser** when the port 3000 notification appears

On subsequent uses: **resume** the existing Codespace rather than creating a new one. Resuming is instant and retains editor state.

---

## ⚠ Required Secrets

Unlike some apps in this workspace, **MasterOps AI requires three Supabase secrets to start**. The app will crash on startup if they are absent because the Supabase client uses non-null assertions on these values.

Set these three before running `npm run dev`:

| Secret | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project → Settings → API → Project API keys → anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project → Settings → API → Project API keys → service_role |

**How to set Codespaces secrets:**
> GitHub → Repository → Settings → Secrets and variables → Codespaces → New repository secret

After adding secrets, **stop and restart the Codespace** (or reload the VS Code window with `Ctrl+Shift+P → Developer: Reload Window`) for them to take effect.

---

## Optional Secrets

All other secrets are optional. Features degrade gracefully when they are absent.

| Secret | Feature | Behaviour when absent |
|---|---|---|
| `ADMIN_EMAILS` | Admin access | Admin routes may be open or always-denied depending on route logic |
| `OPENAI_API_KEY` | AI daily reports (primary) | Falls back to Anthropic or template |
| `ANTHROPIC_API_KEY` | AI daily reports (fallback) | Falls back to template report |
| `RESEND_API_KEY` | Email alerts | Email sends are silently skipped |
| `ALERT_EMAIL_TO` | Email alert recipient | Email sends are silently skipped |
| `ALERT_EMAIL_FROM` | Email alert sender | Defaults to `alerts@masterops.ai` |
| `TELEGRAM_BOT_TOKEN` | Telegram alerts | Telegram sends are silently skipped |
| `TELEGRAM_CHAT_ID` | Telegram alert channel | Telegram sends are silently skipped |
| `GITHUB_TOKEN` | GitHub deployment monitoring | Returns `{configured: false}` |
| `VERCEL_TOKEN` | Vercel deployment monitoring | Returns empty data |
| `VERCEL_TEAM_ID` | Vercel team scoping | Not required for personal accounts |
| `SUPABASE_ACCESS_TOKEN` | Supabase infrastructure monitoring | Monitoring skipped |
| `SUPABASE_ORG_ID` | Supabase org scoping | Monitoring skipped |
| `CRON_SECRET` | Cron endpoint auth | All callers are allowed (open) |
| `SECURITY_INGEST_SECRET` | Security event ingest auth | Endpoint is open |
| `USAGE_INGEST_SECRET` | Usage log ingest auth | Endpoint is open |
| `DAILY_COST_LIMIT_GBP` | Cost alert threshold | Defaults to £10/day |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Fails open — all requests allowed |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | Fails open — all requests allowed |

For local development, see `.env.example` — copy it to `.env.local` and fill in values.

---

## Dev Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server at localhost:3000 (Turbopack) |
| `npm run build` | Production build — confirms no type or compilation errors |
| `npx tsc --noEmit` | Type-check without building |
| `npm run lint` | ESLint check across all source files |

---

## Workflow

```
1. Resume Codespace (or create one)
2. Confirm npm install ran (check terminal — it runs automatically on create)
3. Run: npm run dev
4. Make changes — Turbopack hot-reloads in milliseconds
5. Stage and commit from the Source Control panel (or terminal)
6. Push: git push
7. Stop the Codespace when done (saves billing minutes)
```

---

## Codespace Resources

- **Machine type:** 2-core / 8GB RAM is sufficient for this app
- **Storage:** The container uses ~1.5GB (Node.js image + node_modules)
- **Billing:** GitHub provides 120 free core-hours/month on the Free plan (60 hours on a 2-core machine). Stop Codespaces when not in use to conserve hours.
- **Ports:** Port 3000 is forwarded automatically. Use the **Ports** tab in VS Code to set visibility to **Private** (default) or **Public** for sharing a preview URL.

---

## Troubleshooting

**App crashes immediately on startup**
→ The Supabase environment variables are missing. Verify `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are all set in Codespaces secrets and restart the Codespace.

**Secrets not being picked up**
→ Secrets set in GitHub are injected at Codespace startup. After adding or changing a secret, stop and restart the Codespace (do not just reload the terminal).

**`npm install` didn't run / node_modules is missing**
→ Run `bash .devcontainer/setup.sh` in the terminal to re-run the setup script.

**TypeScript errors in editor that don't fail the build**
→ Open the Command Palette (`Ctrl+Shift+P`), run `TypeScript: Select TypeScript Version`, and choose **Use Workspace Version**. The `typescript.tsdk` setting in `.devcontainer/devcontainer.json` should handle this automatically on first open.

**Port 3000 not appearing in the Ports tab**
→ The port only appears after `npm run dev` has started the server. Run the dev server first, then check the Ports tab.
