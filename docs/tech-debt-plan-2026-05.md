# Plan de deuda técnica — Soluciones Fabrick 2.5
> Fecha: 2026-05-18 · Tech Lead review · Tailwind CSS 3.4 (no migrar a v4)

---

## Tabla de priorización (P0–P2)

| ID   | Ítem                                          | Área          | Prioridad | Esfuerzo | Riesgo | Estado     |
|------|-----------------------------------------------|---------------|-----------|----------|--------|------------|
| D-01 | SQL tablas video engine ejecutado en InsForge | Ops           | **P0**    | S        | Bajo   | ⚠️ Pendiente |
| D-02 | E2E smoke `/admin/video-engine`               | QA            | **P0**    | S        | Bajo   | ⚠️ Pendiente |
| D-03 | Warning `react-hooks/exhaustive-deps` sesiones | Lint         | **P0**    | S        | Bajo   | ✅ Resuelto (PR #196) |
| D-04 | Inventario docs actualizado                   | Docs          | **P0**    | S        | Bajo   | ✅ Resuelto (PR #196) |
| D-05 | OAuth rutas UI (ML / Google / Meta)           | Feature       | **P1**    | M        | Medio  | ⚠️ Lib OK, ruta falta |
| D-06 | React Email + Resend helper                   | Feature       | **P1**    | M        | Bajo   | ❌ Falta |
| D-07 | Migración `next lint` → ESLint CLI            | Tooling       | **P1**    | S        | Bajo   | ⚠️ Deprecated |
| D-08 | Chilexpress tracking (3 TODOs)                | Feature       | **P2**    | M        | Medio  | ⚠️ Incompleto |
| D-09 | Multi-tenant `tenantContext.ts`               | Architecture  | **P2**    | L        | Alto   | ❌ Falta |
| D-10 | Cobertura de tests (subir de 18% → 40%)       | QA            | **P2**    | L        | Bajo   | ⚠️ Gradual |
| D-11 | Refactor `productImport.ts` (41 KB)           | Architecture  | **P2**    | L        | Medio  | ⚠️ Monolítico |
| D-12 | Upload archivos `MaterialManager.tsx`         | Feature       | **P2**    | M        | Bajo   | ⚠️ TODO |
| D-13 | Fachada DB anti-lock-in InsForge              | Architecture  | **P3**    | L        | Alto   | ❌ Falta |
| D-14 | OAuth TikTok for Business                     | Feature       | **P3**    | M        | Bajo   | ❌ Falta |

---

## Plan por fases (2 semanas)

### Fase 1 — Quick wins (días 1–2)

**Objetivo:** limpiar deuda de trazabilidad, lint y operaciones inmediatas.  
**Responsable sugerido:** Dev senior + Ops.

| Tarea                                         | ID   | Responsable | Validación                              |
|-----------------------------------------------|------|-------------|-----------------------------------------|
| ✅ Fix `exhaustive-deps` en sesiones           | D-03 | Dev         | `npm run lint` → 0 warnings             |
| ✅ Actualizar `docs/inventory.md`              | D-04 | Dev         | Revisión humana                         |
| ✅ Crear runbook video engine                  | D-01 | Dev/Ops     | Documento `docs/runbook-video-engine-ops.md` |
| Ejecutar SQL en InsForge                      | D-01 | Ops         | `SELECT * FROM ai_video_engine_runs LIMIT 1` |
| Smoke test `/admin/video-engine`              | D-02 | QA          | Checklist sección 3 del runbook         |
| Migrar `next lint` → `eslint` CLI             | D-07 | Dev         | `npm run lint` sin deprecated warning   |

**Output de Fase 1:** PR #196 (este PR) + SQL ejecutado + smoke test.

---

### Fase 2 — Core debt (días 3–7)

**Objetivo:** activar canales de comunicación y OAuth real de los marketplaces principales.

#### 2A — Resend + React Email (D-06)
- `src/lib/resendCredentials.ts` — helper que resuelve `RESEND_API_KEY` desde env/DB (igual que `metaCredentials.ts`)
- `src/emails/` — 2 plantillas: bienvenida y presupuesto
- Wiring: conectar con `/api/send-budget` (ya usa Nodemailer) usando Resend como driver alternativo
- **Sin instalar dependencias nuevas si Nodemailer sigue funcionando**; Resend sería opt-in vía env var `EMAIL_DRIVER=resend`

#### 2B — OAuth rutas API (D-05)
- `src/app/api/admin/ml/oauth/start/route.ts` + `callback/route.ts`  
- `src/app/api/admin/google/oauth/start/route.ts` + `callback/route.ts`  
- `src/app/api/admin/meta/oauth/start/route.ts` + `callback/route.ts`  
- Reutilizar `src/lib/mlOAuth.ts`, `src/lib/googleOAuth.ts`, `src/lib/metaOAuth.ts` (ya existen)
- UI en `/admin/integraciones` — botones "Conectar con ML/Google/Meta"
- **Riesgo bajo**: sólo agrega rutas, no modifica auth middleware

#### 2C — Chilexpress tracking (D-08)
- Mapear `origin/destination` a comunas con el geodata existente
- Implementar `GET /tracking/api/v1.0/tracking/{trackingCode}`
- **Solo si hay acceso a credenciales Chilexpress** — pendiente por acceso

| Tarea                           | Esfuerzo | Dependencia              |
|---------------------------------|----------|--------------------------|
| Resend helper + plantillas      | M (2d)   | `RESEND_API_KEY` en env  |
| OAuth ML rutas                  | M (1d)   | ML app credentials       |
| OAuth Google rutas              | M (1d)   | Google OAuth app         |
| OAuth Meta rutas                | M (1d)   | Meta app credentials     |
| Chilexpress tracking            | M (1d)   | ⚠️ Pendiente por acceso  |

---

### Fase 3 — Hardening (días 8–14)

**Objetivo:** reducir riesgo técnico, subir cobertura, preparar multi-tenant.

#### 3A — Migración ESLint CLI (D-07, ya urgente)
```bash
# Una sola vez:
npx @next/codemod@canary next-lint-to-eslint-cli .
# Genera eslint.config.js + elimina .eslintignore
# Actualizar package.json: "lint": "eslint src/"
```

#### 3B — Cobertura de tests (D-10)
- **Objetivo parcial Fase 3**: subir umbrales de `lines: 18` a `lines: 35`
- Candidatos con 0 %: `budget.ts`, `presupuestos.ts`, `marketIntel.ts`, `social.ts`
- Priorizar helpers que ya tienen smoke tests manuales

#### 3C — Multi-tenant base (D-09)
- `src/lib/tenantContext.ts` — extraer `tenantId` del JWT/sesión admin
- Wiring mínimo: agregar `tenant_id` a las queries de InsForge que aún no lo tienen
- **Riesgo Alto** — hacer en branch aislado con feature flag

#### 3D — Refactor `productImport.ts` (D-11, si hay tiempo)
- Extraer servicios: `src/lib/productImport/scrapers/`, `parsers/`, `validators/`
- No cambiar API pública del módulo — refactor interno
- Esfuerzo L — evaluar ROI antes de comprometer

| Tarea                           | Esfuerzo | Riesgo  | Notas                           |
|---------------------------------|----------|---------|---------------------------------|
| Migración ESLint CLI            | S (0.5d) | Bajo    | Blocker para Next 16            |
| Tests budget/presupuestos       | M (2d)   | Bajo    | Vitest, no cambia lógica        |
| Tests marketIntel               | M (1d)   | Bajo    | Mockear OpenRouter              |
| tenantContext.ts base           | M (2d)   | Alto    | Branch + feature flag           |
| Refactor productImport          | L (4d)   | Medio   | Posponer si no hay capacidad    |

---

## Checklist de ejecución

### Fase 1
- [ ] **Dev** — PR #196 mergeado con lint fix + docs
- [ ] **Ops** — SQL `create-ai-video-engine-tables.sql` ejecutado en InsForge prod
- [ ] **QA** — Smoke test `/admin/video-engine` completado (runbook sección 3)
- [ ] **QA** — Verificar card en `/admin/publicidad/coach`
- [ ] **Dev** — `npm run lint` → 0 warnings
- [ ] **Dev** — `npm run typecheck` → 0 errors

### Fase 2
- [ ] **Dev** — Branch `feat/resend-email-driver` → PR
- [ ] **Dev** — Branch `feat/oauth-routes-ml-google-meta` → PR
- [ ] **Dev** — Branch `feat/chilexpress-tracking` (si hay credenciales)
- [ ] **QA** — Test OAuth flow en preview environment
- [ ] **Ops** — Configurar `RESEND_API_KEY` en Vercel env (si se activa)

### Fase 3
- [ ] **Dev** — Migración ESLint CLI (puede ir en PR independiente)
- [ ] **Dev** — Tests coverage +17% (de 18% a 35%)
- [ ] **Dev** — Branch `feat/tenant-context` aislado
- [ ] **Arch** — Decisión go/no-go en refactor productImport.ts

---

## Matriz de validación final (por cada PR)

| Check           | Comando                   | Criterio de éxito                      |
|-----------------|---------------------------|----------------------------------------|
| TypeScript      | `npm run typecheck`       | 0 errors                               |
| Lint            | `npm run lint`            | 0 warnings, 0 errors                   |
| Build           | `npm run build`           | `✓ Compiled successfully`              |
| Unit tests      | `npm test`                | Sin regresiones                        |
| Smoke funcional | Manual (ver runbook)      | `/admin/video-engine` genera contenido |
| Smoke funcional | Manual                    | `/admin/publicidad/coach` → card Video Engine visible |
| Smoke funcional | Manual                    | `/admin/sesiones` carga correctamente  |

---

## Áreas protegidas (NO tocar sin revisión senior)

- `src/middleware.ts` — CSP, auth gates, rate limiting
- `src/lib/adminAuth.ts`, `adminPasswordHash.ts`, `adminTotp.ts` — auth crítica
- `src/app/api/checkout/`, `src/app/api/mercadopago/` — pagos
- `src/lib/insforge*`, `src/lib/database*` — conexión DB
- Cualquier archivo que maneje `ADMIN_SESSION_SECRET`, `DATABASE_URL`, `MP_ACCESS_TOKEN`
