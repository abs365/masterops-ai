# Backup Policy

## Supabase Automatic Backups

Supabase Pro plan includes daily backups with 7-day retention.
Check backup status at: Supabase Dashboard → Project → Database → Backups

## Manual Backup Procedure

Run this SQL query in Supabase SQL Editor to export critical data:

```sql
-- Copy this output and save to a secure location
select * from projects;
select * from alerts;
select * from security_events;
select * from daily_reports;
```

## Backup Schedule

| Data | Frequency | Location |
|------|-----------|----------|
| Supabase DB | Daily (automatic) | Supabase cloud |
| Environment variables | On change | Vercel + secure password manager |
| Code | Every commit | GitHub |

## Recovery Procedure

1. Go to Supabase → Database → Backups
2. Select restore point
3. Click Restore
4. Verify app connects successfully
5. Check alerts for any data inconsistencies

## What is NOT Backed Up Automatically

- `.env.local` files — store in a password manager
- Local development data — push all changes to GitHub

## Backup Status API

MasterOps exposes `/api/backups/status` which will query Supabase Management API in Phase 2.
