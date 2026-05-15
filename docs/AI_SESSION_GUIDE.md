# AI Session Guide — solucionfabrick2.5

## Before starting any task

1. Run `git status` and `git log --oneline -5` to know which branch and commit you're on.
2. Read `docs/AI_PROJECT_MEMORY.md` for architectural invariants.
3. Check `docs/changes/` for recent significant changes.

## Branch rules

- **Feature work**: always on `feat/admin-panel-full-upgrade-v2`
- **Push target**: `claude/new-session-ZsZp0` on `thinkfashz/solucionfabrick2.5`
- Never push to `main` directly.

## Edge middleware constraints

`src/middleware.ts` runs on the Edge runtime:
- Cannot import `node:crypto`, `Buffer`, or any Node.js built-in
- Cannot import `src/lib/adminAuth.ts` (uses `timingSafeEqual` from `node:crypto`)
- Cannot import `src/lib/env.ts` (marked `server-only`)
- Must use `crypto.subtle` (Web Crypto API) for all cryptography

## Common tasks

### Adding a new admin API route
1. Import session validation from `@/lib/adminAuth` (`decodeSession`, `ADMIN_COOKIE_NAME`)
2. Check `payload.rol` for role-based access
3. Use `insforgeAdmin` (not `insforge`) for DB operations that need service-key access
4. Wrap all `fetch` / DB calls in try/catch with `showToast` error feedback

### OAuth state signing
All OAuth routes use `getAdminSecretString()` from `@/lib/adminAuth` — never read `ADMIN_SESSION_SECRET` directly with a fallback.

### Env vars
- Required in production: `ADMIN_SESSION_SECRET`, `INSFORGE_API_KEY`, `NEXT_PUBLIC_INSFORGE_URL`
- Optional with warning: `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`
- Use `getRequiredEnv()` from `src/lib/env.ts` for typed access (server-only)

## What NOT to do

- Do not add `|| 'dev-only-not-secret'` fallbacks anywhere — use `getAdminSecretString()` instead
- Do not import from `src/lib/adminAuth.ts` or `src/lib/env.ts` inside middleware
- Do not interpolate unvalidated strings into raw SQL — validate against allowlists first
- Do not create RLS policies using `current_setting()` — InsForge doesn't support it
