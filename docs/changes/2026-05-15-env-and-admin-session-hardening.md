# 2026-05-15 — Env & Admin Session Hardening

## Summary

Eliminated insecure fallback secrets and centralized environment variable
validation across the admin panel.

## Changes

### `src/middleware.ts`
- Fixed bug: `crypto.subtle.importKey` was encoding `secret` (possibly
  `undefined`) instead of `signingSecret` (the resolved string).
- Removed misleading inline comment.
- Production now rejects every session when `ADMIN_SESSION_SECRET` is unset
  (rather than silently accepting any HMAC signed with the dev fallback).

### `src/lib/adminAuth.ts`
- Added `getAdminSecretString()`: single source of truth for the raw secret
  string used by OAuth state-signing. Throws in production if the env var is
  missing; warns and returns a dev-only fallback otherwise.

### OAuth API routes (10 files)
All routes under `src/app/api/admin/` that used
`process.env.ADMIN_SESSION_SECRET || 'dev-only-not-secret'` now call
`getAdminSecretString()` from `@/lib/adminAuth` instead:

- `tiktok/oauth/start/route.ts`
- `tiktok/oauth/callback/route.ts`
- `social/oauth/[provider]/start/route.ts`
- `social/oauth/[provider]/callback/route.ts`
- `google/oauth/start/route.ts`
- `google/oauth/callback/route.ts`
- `meta/oauth/start/route.ts`
- `meta/oauth/callback/route.ts`
- `ml/oauth/start/route.ts`
- `ml/oauth/callback/route.ts`

### `src/app/api/admin/invitations/redeem/route.ts`
- Fixed SQL injection: `invitation.rol` in the raw-SQL fallback is now
  validated against an allowlist `['admin', 'viewer', 'superadmin']` before
  interpolation, eliminating the injection vector flagged by Greptile.

### `src/lib/env.ts` (new)
- Centralized server-side env validation (no Zod dependency).
- `validateEnv()`: checks required vars in production, warns about optional ones.
- `getRequiredEnv(key, devFallback?)`: typed accessor that throws in production.
- Marked `server-only` — safe to import in API routes and server components,
  must NOT be imported in Edge middleware.

## Security impact

| Before | After |
|--------|-------|
| Any HMAC signed with `'dev-only-not-secret'` accepted in production | Production rejects sessions if `ADMIN_SESSION_SECRET` is absent |
| OAuth state CSRF check used insecure fallback | Uses `getAdminSecretString()` — throws in production if missing |
| `invitation.rol` interpolated raw into SQL | Validated against allowlist before interpolation |
