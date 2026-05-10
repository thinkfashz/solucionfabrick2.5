# Changelog

Todos los cambios notables de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog 1.1](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto adhiere a [SemVer 2.0](https://semver.org/spec/v2.0.0.html). Los mensajes de commit siguen [Conventional Commits 1.0](https://www.conventionalcommits.org/es/v1.0.0/).

## [Unreleased]

### Added

- **Cobertura de helpers puros al 0 %** (Fase 6 — segundo ratchet up):
  - `tests/unit/money.test.ts` — `CURRENCIES`, `isCurrencyCode()` (incluye guard contra `__proto__`/`toString`), `convertFromClp()` (errores en rate≤0/NaN/∞, redondeo a decimales del target), `formatMoney()` (es-CL para CLP, fallback `symbol+toFixed` ante locale inválido) y `readCurrencyCookie()` (default, valor válido, `decodeURIComponent`, whitelist).
  - `tests/unit/markdown.test.ts` — `renderMarkdown()` (sanitiza `<script>`/`<style>`/`onerror`/`onload`/`onclick`, tolera null/undefined), `estimateReadingMinutes()` (piso 1 min, ~220 wpm) y `slugify()` (NFD diacritic strip, colapso de separadores, cap 96, drop emoji).
  - `tests/unit/budgetMath.test.ts` — `IVA_RATE`, `computeTotals()` (clamp negativos, shipping/installation pre-IVA, override de `ivaRate`, redondeo CLP), `buildProposal()` (group-by-category, fallback `servicios`, title-case de categorías desconocidas, `docNumber` determinista vs aleatorio, `validityDays` default 15, summary singular/plural, reuso de totals provistos) y `formatCLP()` (no decimals, coerción de no-finitos a 0).
  - `tests/unit/homeSectionKinds.test.ts` — `SECTION_KINDS` (contrato cerrado de 9 kinds, sin duplicados, slugs lowercase).
  - +53 tests, +4 archivos. Cobertura global: lines/statements 21.95 → 23.40, functions 47.18 → 48.78, branches 76.96 → 78.10.
  - Umbrales `vitest.config.ts` subidos a `lines: 22, statements: 22, functions: 47, branches: 77`.
- **Cobertura de helpers puros al 0 %** (Fase 5 — primer ratchet up):
  - `tests/unit/utils.test.ts` — `cn()` (tailwind-merge conflicts, falsy values, clsx-style conditionals) y `buildProductMetaDescription()` (verb por defecto vs custom).
  - `tests/unit/whatsapp.test.ts` — `getWhatsAppNumber()` (env var, fallback, strip de no-dígitos) y `buildWhatsAppLink()` (encoding del mensaje, default).
  - `tests/unit/projects.test.ts` — invariantes de `SEED_PROJECTS` (≥5, ids únicos, campos de display) y aislamiento de `getSeedProjects()` (mutar el resultado no envenena el seed).
  - `tests/unit/social.test.ts` — `MAX_SOCIAL_IMAGES` documentado.
  - +21 tests, +4 archivos. Cobertura global: lines/statements 18 → 21.95, functions 40 → 47.18, branches 70 → 76.96.
- **Documentación de gobernanza** (Fase 4 — `docs/`):
  - `docs/architecture.md` — stack, diagrama Mermaid de alto nivel, capas (frontend público, panel admin, API serverless, datos InsForge), flujos críticos (checkout, login con TOTP, centro de integraciones), workflows CI/CD.
  - `docs/data-model.md` — 36 tablas en `scripts/create-tables.sql` agrupadas por dominio (auth/seguridad admin, commerce, contenido, integraciones, observability/PWA), ERD simplificado de commerce y convenciones de schema.
  - `docs/api.md` — catálogo de los 85 `route.ts` (40 admin + 44 públicos + 1 cron) con verbos, propósito, códigos de error cerrados.
  - `docs/deploy-runbook.md` — pre-deploy checklist, procedimiento Vercel, rollback de aplicación/schema/credenciales, lista canónica de variables de entorno por categoría, smoke tests post-deploy, incident playbook resumido.
  - `docs/metrics-snapshot.md` — foto fija de tamaño (LOC, archivos, módulos, tablas), cobertura (umbrales actuales vs. aspiración), dependencias clave y deuda técnica conocida al 2026-05-09.
  - `docs/migration-plan-postgres.md` — plan reversible en 5 fases de salida de InsForge (auditoría → fachada DB → setup destino → doble escritura → cutover → decommission), disparadores que justificarían ejecutarlo y decisión actual (seguir en InsForge).
  - `docs/integrations/README.md` — índice por proveedor (qué hay en `main` vs. plan), cómo se persisten credenciales (env > DB cifrada > fallback), aliases del map vivo, plantilla para nuevos providers.
  - `docs/admin-manual.md` — manual del operador del panel: bootstrap inicial, operaciones de seguridad (TOTP, backup codes, unlock, audit), inventario de los 30 módulos por área, tareas frecuentes y operaciones de emergencia.
- `CONTRIBUTING.md` con flujo de ramas, Conventional Commits y checklist de PR.
- `.github/PULL_REQUEST_TEMPLATE.md` y plantillas de issue (bug / feature / security).
- `.github/CODEOWNERS` con owners por área (seguridad, integraciones, pagos, infra).
- `docs/inventory.md` con auditoría de módulos en `main` vs. ramas paralelas.
- `CHANGELOG.md` (este archivo).
- **Cifrado AES-256-GCM en reposo para `integrations.credentials`** (`src/lib/integrationsCrypto.ts`):
  - Helpers puros `encryptCredentials` / `decryptCredentials` por valor.
  - Formato wire `enc:v1:iv:tag:ct` (Node `crypto`, sin nuevas dependencias).
  - Opt-in vía `INTEGRATIONS_ENC_KEY` (hex 64, base64 32 bytes o utf-8 32 chars). Sin la env var, los helpers son identidad — retro-compatible.
  - Filas en texto plano pre-existentes pasan a través de `decrypt` sin cambios; la primera escritura post-key re-cifra todos los campos.
  - Tampering rechazado por GCM auth tag; campos corruptos se omiten silenciosamente con log de error (no rompen el panel).
  - Tests: `tests/unit/integrationsCrypto.test.ts` (20 casos: round-trip, idempotencia, retro-compat, key rotation, malformed wire, null/undefined).
- **Pipeline CI unificado** (`.github/workflows/ci.yml`, Fase 3):
  - Una sola corrida por push/PR a `main`: install (`npm ci`) → lint → typecheck → test:coverage (con gate de umbrales) → build.
  - Matriz Node 20.x / 22.x con `cache: npm`, `concurrency` que cancela corridas viejas del mismo branch.
  - Sube `coverage/` como artifact (sólo desde Node 20.x para no duplicar) con retención 14 días.
  - Reemplaza al antiguo `webpack.yml` (que usaba `npm install` sin lockfile y `continue-on-error: true` en lint).

### Changed

- `README.md`: corregida versión de React (de 18 a 19), añadidos scripts `npm`, listado de módulos del panel admin y documentación disponible.
- `docs/inventory.md`: corregido — `/api/admin/integrations`, `metaCredentials.ts` y `vercelClient.ts` **sí están** en `main`. Lo que falta es la UI `/admin/integraciones`.
- `src/app/api/admin/integrations/route.ts`: GET decrypta antes de mascarar; POST encrypta antes del upsert; el merge intermedio descifra valores existentes para que la live-validation (Cloudinary, Meta) vea texto plano.
- Lectores de `integrations.credentials` ahora descifran transparentemente: `src/lib/metaCredentials.ts`, `src/lib/vercelClient.ts`, `src/app/api/admin/cloudinary/route.ts`, `src/app/api/admin/health/route.ts`, `src/app/api/meta/ads/route.ts`.
- **Env-map central para credenciales de integraciones** (`src/lib/integrationsEnvMap.ts`):
  - `INTEGRATIONS_ENV_MAP` documenta, por provider/campo, los alias de variables de entorno aceptados (Meta `META_ACCESS_TOKEN` / `META_AD_ACCOUNT_ID` / `META_FACEBOOK_PAGE_ID`+`META_PAGE_ID` / `META_INSTAGRAM_BUSINESS_ID`; Vercel `VERCEL_API_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID`).
  - Helpers puros `readEnvFromMap(provider, field)` y `envForProvider(provider)` (este último jamás expone el valor, solo el nombre del alias resuelto).
  - `getMetaCredentials()` y `getVercelCredentials()` ahora resuelven sus aliases a través del map (single source of truth) — añadir un alias en el map basta para que el runtime lo lea.
  - `GET /api/admin/integrations`: respuesta enriquecida con `source: 'env'|'db'`, `envVar`, `envManaged`. Providers solo-env (sin fila DB) también aparecen como "Conectado".
  - `POST /api/admin/integrations`: nuevo `409 ENV_VAR_PRESENT` si el body intenta sobrescribir un campo cuyo env var está seteado (con lista de `conflicts: [{field, envVar}]`).
  - UI `/admin/configuracion`: campos env-managed se muestran con etiqueta "gestionado por env (`VAR`)", input deshabilitado y hint explicativa con instrucción para cambiar la variable en Vercel.
  - Tests: `tests/unit/integrationsEnvMap.test.ts` (15 casos: precedencia entre alias, whitespace = unset, providers desconocidos, no-eco de secretos, invariantes del map).
- **Umbrales de cobertura como gate de PR** (`vitest.config.ts`, Fase 3):
  - `coverage.thresholds`: `lines: 18, statements: 18, functions: 40, branches: 70` calibrados al baseline medido el 2026-05-09 (ratchet anti-regresión, no aspiracional). **Subidos en Fase 5 a `lines: 20, statements: 20, functions: 45, branches: 75`** tras añadir tests de los helpers al 0 %.
  - Reporter `lcov` añadido para integraciones futuras (Codecov, SonarCloud, etc.).
  - `coverage/` añadido a `.gitignore`.

### Security

- Defensa en profundidad: un dump pasivo de la base de datos (backup, consola read-only) ya no expone tokens de Meta/Google/TikTok/Cloudinary/Vercel cuando `INTEGRATIONS_ENC_KEY` está configurada. **Importante**: rotar la key invalida todos los valores cifrados; re-introducir cada provider en `/admin/integraciones`.

### Removed

- Archivo vacío `fkdk` (0 bytes) de la raíz.
- Workflow legado `.github/workflows/webpack.yml` (reemplazado por `ci.yml` unificado en Fase 3).

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
