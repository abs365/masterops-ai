# Admin Access Plan

## Current Status (Phase 4)

MasterOps does NOT currently enforce route-level authentication. Any person with the URL can view the dashboard.

**This is acceptable only while:**
- The Vercel deployment URL is not publicly shared
- No sensitive financial or personal data is displayed
- You are the sole user

**This must be fixed before:**
- Sharing the URL with anyone else
- Displaying real lead data, customer information, or financial figures
- Going to full production

---

## Current Protection (Partial)

| Layer | Status | Notes |
|-------|--------|-------|
| Vercel URL obscurity | Partial | URL is not indexed but is guessable |
| `ADMIN_EMAILS` env var | Declared but not enforced in routes | Currently used for display only |
| Supabase RLS | Not configured | Dashboard uses service role key — bypasses RLS |
| Middleware auth | Not implemented | `AGENTS.md` note: proxy.ts replaces middleware.ts |

---

## Recommended Authentication Setup

### Option A: Supabase Auth (Recommended)

1. Enable Supabase Auth in the MasterOps Supabase project
2. Invite `tosinlawal05@gmail.com` as the only user
3. Create `src/app/login/page.tsx` with email/password sign-in form
4. Create `src/proxy.ts` (Next.js 16 uses proxy.ts, not middleware.ts):

```ts
// src/proxy.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim())

  const isProtected = req.nextUrl.pathname.startsWith('/dashboard') ||
                      req.nextUrl.pathname.startsWith('/projects') ||
                      req.nextUrl.pathname.startsWith('/security') ||
                      req.nextUrl.pathname.startsWith('/alerts')

  if (isProtected && (!user || !adminEmails.includes(user.email ?? ''))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = { matcher: ['/((?!_next|api|login|favicon).*)'] }
```

### Option B: Vercel Password Protection (Quick)

For immediate protection without code changes:
1. Go to vercel.com → Project → Settings → Deployment Protection
2. Enable Password Protection
3. Set a strong password
4. Share only with yourself

This is the fastest option but does not support per-user access control.

---

## ADMIN_EMAILS Usage

Currently `ADMIN_EMAILS` is declared but not enforced. Once Supabase Auth is added:

```ts
const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim())
// Check: adminEmails.includes(user.email)
```

Multiple admins: `ADMIN_EMAILS=tosinlawal05@gmail.com,another@email.com`

---

## Future: MFA Recommendation

Once Supabase Auth is active:
1. Enable MFA in Supabase Auth settings
2. Use Supabase TOTP (time-based one-time password)
3. This prevents access even if the password is compromised

---

## TODO

- [ ] Implement `src/proxy.ts` with Supabase Auth check
- [ ] Create `/login` page
- [ ] Enable Supabase Auth in MasterOps project
- [ ] Configure `ADMIN_EMAILS` enforcement in proxy
- [ ] Test that non-admin users cannot access dashboard routes
- [ ] Consider Vercel Password Protection as immediate stopgap
