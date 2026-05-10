# Snapshot de métricas

> Última actualización: **2026-05-09** · Rama auditada: `copilot/assess-app-value-and-market-price` (HEAD).

Foto fija de números actuales del repositorio. Útil para due diligence y para responder _"¿qué tan grande es esta aplicación hoy?"_.

---

## 1. Tamaño

| Métrica                              | Valor    | Comando para regenerar                                              |
|--------------------------------------|----------|----------------------------------------------------------------------|
| Archivos `.ts` + `.tsx`              | ≈ 470    | `find src -name "*.ts" -o -name "*.tsx" \| wc -l`                    |
| Líneas TypeScript en `src/`          | **63 760** | `find src -name "*.ts" -o -name "*.tsx" \| xargs wc -l \| tail -1` |
| Páginas (`page.tsx`)                 | **78**   | `find src/app -name "page.tsx" \| wc -l`                             |
| Endpoints API (`route.ts`)           | **85**   | `find src/app -name "route.ts" \| wc -l`                             |
| ↳ Admin (`/api/admin/*`)             | 40       | `find src/app/api/admin -name "route.ts" \| wc -l`                   |
| ↳ Públicos (`/api/*` no admin)       | 44       | `find src/app/api -name "route.ts" -not -path "*admin*" \| wc -l`    |
| ↳ Cron                               | 1        | `find src/app/api/cron -name "route.ts" \| wc -l`                    |
| Helpers en `src/lib/`                | **51**   | `ls src/lib/*.ts src/lib/*.tsx \| wc -l`                             |
| Módulos del panel `/admin`           | 30       | (carpetas en `src/app/admin/`)                                       |
| Tablas Postgres declaradas           | **36**   | `grep -E "CREATE TABLE IF NOT EXISTS" scripts/create-tables.sql \| wc -l` |
| Líneas DDL en `scripts/create-tables.sql` | 1 016 | `wc -l scripts/create-tables.sql`                                    |
| Workflows GitHub Actions             | 4        | `ls .github/workflows/ \| wc -l`                                     |

---

## 2. Tests y cobertura

| Métrica                              | Valor                                | Notas                                          |
|--------------------------------------|--------------------------------------|------------------------------------------------|
| Archivos de test                     | **31** (`tests/**/*.test.*`)         | 29 unit/api + 3 raíz (`billing`/`loyalty`/`shipping`) — el conteo histórico de `inventory.md` decía 29 pre-Fase-3. |
| Frameworks                           | Vitest (unit/api) + Playwright (e2e) |                                                |
| Cobertura — `lines`                  | umbral CI: **18 %**                  | Calibrado al baseline 2026-05-09 (Fase 3, ratchet anti-regresión). |
| Cobertura — `statements`             | umbral CI: **18 %**                  |                                                |
| Cobertura — `functions`              | umbral CI: **40 %**                  |                                                |
| Cobertura — `branches`               | umbral CI: **70 %**                  |                                                |
| Aspiración del plan                  | 60 % global / 80 % en `src/lib/`     | Subir por etapas a medida que se cubran helpers al 0 % (`apiHandler.ts`, `budget.ts`, `mercadoPagoCredentials.ts`, `projects.ts`, `social.ts`, `utils.ts`, `whatsapp.ts`). |

> Los umbrales actuales **no** son aspiracionales, son la línea base. Subir el ratchet sólo cuando se añaden tests; nunca bajarlo.

---

## 3. Dependencias (extracto de `package.json`)

| Categoría     | Paquetes clave                                                                              |
|---------------|---------------------------------------------------------------------------------------------|
| Framework     | `next@15`, `react@19`, `react-dom@19`                                                       |
| BaaS          | `@insforge/sdk@^1.2.5`                                                                      |
| 3D / anim     | `three`, `@react-three/fiber@^9`, `@react-three/drei@^10`, `framer-motion@^12`, `gsap@^3`, `animejs@^3` |
| State / utils | `zustand`, `clsx`, `class-variance-authority`                                              |
| UI primitives | `@radix-ui/react-{slot,switch,tabs}`                                                        |
| Errores       | `@sentry/nextjs@^10`                                                                        |
| Analytics     | `@vercel/analytics@^2`                                                                      |
| Markdown      | `gray-matter`, `cheerio`                                                                    |
| Tests         | `vitest`, `@vitest/coverage-v8`, `playwright`                                              |

---

## 4. Hardening del admin (snapshot)

| Capa                                  | Estado en `main`             |
|---------------------------------------|------------------------------|
| Password local scrypt+pepper          | ✅                           |
| TOTP RFC 6238 (AES-GCM al secret)     | ✅                           |
| Backup codes single-use (10 × `XXXX-XXXX-XX`) | ✅                    |
| Rate-limit persistente (`admin_login_attempts`) | ✅                  |
| Audit log (`admin_login_audit`, enum cerrado) | ✅                    |
| CLIs de operación (`admin:set-password`, `admin:enable-totp`, `admin:disable-totp`, `admin:generate-backup-codes`) | ✅ |
| Cifrado AES-GCM de `integrations.credentials` (Fase 2A) | ✅ (opt-in vía `INTEGRATIONS_ENC_KEY`) |
| Env-map central de credenciales (Fase 2B) | ✅                       |
| Pipeline CI unificado + ratchet de cobertura (Fase 3) | ✅            |

---

## 5. Deuda técnica conocida (visible al 2026-05-09)

| Área                              | Nota                                                                                       |
|-----------------------------------|--------------------------------------------------------------------------------------------|
| Tablas duplicadas EN/ES           | `productos` ⇆ `products`; `blog_posts` ⇆ `posts`; `coupons` ⇆ `cupones`. Convergencia pendiente. |
| Helpers al 0 % cobertura           | `apiHandler.ts`, `budget.ts`, `mercadoPagoCredentials.ts`, `projects.ts`, `social.ts`, `utils.ts`, `whatsapp.ts`. |
| Módulos del plan no fusionados    | UI `/admin/integraciones`, OAuth ML/Google/Meta/TikTok, presupuestos, healthcheck cron, market intel, Resend, fachada DB, multi-tenant (ver `docs/inventory.md §3`). |
| Sin tool de migración formal      | Todo el DDL vive en `scripts/create-tables.sql` (idempotente). Migrar a `drizzle`/`prisma migrate` solo si se acepta la salida de InsForge. |
| Lock-in de InsForge               | `src/lib/insforge.ts` instancia el SDK en todo el codebase. Una capa `db/index.ts` está planificada pero no fusionada. |

---

## 6. Cómo regenerar este snapshot

```bash
# 1. Tamaño:
find src -name "*.ts" -o -name "*.tsx" | wc -l
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1
find src/app -name "page.tsx" | wc -l
find src/app -name "route.ts" | wc -l

# 2. Tablas:
grep -E "CREATE TABLE IF NOT EXISTS" scripts/create-tables.sql | wc -l
wc -l scripts/create-tables.sql

# 3. Tests:
find tests -name "*.test.*" | wc -l

# 4. Cobertura local:
npm run test:coverage
# ↳ El reporte queda en coverage/ (HTML + lcov + text-summary).
```

Actualizar la tabla y la fecha del header en cualquier PR que cambie estos números de manera material (>5 % en cualquier métrica).
