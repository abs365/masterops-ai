# Project Access Register

This document records what credentials MasterOps uses to connect to each monitored project.
Update this whenever a new token or key is added.

---

## MasterOps Itself

| Credential | Location | Notes |
|-----------|----------|-------|
| Supabase URL | Vercel env: NEXT_PUBLIC_SUPABASE_URL | MasterOps-specific project |
| Supabase Anon Key | Vercel env: NEXT_PUBLIC_SUPABASE_ANON_KEY | Read-only for dashboard |
| Supabase Service Key | Vercel env: SUPABASE_SERVICE_ROLE_KEY | Write access for API routes |
| Admin emails | Vercel env: ADMIN_EMAILS | tosinlawal05@gmail.com |

---

## How to Add a Project URL

1. Go to Supabase → Table Editor → `projects`
2. Find the project row, click Edit
3. Set the `url` field to the live URL (e.g. `https://lead-gen-system.vercel.app`)
4. Save — MasterOps will pick it up on the next health check cycle

---

## Lead Gen System

| Credential | Purpose | Status |
|-----------|---------|--------|
| Health check URL | Monitor uptime | Not configured |
| GitHub token (read) | View repo status | Not configured |
| Vercel project ID | Deployment status | Not configured |

---

## Bold English Coach

| Credential | Purpose | Status |
|-----------|---------|--------|
| Health check URL | Monitor uptime | Not configured |
| GitHub token (read) | View repo status | Not configured |
| Vercel project ID | Deployment status | Not configured |
| Supabase project ID | DB stats | Not configured |

---

## Angel 11Plus

| Credential | Purpose | Status |
|-----------|---------|--------|
| Health check URL | Monitor uptime | Not configured |
| GitHub token (read) | View repo status | Not configured |
| Vercel project ID | Deployment status | Not configured |

---

## Connection Rule

MasterOps NEVER receives write access to any monitored project's database.
All connections are read-only or outbound HTTP only.
