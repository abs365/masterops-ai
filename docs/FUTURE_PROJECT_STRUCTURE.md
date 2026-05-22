# Future Project Structure

## Workspace Layout

```
C:\Users\Admin\Workspace\
├── projects\
│   ├── masterops-ai\          ← Central command centre (this project)
│   ├── bold-english-coach\    ← Education SaaS platform
│   ├── angel-digital-11plus\  ← 11+ exam prep platform
│   ├── kent-removals\         ← Removals lead gen + dispatch
│   ├── lead-gen-system\       ← General lead generation
│   ├── event-planner-ai\      ← Uber-style event platform (future)
│   ├── shared-libs\           ← Shared TypeScript utilities (future)
│   └── shared-ui\             ← Shared UI component library (future)
```

---

## Naming Conventions

### Projects
- Folder name: `kebab-case` matching the MasterOps slug
- Next.js app name in `package.json`: same as folder name
- Vercel project name: same as folder name
- GitHub repo name: same as folder name
- Supabase project name: Same as folder name

### Slugs (MasterOps projects table)
- Always kebab-case
- Never change a slug after registering — it is the permanent ID
- Examples: `kent-removals`, `bold-english-coach`, `angel-11plus`

---

## Shared Libraries Strategy

### Phase: `shared-libs` (when 2+ projects share logic)

Create when the same utility is needed in 3+ projects:

```
shared-libs/
├── src/
│   ├── monitoring/     ← logSecurityEvent(), logApiUsage()
│   ├── formatting/     ← formatCurrency(), formatDate()
│   ├── validation/     ← email, phone, postcode validators
│   └── types/          ← shared TypeScript types
├── package.json        ← publishable as private npm package
└── tsconfig.json
```

**Deployment options:**
- Local: npm workspaces (monorepo)
- Remote: private npm registry or GitHub packages

### Phase: `shared-ui` (when 3+ projects share components)

```
shared-ui/
├── src/
│   ├── Button/
│   ├── Input/
│   ├── Card/
│   ├── Modal/
│   └── Table/
├── package.json
└── tailwind.config.ts  ← shared design tokens
```

---

## Shared Authentication Strategy (Future)

Currently: each project manages its own auth via Supabase Auth.

**Future option: Unified SSO**
- Use Supabase cross-project JWT verification
- Or deploy a dedicated auth service at `auth.yourdomain.com`
- MasterOps admin access controlled by `ADMIN_EMAILS` env var
- Do not rush this — isolated auth is safer while building

---

## Shared Notification Strategy

Currently: each project has its own Telegram/Resend config.

**MasterOps is the central notification hub:**
- Projects POST security events → MasterOps fires Telegram + email
- Projects should NOT maintain their own duplicate Telegram bots for ops alerts
- Project-level notifications (user-facing emails) remain in each project

---

## Shared Monitoring Strategy

MasterOps is the single source of truth for:
- Project uptime
- API costs
- Security events
- Deployment status
- Daily health reports

Projects do NOT need their own monitoring dashboards.
They only need to expose a `/api/health` endpoint and POST events to MasterOps.

---

## Adding a New Business (Quick Checklist)

1. Create folder: `C:\Users\Admin\Workspace\projects\new-project-name`
2. Scaffold: `npx create-next-app@latest new-project-name --typescript --tailwind --app --src-dir`
3. Follow `docs/NEW_PROJECT_ONBOARDING.md` to register in MasterOps
4. Follow `docs/STANDARD_PROJECT_ENV_TEMPLATE.md` for env structure
5. Add health endpoint
6. Connect security + cost ingest
7. Connect Vercel + GitHub in MasterOps Supabase
