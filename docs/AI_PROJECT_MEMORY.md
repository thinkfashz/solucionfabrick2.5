# AI Project Memory — solucionfabrick2.5

## Stack

- **Framework**: Next.js 15 App Router, React 19, TypeScript strict
- **Styling**: TailwindCSS v4
- **Database/Auth**: InsForge (Supabase-compatible API)
  - `insforge` = anon/public client
  - `insforgeAdmin` = service-key client (server-only)
- **Email**: Resend (`RESEND_API_KEY`, `RESEND_FROM`)
- **Deployment**: Vercel

## Auth model

Sessions are HMAC-SHA256 signed cookies:
- Cookie name: `admin_session`
- Format: `base64url(payload).base64url(hmac_sig)`
- Secret: `ADMIN_SESSION_SECRET` env var (required in production)
- TTL: 8 hours

Roles: `superadmin` > `admin` > `viewer` (viewer = 24h demo, read-only)

## Key invariants

- **Edge middleware** (`src/middleware.ts`) must stay Edge-compatible — no Node.js imports. `adminAuth.ts` uses `node:crypto` and is NOT importable there.
- **`getAdminSecretString()`** in `src/lib/adminAuth.ts` is the single source of the raw secret string for OAuth state signing.
- **`src/lib/env.ts`** is `server-only` — import only in API routes and server components, never in middleware.
- InsForge does NOT support `current_setting()` for RLS — use application-layer tenant isolation only.

## Tenant resolution

- Platform hosts (`fabrick.cl`, `*.fabrick.cl`, `localhost`, IPs): slug from subdomain
- Custom domains: DB lookup via `/api/tenant/domain-resolve`, cached in `x-cd-tenant` cookie (5 min)
- Suspended/cancelled tenants: 402 page for custom domains; `/admin/plan-suspendido` for admin sessions

## Active feature branch

`feat/admin-panel-full-upgrade-v2` → target: `claude/new-session-ZsZp0`

## DB tables (key ones)

- `admin_users` — email, nombre, rol, aprobado, tenant_id
- `admin_invitations` — email, token (uuid), codigo (6-digit), rol, invitado_por, expira_at, usado
- `admin_login_attempts` — rate limiting (ip, count, blocked_until)
- `demo_access_tokens` — 24h viewer tokens with usage tracking
- `demo_session_events` — page enter/leave events for demo visitors
- `integrations` — encrypted OAuth credentials per provider
