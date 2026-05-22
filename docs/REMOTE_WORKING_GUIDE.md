# Remote Working Guide

This guide explains how to work on MasterOps (and all monitored projects) from any device, anywhere.

## The Core Principle

Your PC is not your workspace — the cloud is.
Code lives in GitHub. Apps run on Vercel. Data lives in Supabase.
You only need a browser and internet access.

---

## Option 1: GitHub Codespaces (Recommended)

Work from any browser without installing anything locally.

1. Go to https://github.com/your-username/masterops-ai
2. Click **Code → Codespaces → New codespace**
3. Codespaces opens a full VS Code environment in the browser
4. Run: `npm install && npm run dev`
5. Codespaces forwards the port — click **Open in Browser**

**Add your environment variables:**
- In Codespaces: Settings → Secrets → Add secrets matching `.env.example`

---

## Option 2: Another Laptop

1. Install Node.js (v20+) and Git
2. `git clone https://github.com/your-username/masterops-ai`
3. `cd masterops-ai && npm install`
4. Copy `.env.example` to `.env.local` and fill in values
5. `npm run dev`

---

## Option 3: Vercel (Production)

The deployed version runs 24/7 at your Vercel URL.
No laptop needed to view the dashboard — just open it in any browser.

- Dashboard: `https://masterops-ai.vercel.app/dashboard`
- No setup needed after initial deployment

---

## How to Check Logs Remotely

**Vercel logs:**
1. Go to vercel.com → your project → Deployments
2. Click any deployment → View logs

**Supabase logs:**
1. Go to supabase.com → your project
2. Database → Logs

**MasterOps dashboard:**
- Open `/alerts` to see all current issues
- Open `/security` for security events

---

## How to Roll Back a Deployment

1. Go to vercel.com → masterops-ai → Deployments
2. Find the last working deployment
3. Click the `...` menu → **Promote to Production**

Or via CLI from any machine:
```bash
npx vercel rollback
```

---

## How to Update Environment Variables Safely

**Never commit `.env.local` to Git.**

To update a variable in production:
1. Go to vercel.com → Project → Settings → Environment Variables
2. Edit the variable
3. Redeploy: push a new commit or click **Redeploy** in Vercel

To update locally:
1. Edit `.env.local`
2. Restart the dev server

---

## How to Trigger a Manual Health Check Remotely

From any device with a browser:

1. Open your MasterOps production URL
2. Go to `/projects`
3. Click **Run Check Now**

Or call the API directly:
```
GET https://masterops-ai.vercel.app/api/monitor/check-projects?secret=YOUR_CRON_SECRET
```

This checks all projects and updates their status instantly.

---

## How Scheduled Monitoring Runs Without You

Once a cron is configured (see `docs/CRON_SETUP.md`), MasterOps runs health checks automatically every 5–10 minutes. You don't need to be online.

You'll receive Telegram alerts if any project goes down.

---

## Checklist: Before Leaving Your Main PC

- [ ] Push all uncommitted changes: `git add -A && git commit -m "wip" && git push`
- [ ] Verify Vercel deployment succeeded
- [ ] Confirm `.env.local` is NOT in git (`git status`)
- [ ] Note your Supabase project URL and anon key (stored in Vercel env vars)
- [ ] Confirm Telegram notifications are working (send a test alert)

---

## Emergency Access (Phone/Tablet)

1. Open your Vercel production URL in any browser
2. The MasterOps dashboard works on mobile
3. You can view alerts, project status, and security events
4. You cannot run dev commands on mobile — use Codespaces for that
