# AI Continuity Plan — solucionfabrick2.5

## Purpose

This document lets a new AI session pick up where the last one left off without losing context about decisions made, problems solved, and work remaining.

## Current state (2026-05-15)

### Completed

- [x] WhatsNewBanner crash fix (remove `<style jsx>`, use globals.css animation)
- [x] Demo visitor analytics: `DemoSessionTracker` component + `/api/admin/demo/events` + equipo analytics section
- [x] SaaS module at `/admin/saas`
- [x] PR #169, #170, #171 created and merged
- [x] ADMIN_SESSION_SECRET hardening: no insecure fallback in production
- [x] `getAdminSecretString()` in adminAuth.ts — single source of secret string
- [x] 10 OAuth routes updated to use `getAdminSecretString()`
- [x] SQL injection fix in `invitations/redeem/route.ts` (invitation.rol validated against allowlist)
- [x] `src/lib/env.ts` — centralized env validation, server-only
- [x] middleware.ts bug fixed: was encoding `secret` (possibly undefined) instead of `signingSecret`
- [x] Error handling added to equipo page (handleDeleteInvitation, handleApprove, handleReject, handleSetRole, handleRevokeDemo)
- [x] `/admin/unirse` UX improvements: mobile-safe layout (100dvh), touch targets ≥52px, password visibility toggle, password strength indicator, email keyboard/autocomplete attrs, iOS-safe video

### Remaining / known issues

- [ ] `token` column must be added to `admin_invitations` table in InsForge:
  ```sql
  ALTER TABLE admin_invitations ADD COLUMN IF NOT EXISTS token uuid;
  ```
  This requires manual execution in InsForge SQL editor — cannot be done from code.

- [ ] E2E tests (`pnpm test`) — pre-existing failures due to `node_modules` not installed in dev environment. Run `pnpm install` first.

- [ ] Greptile 5/5 score — remaining issues (if any) after the SQL injection fix should be re-scanned.

## Files changed in the last session

```
src/middleware.ts                                  # Edge HMAC bug fixed
src/lib/adminAuth.ts                              # getAdminSecretString() added
src/lib/env.ts                                    # new — server-only env validation
src/app/api/admin/invitations/redeem/route.ts     # SQL injection fixed
src/app/api/admin/tiktok/oauth/start/route.ts     # getAdminSecretString()
src/app/api/admin/tiktok/oauth/callback/route.ts  # getAdminSecretString()
src/app/api/admin/social/oauth/[provider]/start/route.ts    # getAdminSecretString()
src/app/api/admin/social/oauth/[provider]/callback/route.ts # getAdminSecretString()
src/app/api/admin/google/oauth/start/route.ts     # getAdminSecretString()
src/app/api/admin/google/oauth/callback/route.ts  # getAdminSecretString()
src/app/api/admin/meta/oauth/start/route.ts       # getAdminSecretString()
src/app/api/admin/meta/oauth/callback/route.ts    # getAdminSecretString()
src/app/api/admin/ml/oauth/start/route.ts         # getAdminSecretString()
src/app/api/admin/ml/oauth/callback/route.ts      # getAdminSecretString()
src/app/admin/equipo/page.tsx                     # try/catch on all mutation functions
src/app/admin/unirse/page.tsx                     # full UX rewrite for mobile/iPhone
docs/changes/2026-05-15-env-and-admin-session-hardening.md
docs/AI_PROJECT_MEMORY.md
docs/AI_SESSION_GUIDE.md
docs/AI_CONTINUITY_PLAN.md (this file)
```
