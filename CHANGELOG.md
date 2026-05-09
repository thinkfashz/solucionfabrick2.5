# Changelog

Todos los cambios notables de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog 1.1](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto adhiere a [SemVer 2.0](https://semver.org/spec/v2.0.0.html). Los mensajes de commit siguen [Conventional Commits 1.0](https://www.conventionalcommits.org/es/v1.0.0/).

## [Unreleased]

### Added

- `CONTRIBUTING.md` con flujo de ramas, Conventional Commits y checklist de PR.
- `.github/PULL_REQUEST_TEMPLATE.md` y plantillas de issue (bug / feature / security).
- `.github/CODEOWNERS` con owners por área (seguridad, integraciones, pagos, infra).
- `docs/inventory.md` con auditoría de módulos en `main` vs. ramas paralelas.
- `CHANGELOG.md` (este archivo).

### Changed

- `README.md`: corregida versión de React (de 18 a 19), añadidos scripts `npm`, listado de módulos del panel admin y documentación disponible.

### Removed

- Archivo vacío `fkdk` (0 bytes) de la raíz.

---

## [0.1.0] — 2026-05-09

Línea base. Primera versión "etiquetable" del repositorio para fines de gobernanza y due diligence. Resume el estado actual de `main`.

### Added — núcleo público

- Landing pública (`/`), `tienda`, `soluciones`, `proyectos`, `evolucion`, `garantias`, `contacto`, `mi-cuenta`, `producto/[id]`, `auth`, `checkout`.
- PWA manifest (`app/manifest.ts`), `sitemap.ts`, `robots.ts`.
- Carrito en `localStorage` con `zustand`.
- Hero animado (GSAP + Anime.js) y mapa embebido en contacto.

### Added — panel admin

- Layout `/admin` con módulos: `blog`, `clientes`, `configuracion`, `cotizaciones`, `editor`, `entregas`, `envios`, `equipo`, `errores`, `estado`, `facturas`, `home`, `inventario`, `login`, `manual`, `materiales`, `medios`, `observatory`, `pagos`, `pedidos`, `productos`, `proyectos`, `publicar`, `publicidad`, `reportes`, `setup`, `sql`, `tienda`, `unirse`, `vercel-logs`.

### Added — seguridad del admin

- TOTP 2FA (RFC 6238) con cifrado AES-GCM del secret y CLIs `admin:enable-totp` / `admin:disable-totp`.
- Códigos de respaldo TOTP (10 códigos `XXXX-XXXX-XX`, hash scrypt+pepper, single-use) vía CLI `admin:generate-backup-codes`.
- Verificación local de password con scrypt + pepper, en capa adicional sobre `insforge.auth.signInWithPassword`. CLI `admin:set-password` (stdin-only).
- Rate-limit persistente del login en tabla `admin_login_attempts` (con caché en memoria por lambda).
- Audit log de login en tabla `admin_login_audit` con outcome cerrado (`success | rate_limited | unknown_user | invalid_password | totp_required | totp_invalid | totp_decrypt_failed | not_approved | misconfigured | bad_request | error`).

### Added — observabilidad y CI

- Vitest con `@vitest/coverage-v8` (29 archivos de test en `tests/`).
- Playwright E2E (`tests/e2e/{health,home,pwa}.spec.ts`) y workflow `e2e.yml` contra previews de Vercel.
- Sentry (`@sentry/nextjs`) habilitado solo en `NODE_ENV=production` con DSN configurado.
- Vercel Analytics (`@vercel/analytics`).
- Workflows: `webpack.yml` (build matrix Node 20/22), `vercel.yml`, `docker-image.yml`, `e2e.yml`.

### Added — documentación

- `docs/cms-universal.md`, `docs/comparaciones.md`, `docs/insforge-edge-functions-ecommerce.md`, `docs/perf-runtime.md`, `docs/push-notifications.md`, `docs/security-private-mode.md`.
- `AGENTS.md` (instrucciones de agentes IA en el repo) y `AUDIT.md` (auditoría histórica).

### Stack

- Next.js 15.5.15 (App Router) · React 19 · TypeScript 5 · Tailwind 3.4.17.
- InsForge SDK 1.2.5 como BaaS principal (PostgreSQL via PostgREST + Auth + Storage).
- Mercado Pago 2.4 para pagos. Cloudinary opcional para media. Resend / Nodemailer para email.

[Unreleased]: https://github.com/thinkfashz/solucionfabrick2.5/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/thinkfashz/solucionfabrick2.5/releases/tag/v0.1.0
