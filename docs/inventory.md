# Inventario del repositorio

> Última actualización: **2026-05-18** · Rama auditada: `main` (HEAD `ee9b1f4`).

Este documento es la fuente única de verdad para responder *"¿qué hay en `main` hoy y qué falta?"*.  
Se actualiza en cada PR que añada o consolide un módulo grande.

---

## 1. Resumen ejecutivo

| Métrica                          | 2026-05-09 | 2026-05-18 (actual) |
|----------------------------------|-----------|---------------------|
| Páginas (`page.tsx`)             | 78        | **~130+**           |
| Endpoints API (`route.ts`)       | 84        | **~100+**           |
| Helpers en `src/lib/`            | 51        | **108**             |
| Archivos de test                 | 29        | **29** (sin cambio) |
| Módulos del panel `/admin`       | 30        | **49+**             |
| Documentos en `docs/`            | 14        | **27**              |

Cambios clave desde el inventario anterior (2026-05-09):

- ✅ **PR #193–195 mergeados**: Video Engine completo, BaseUI stages 1-6, Studio Admin dual-shell, logo unificado.
- ✅ **Cron jobs existentes** (5): expire-trials, integrations-healthcheck, newsletter, refresh-rates, system-health.
- ✅ **OAuth helpers** (lib): `metaOAuth`, `googleOAuth`, `mlOAuth` existen en `src/lib/`; rutas UI pendientes.
- ✅ **marketIntel.ts** existe en `src/lib/` (19 KB).
- ✅ **presupuestos**: helper `src/lib/presupuestos.ts` + `src/lib/budget.ts` + ruta `/admin/presupuestos/`.
- ✅ **integraciones UI**: `/admin/integraciones/` existe y `inteligencia-mercado/` también.
- ✅ **Sesiones**: warning de lint `react-hooks/exhaustive-deps` corregido (PR #196).
- ⚠️ **React Email / Resend**: `src/emails/` y `src/lib/resendCredentials.ts` siguen faltando.
- ⚠️ **Multi-tenant**: `src/lib/tenantContext.ts` no existe; `tenant/domain-resolve` API sí existe.
- ⚠️ **OAuth UI rutas** (start/callback): helpers de lib listos, rutas API siguen pendientes.
- ⚠️ **Lint deprecation**: `next lint` marcado como deprecated desde Next 16; migración a ESLint CLI pendiente.
- ⚠️ **Typecheck**: 0 errores (validado 2026-05-18).

---

## 2. Módulos del panel admin presentes en `main`

Carpetas bajo `src/app/admin/` (49 módulos):

```
acceso-demo · activar · ai-developer · asistente-ia · blog · center · clientes ·
configuracion · cotizaciones · cupones · diagnostico · editor · entregas · envios ·
equipo · errores · estado · extensions · facturas · home · integraciones ·
inteligencia-mercado · inventario · login · manual · materiales · medios · ml ·
modulos · monitor · newsletter · observatory · pagos · pedidos · plan-suspendido ·
presupuestos · productos · proyectos · publicar · publicidad · reportes · reviews ·
saas · seguridad · sesiones · setup · social · sql · testing · tienda · unirse ·
vercel-logs · video-engine
```

---

## 3. Módulos pendientes (deuda activa)

| Módulo / feature                         | Path esperado                                   | Estado       | Prioridad |
|------------------------------------------|-------------------------------------------------|--------------|-----------|
| OAuth UI rutas Mercado Libre             | `src/app/api/admin/ml/oauth/{start,callback}/`  | ⚠️ Lib OK, ruta falta | P1 |
| OAuth UI rutas Google                    | `src/app/api/admin/google/oauth/{start,callback}/` | ⚠️ Lib OK, ruta falta | P1 |
| OAuth UI rutas Meta                      | `src/app/api/admin/meta/oauth/{start,callback}/`  | ⚠️ Lib OK, ruta falta | P1 |
| OAuth UI rutas TikTok                    | `src/app/api/admin/tiktok/oauth/{start,callback}/`| ⚠️ Lib OK, ruta falta | P2 |
| Plantillas React Email (`src/emails/`)   | `src/emails/`                                   | ❌ Falta     | P1 |
| Resend credentials helper                | `src/lib/resendCredentials.ts`                  | ❌ Falta     | P1 |
| Multi-tenant (tabla `tenants`)           | `src/lib/tenantContext.ts`                      | ❌ Falta     | P2 |
| SQL video engine tables ejecutado        | InsForge: `ai_video_engine_runs`                | ⚠️ Script listo, pendiente Ops | P0 |
| E2E smoke `/admin/video-engine`          | Playwright o manual                             | ⚠️ Pendiente QA | P0 |
| Migración ESLint v9 CLI                  | `eslint.config.js`                              | ⚠️ `next lint` deprecated | P2 |
| Fachada de DB anti-lock-in               | `src/lib/db/index.ts`                           | ❌ Falta     | P3 |
| Chilexpress tracking real                | `src/lib/shipping/drivers/chilexpress.ts`       | ⚠️ 3 TODOs   | P2 |
| Upload de archivos MaterialManager      | `src/components/admin/MaterialManager.tsx`      | ⚠️ TODO upload | P2 |

---

## 4. Helpers de seguridad presentes en `main`

| Helper                              | Función                                               |
|-------------------------------------|-------------------------------------------------------|
| `src/lib/adminAuth.ts`              | Sesiones admin firmadas; rate-limit async             |
| `src/lib/adminPasswordHash.ts`      | Verificación scrypt+pepper de password local          |
| `src/lib/adminTotp.ts`              | RFC 6238 + base32 + verifyTotp constant-time          |
| `src/lib/adminTotpCrypto.ts`        | AES-GCM del secret TOTP con HKDF                      |
| `src/lib/adminBackupCodes.ts`       | 10 códigos `XXXX-XXXX-XX`, hashes single-use          |
| `src/lib/adminLoginAudit.ts`        | Audit log fire-and-forget en `admin_login_audit`      |
| `src/lib/adminRateLimitStore.ts`    | Persistente en `admin_login_attempts` + caché lambda  |
| `src/lib/adminPermissions.ts`       | Guards por rol (viewer/admin/superadmin)               |

---

## 5. Cron jobs activos (5)

| Ruta                                     | Función                          |
|------------------------------------------|----------------------------------|
| `src/app/api/cron/expire-trials/`        | Expirar trials de SaaS           |
| `src/app/api/cron/integrations-healthcheck/` | Health de integraciones      |
| `src/app/api/cron/newsletter/`           | Envío programado de boletines    |
| `src/app/api/cron/refresh-rates/`        | Actualizar tasas de cambio       |
| `src/app/api/cron/system-health/`        | Health general del sistema       |

---

## 6. CI / Workflows

| Workflow         | Función                                               |
|------------------|-------------------------------------------------------|
| `ci.yml`         | install → lint → typecheck → test:coverage → build   |
| `e2e.yml`        | Playwright en preview Vercel (`deployment_status`)    |
| `vercel.yml`     | Deploy                                                |
| `docker-image.yml` | Imagen Docker                                       |

---

## 7. Tests

```
tests/
├── api/        (tests de routes/api)
├── content/    (tests de contenido editorial)
├── e2e/        (Playwright: health, home, pwa)
├── stubs/      (mocks compartidos)
├── unit/       (vitest unit tests)
├── billing.test.ts
├── loyalty.test.ts
└── shipping.test.ts
```

Umbrales Vitest: `lines: 18, statements: 18, functions: 40, branches: 70`.  
Aspiración: subir a `60/60/60/80` conforme se cubran helpers con 0 % de cobertura.

---

## 8. Reglas de navegación canónicas

Ver `docs/admin-navigation-canonical.md`.

- `/admin/integraciones` = única fuente de credenciales API.
- `/admin/configuracion` = datos del negocio únicamente.
- `/admin/seguridad` = passkeys/WebAuthn únicamente.
- No duplicar módulos: sidebar canónico en `AdminShell.tsx` + `StudioSidebar.tsx`.
