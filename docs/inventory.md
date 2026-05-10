# Inventario del repositorio

> Última actualización: **2026-05-09** · Rama auditada: `copilot/assess-app-value-and-market-price` (HEAD del repo en este momento).

Este documento es la fuente única de verdad para responder *"¿qué hay en `main` hoy y qué falta?"*. Se actualiza en cada PR que añada o consolide un módulo grande.

---

## 1. Resumen ejecutivo

| Métrica                                  | Valor en `main` hoy |
|------------------------------------------|---------------------|
| Páginas (`page.tsx`)                     | **78**              |
| Endpoints API (`route.ts`)               | **84**              |
| Helpers en `src/lib/`                    | **51**              |
| Archivos de test                         | **29**              |
| Módulos del panel `/admin`               | **30**              |
| Workflows de GitHub Actions              | **4**               |
| Documentos en `docs/`                    | **14**              |

Veredicto rápido: el núcleo público + panel admin base + endurecimiento de seguridad del login están **en `main`**. Adicionalmente, **un centro de integraciones de _backend_ ya existe** (`/api/admin/integrations` con CRUD para meta/google/google_ads/tiktok/cloudinary/vercel + helpers `metaCredentials` y `vercelClient`). Los módulos avanzados que **siguen faltando** son: UI `/admin/integraciones`, OAuth de marketplaces, presupuestos auto-destructibles, healthcheck cron, inteligencia de mercado, Resend, multi-tenant. Se rastrean abajo.

---

## 2. Módulos del panel admin presentes en `main`

Carpetas bajo `src/app/admin/`:

```
blog · clientes · configuracion · cotizaciones · editor · entregas · envios ·
equipo · errores · estado · facturas · home · inventario · login · manual ·
materiales · medios · observatory · pagos · pedidos · productos · proyectos ·
publicar · publicidad · reportes · setup · sql · tienda · unirse · vercel-logs
```

(30 módulos.) Cada uno contiene su propio `page.tsx` + componentes locales.

---

## 3. Módulos esperados según el plan maestro pero **NO** presentes en `main`

Estos módulos están descritos en notas internas y/o en sesiones previas, pero al auditar la rama actual no existen sus carpetas/archivos. Hasta que se fusionen o se vuelvan a implementar, **no deben asumirse como parte de la app de producción**.

| Módulo / feature                                  | Path esperado                                                       | Estado en `main` |
|---------------------------------------------------|---------------------------------------------------------------------|------------------|
| UI Centro de integraciones                        | `src/app/admin/integraciones/`                                      | ❌ Falta (el _backend_ `/api/admin/integrations/route.ts` sí existe) |
| Inteligencia de mercado                           | `src/app/admin/inteligencia-mercado/`                               | ❌ Falta         |
| Presupuestos auto-destructibles                   | `src/app/admin/presupuestos/`, `src/app/p/[slug]/`                  | ❌ Falta         |
| OAuth Mercado Libre                               | `src/app/api/admin/ml/oauth/{start,callback}/`                      | ❌ Falta         |
| OAuth Google                                      | `src/app/api/admin/google/oauth/{start,callback}/`                  | ❌ Falta         |
| OAuth Meta (Facebook/Instagram)                   | `src/app/api/admin/meta/oauth/{start,callback}/`                    | ❌ Falta         |
| OAuth TikTok for Business                         | `src/app/api/admin/tiktok/oauth/{start,callback}/`                  | ❌ Falta         |
| Cron diario healthcheck de integraciones          | `src/app/api/cron/integrations-healthcheck/`                        | ❌ Falta         |
| Plantillas React Email                            | `src/emails/`                                                       | ❌ Falta         |
| Helper de cifrado AES-GCM de credenciales         | `src/lib/integrationsCrypto.ts`                                     | ✅ Añadido en Fase 2A |
| Mapa de env vars de integraciones                 | `src/lib/integrationsEnvMap.ts`                                     | ✅ Añadido en Fase 2B |
| Helpers de market intel                           | `src/lib/marketIntel.ts`, `src/lib/seoSuggestions.ts`               | ❌ Falta         |
| Helper de presupuestos                            | `src/lib/presupuestos.ts`                                           | ❌ Falta         |
| Caché de importación de productos                 | `src/lib/productImportCache.ts`                                     | ❌ Falta (sí existe `productImport.ts` para el _runtime_, no la caché 24h) |
| Resend (email transaccional + rotación de keys)   | `src/lib/resendCredentials.ts`, `src/lib/resendKeyRotation.ts`      | ❌ Falta         |
| Fachada de DB (anti-lock-in InsForge)             | `src/lib/db/index.ts`, `src/lib/db/postgres.ts`                     | ❌ Falta         |
| Multi-tenant (tabla `tenants`, middleware)        | `src/lib/tenantContext.ts`                                          | ❌ Falta         |
| Helper meta credentials                           | `src/lib/metaCredentials.ts`                                        | ✅ Sí está en `main` |
| Cliente Vercel                                    | `src/lib/vercelClient.ts`                                           | ✅ Sí está en `main` |

---

## 4. Helpers de seguridad de admin **sí** presentes en `main`

Estos sí están integrados (último commit en HEAD de la rama actual: `feat(security): TOTP backup codes` + `docs(security): backup codes runbook`).

| Helper                                             | Función                                                       |
|----------------------------------------------------|---------------------------------------------------------------|
| `src/lib/adminAuth.ts`                             | Sesiones admin firmadas; rate-limit async                    |
| `src/lib/adminPasswordHash.ts`                     | Verificación scrypt+pepper de password local                  |
| `src/lib/adminTotp.ts`                             | RFC 6238 + base32 + verifyTotp constant-time                  |
| `src/lib/adminTotpCrypto.ts`                       | AES-GCM del secret TOTP con HKDF(`ADMIN_SESSION_SECRET`)      |
| `src/lib/adminBackupCodes.ts`                      | 10 códigos `XXXX-XXXX-XX`, hashes single-use                  |
| `src/lib/adminLoginAudit.ts`                       | Audit log fire-and-forget en `admin_login_audit`              |
| `src/lib/adminRateLimitStore.ts`                   | Persistente en `admin_login_attempts` + caché por lambda      |

---

## 5. Estado de las ramas remotas

- El clon local de la sesión actual es **shallow** y solo expone la rama `copilot/assess-app-value-and-market-price`.
- Vía API de GitHub se observan **150+ ramas** activas/en preview en el remoto, en su mayoría con prefijo `copilot/*` y `claude/*` correspondientes a sesiones previas.
- **Ninguna** rama visible en el último listado tiene un nombre que refleje los módulos de la sección 3 (no aparecen `integraciones`, `oauth`, `presupuestos`, `market-intel`, `healthcheck`, `resend`).

> **Implicación:** asumir que esos módulos hay que **(re)implementarlos**, no simplemente "fusionarlos". Antes de planificar la Fase 2 de consolidación, hay que ejecutar `git fetch --all --prune` desde una sesión con acceso completo al remoto y hacer `git branch -r | grep -i <módulo>` para confirmar qué se puede recuperar de ramas vivas vs. qué hay que reimplementar desde el plan.

---

## 6. CI / workflows

Archivos en `.github/workflows/`:

- `ci.yml` — **Pipeline unificado** (Fase 3): install → lint → typecheck → test:coverage (con gate de umbrales) → build, matriz Node 20.x / 22.x, sube `coverage/` como artifact.
- `e2e.yml` — Playwright contra previews de Vercel cuando `deployment_status === success`.
- `vercel.yml` — Deploy.
- `docker-image.yml` — Imagen Docker.

`webpack.yml` fue retirado en Fase 3 (reemplazado por `ci.yml`).

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

- Total: **29 archivos** de test.
- `vitest.config.ts` declara umbrales calibrados al baseline medido el 2026-05-09 (Fase 3, ratchet anti-regresión): `lines: 18, statements: 18, functions: 40, branches: 70` global. La aspiración del plan original (`60` global / `80` para `src/lib/`) se sube por etapas conforme se cubran helpers actualmente al 0 % (`apiHandler.ts`, `budget.ts`, `mercadoPagoCredentials.ts`, `projects.ts`, `social.ts`, `utils.ts`, `whatsapp.ts`, …).

---

## 8. Documentación

`docs/`:

- `cms-universal.md`
- `comparaciones.md`
- `insforge-edge-functions-ecommerce.md`
- `perf-runtime.md`
- `push-notifications.md`
- `security-private-mode.md`
- `architecture.md` *(Fase 4)*
- `data-model.md` *(Fase 4)*
- `api.md` *(Fase 4)*
- `deploy-runbook.md` *(Fase 4)*
- `metrics-snapshot.md` *(Fase 4)*
- `migration-plan-postgres.md` *(Fase 4)*
- `admin-manual.md` *(Fase 4)*
- `integrations/README.md` *(Fase 4 — índice; falta un archivo por proveedor)*
- `preview/` (capturas de Home y Tienda usadas por el README)

**Pendiente** publicar (Fase 4 del plan):

- ~~`architecture.md` (diagrama Mermaid + flujos)~~ ✅ Añadido en Fase 4.
- ~~`deploy-runbook.md` (runbook de deploy + rollback)~~ ✅ Añadido en Fase 4.
- ~~`admin-manual.md` (manual del operador del panel)~~ ✅ Añadido en Fase 4.
- ~~`data-model.md` (ERD)~~ ✅ Añadido en Fase 4.
- ~~`api.md` (catálogo de los 84 endpoints)~~ ✅ Añadido en Fase 4 (catálogo actualizado a 85).
- ~~`integrations/` (uno por proveedor)~~ 🟡 Índice `integrations/README.md` añadido; falta un archivo por proveedor (a crear cuando se fusione cada módulo del plan).
- ~~`migration-plan-postgres.md` (plan de salida de InsForge)~~ ✅ Añadido en Fase 4.
- ~~`metrics-snapshot.md`~~ ✅ Añadido en Fase 4.
