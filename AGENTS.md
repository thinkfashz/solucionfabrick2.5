---
description: Project instructions for AI agents working on Soluciones Fabrick
globs: *
alwaysApply: true
---

# Soluciones Fabrick · Agent Instructions

## Read this first

Before changing frontend UI, read and apply:

- `skills/design-taste-frontend/SKILL.md`
- `.github/copilot-instructions.md`
- `.cursor/rules/design-taste-frontend.mdc`
- `CLAUDE.md`

## Default design read

Soluciones Fabrick is a Next.js/React/Tailwind 3.4 app for public store, checkout, admin, SaaS and quotation flows. The main QA targets are Android, iPhone and PC/desktop.

Use a premium dark commercial language: black/zinc base, Fabrick yellow as brand accent, green only for buy/pay/success.

## Mandatory frontend rules

- Mobile-first: test mentally at 360-430px width first, then iPhone/Safari and PC/desktop.
- Do not create generic template-looking UI.
- Do not duplicate actions in the same viewport.
- Do not use random icons as brand/logo.
- Use clear hierarchy: title, helper, primary action.
- Avoid heavy blur, giant shadows and infinite animations on product lists.
- Keep Tailwind CSS 3.4; do not upgrade to v4.
- Do not import new UI libraries without checking `package.json`.
- Do not touch SQL/RLS/migrations unless explicitly requested.

## Store priorities

For `/tienda` and product pages, prioritize:

- search and filters
- category
- price
- stock
- cart/bolso
- checkout
- optional GPS support
- clean mobile drawer
- responsive desktop layout that does not feel like stretched mobile

## Pre-flight

Before finishing any UI task, verify:

- Android vertical works
- iPhone/Safari mobile works
- PC/desktop spacing and grids work
- text is not clipped
- contrast is readable
- CTA is obvious
- no duplicate CTA intent
- no fake logo
- no floating bubble blocks checkout/cart/menu
- Vercel build remains compatible

---

# Existing MCP / InsForge Notes

The following legacy notes remain for MCP/InsForge integration work only. Ignore them unless the task explicitly involves InsForge SDK or MCP infrastructure.

## InsForge SDK Documentation - Overview

InsForge is a backend-as-a-service platform providing database, authentication, storage, AI, functions and realtime APIs.

### Important Notes

- For auth: use `auth-sdk` for custom UI, or framework-specific components for pre-built UI.
- SDK returns `{data, error}` structure for all operations.
- Database inserts require array format: `[{...}]`.
- Serverless functions have single endpoint.
- Storage: upload files to buckets, store URLs in database.
- AI operations are OpenAI-compatible.
- Extra important: this project uses Tailwind CSS 3.4; do not upgrade to v4.
