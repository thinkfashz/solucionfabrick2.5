# Prompts ejecutables — Deuda técnica Soluciones Fabrick 2.5
> Generado: 2026-05-18 · Un prompt por módulo · Listos para pegar en Claude Code o cualquier IA con acceso al repo.

---

## CONTEXTO GLOBAL (incluir en TODOS los prompts si la IA no tiene contexto de sesión)

```
Stack: Next.js 15.5 · React 19 · TypeScript strict · Tailwind CSS 3.4 (NO migrar a v4)
· Framer Motion · Vitest · Playwright · InsForge SDK · Vercel deploy
DB: InsForge (Postgres via @insforge/sdk) — cliente en src/lib/insforge.ts
Auth: adminAuth.ts (sesiones firmadas) + WebAuthn/Passkeys + TOTP
Email: Nodemailer (driver actual) + src/emails/ (React Email templates) + src/lib/resendCredentials.ts
Payments: MercadoPago SDK 2.4.0 — NO tocar src/app/api/checkout ni src/app/api/mercadopago
Reglas de oro:
  1. No instalar nuevas dependencias salvo bloqueo real documentado
  2. No tocar package.json sin justificación crítica
  3. No modificar src/middleware.ts, src/lib/adminAuth.ts, src/lib/adminPasswordHash.ts, src/lib/adminTotp.ts
  4. Reutilizar helpers existentes en src/lib/ antes de crear nuevos
  5. Tailwind v3.4 — no usar sintaxis de v4 ni clases que no existan en v3
  6. Cada PR: npm run typecheck (0 errors) + npm run lint (0 warnings) + npm run build (✓)
  7. Sin datos demo/fake hardcodeados
  8. Sin rutas duplicadas — sidebar canónico en AdminShell.tsx + StudioSidebar.tsx
```

---

## D-07 · Migración ESLint CLI (P1 · Esfuerzo S · Riesgo Bajo)

```
Eres un Tech Lead senior trabajando en el repo Soluciones Fabrick 2.5 (Next.js 15, TypeScript strict).

PROBLEMA
El script "lint" en package.json usa "next lint" que está marcado como deprecated en Next.js 15
y será eliminado en Next.js 16. El CLI muestra el siguiente warning en cada ejecución:
  "`next lint` is deprecated and will be removed in Next.js 16."

El proyecto usa ESLint 9.39.4 pero mantiene el formato de configuración viejo (.eslintrc.json).
ESLint 9 espera eslint.config.js (flat config).

ESTADO ACTUAL
- .eslintrc.json — configuración activa con estas reglas:
  {
    "extends": "next/core-web-vitals",
    "rules": {
      "react/no-unescaped-entities": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-style-component-with-dynamic-styles": "off",
      "jsx-a11y/aria-props": "off",
      "jsx-a11y/aria-role": "off"
    },
    "ignorePatterns": [".next/**","node_modules/**","playwright-report/**","test-results/**","public/sw.js"]
  }
- package.json scripts.lint = "next lint"
- .eslintignore existe pero ESLint 9 lo ignora con warning

TAREA
1. Ejecutar la migración oficial del codemod:
   npx @next/codemod@canary next-lint-to-eslint-cli .
   
2. Si el codemod falla o no está disponible, hacer la migración MANUAL:
   a. Crear eslint.config.js (flat config) que sea equivalente exacto al .eslintrc.json actual:
      - Mantener todas las reglas deshabilitadas
      - Mantener todos los ignorePatterns como "ignores"
      - Extender "next/core-web-vitals" usando el nuevo formato flat
   b. Actualizar package.json: "lint": "eslint src/ --max-warnings 0"
   c. Eliminar .eslintrc.json y .eslintignore (ya no se usarán)

3. Verificar que la migración preserva exactamente el mismo comportamiento:
   - npm run lint → "0 warnings, 0 errors" (igual que antes)
   - El warning de deprecation desaparece

RESTRICCIONES
- No cambiar ninguna regla (ni habilitarla ni deshabilitarla) — solo migrar formato
- No cambiar qué archivos se auditan
- No instalar plugins adicionales
- Si el codemod automático genera un eslint.config.js que funciona, úsalo tal cual sin modificar

VALIDACIÓN
✅ npm run lint → sin warnings ni errores
✅ npm run lint → sin el mensaje "next lint is deprecated"
✅ npm run typecheck → 0 errors (no debe cambiar nada de TS)
✅ npm run build → ✓ Compiled successfully

COMMIT
Branch: fix/eslint-cli-migration
Mensaje: "fix(tooling): migrate next lint to ESLint CLI (flat config) — removes Next 16 deprecation warning"
```

---

## D-05 · OAuth rutas UI — Verificación + Completado (P1 · Esfuerzo M · Riesgo Medio)

```
Eres un Tech Lead senior en Soluciones Fabrick 2.5.

CONTEXTO
Las siguientes rutas OAuth YA EXISTEN en el repo (verificado):
- src/app/api/admin/ml/oauth/start/route.ts (99 líneas)
- src/app/api/admin/ml/oauth/callback/route.ts (219 líneas)
- src/app/api/admin/google/oauth/start/route.ts
- src/app/api/admin/google/oauth/callback/route.ts
- src/app/api/admin/meta/oauth/start/route.ts
- src/app/api/admin/meta/oauth/callback/route.ts
- src/app/api/admin/tiktok/oauth/start/route.ts (si existe)

Los helpers de lib también existen:
- src/lib/mlOAuth.ts — buildAuthorizeUrl, generatePkcePair, exchangeAuthCode
- src/lib/googleOAuth.ts — buildAuthorizeUrl (PKCE), refreshAccessToken
- src/lib/metaOAuth.ts — META_DEFAULT_SCOPES, exchangeForLongLivedToken
- src/lib/tiktokOAuth.ts — buildAuthorizeUrl, exchangeAuthCode, listAdvertisers

Lo que HAY QUE VERIFICAR Y COMPLETAR es la UI en /admin/integraciones.

TAREA PARTE A — Auditoría de rutas
1. Leer cada route.ts de OAuth (start + callback) para los 4 proveedores
2. Confirmar que están completos (manejan error, guardan tokens en integrations table)
3. Documentar cualquier ruta incompleta como TODO inline con comentario descriptivo

TAREA PARTE B — UI /admin/integraciones
La página /admin/integraciones/page.tsx debe mostrar:
- Para cada proveedor (ML, Google, Meta, TikTok):
  - Estado de conexión (conectado / no conectado) consultando GET /api/admin/integrations?provider=X
  - Si está conectado: fecha de expiración del token, email/nombre del usuario conectado
  - Si NO está conectado: botón "Conectar con [Proveedor]" que hace GET /api/admin/[proveedor]/oauth/start
  - Si está conectado: botón "Desconectar" que llama DELETE /api/admin/integrations con provider=X
  - Badge de scopes activos (qué permisos tiene el token)

TAREA PARTE C — Manejo de estado post-OAuth
Cuando el callback redirige de vuelta a /admin/integraciones, la página debe:
- Leer el query param ?connected=ml (o google, meta, tiktok) si lo emite el callback
- Mostrar un toast o banner de éxito: "✓ MercadoLibre conectado correctamente"
- Limpiar el query param de la URL sin recargar (useRouter().replace)

RESTRICCIONES
- NO modificar las rutas OAuth existentes si ya están completas
- NO cambiar src/middleware.ts ni el sistema de sesiones admin
- Usar el componente AdminPage/AdminPageHeader de src/components/admin/ui/
- Usar Tailwind v3.4, sin clases de v4
- Reutilizar el pattern de src/app/admin/seguridad/page.tsx para el layout de tarjetas

VARIABLES DE ENTORNO REQUERIDAS (documentar en UI si faltan)
ML:     ML_CLIENT_ID, ML_CLIENT_SECRET, ML_AUTH_DOMAIN (default: auth.mercadolibre.cl)
Google: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
Meta:   META_APP_ID, META_APP_SECRET
TikTok: TIKTOK_APP_ID, TIKTOK_APP_SECRET

Si la variable de entorno requerida no está configurada, mostrar el botón deshabilitado
con tooltip: "Configura [VAR] en Vercel para activar esta integración"

VALIDACIÓN
✅ npm run typecheck → 0 errors
✅ npm run lint → 0 warnings
✅ /admin/integraciones carga sin errores cuando no hay tokens
✅ Cada proveedor muestra "No conectado" o "Conectado" según la DB
✅ El botón "Conectar" dispara el flujo OAuth en una nueva pestaña o misma tab
✅ Post-callback: banner de éxito visible, URL limpia

COMMIT
Branch: feat/oauth-integrations-ui
Mensaje: "feat(integrations): complete OAuth UI for ML/Google/Meta/TikTok with connection status"
```

---

## D-06 · Resend + React Email — Verificación + Driver opt-in (P1 · Esfuerzo M · Riesgo Bajo)

```
Eres un Tech Lead senior en Soluciones Fabrick 2.5.

CONTEXTO
Los siguientes archivos YA EXISTEN (verificado):
- src/lib/resendCredentials.ts — helper para RESEND_API_KEY desde env/DB
- src/lib/resendKeyRotation.ts — rotación de keys con tests en tests/unit/resendKeyRotation.test.ts
- src/emails/WelcomeEmail.tsx — plantilla de bienvenida (React Email)
- src/emails/PresupuestoEmail.tsx — plantilla de presupuesto
- src/emails/NewsletterEmail.tsx — plantilla de newsletter
- src/emails/IntegrationHealthEmail.tsx — plantilla de health de integraciones

El driver de email actual es Nodemailer (src/lib/newsletterSender.ts u otro).

TAREA
1. AUDITAR src/lib/resendCredentials.ts:
   - Confirmar que resuelve RESEND_API_KEY desde env y desde la tabla integrations (provider='resend')
   - Si falta el fallback desde DB, agregar el mismo patrón que metaCredentials.ts usa para META_APP_ID

2. AUDITAR src/emails/*.tsx:
   - Confirmar que compilan sin errores (son React Server Components de React Email)
   - Confirmar que exportan una función default que acepta props tipadas
   - Si alguna plantilla importa @react-email/* y ese paquete NO está en package.json, documentar
     el bloqueo con un TODO claro — NO instalar el paquete sin aprobación del usuario

3. CREAR driver opt-in en src/lib/emailDriver.ts:
   El módulo exporta una función:
   
   export async function sendEmail(opts: {
     to: string;
     subject: string;
     html: string;
     text?: string;
   }): Promise<{ ok: boolean; error?: string }>
   
   Lógica interna:
   - Si process.env.EMAIL_DRIVER === 'resend': usar Resend API (POST https://api.resend.com/emails)
     usando las credenciales de resendCredentials.ts
   - Si process.env.EMAIL_DRIVER === 'smtp' o no definido: usar Nodemailer con las vars existentes
     (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS o lo que ya use el proyecto)
   - Devolver { ok: true } o { ok: false, error: mensaje }
   
4. CONECTAR emailDriver en src/app/api/send-budget/route.ts:
   - Leer el archivo actual y verificar que usa Nodemailer
   - Reemplazar la llamada directa a Nodemailer con sendEmail() de emailDriver.ts
   - El comportamiento es idéntico si EMAIL_DRIVER no está configurado

5. TESTS — crear tests/unit/emailDriver.test.ts:
   - Test: usa Resend cuando EMAIL_DRIVER=resend
   - Test: usa SMTP cuando EMAIL_DRIVER no está definido
   - Test: devuelve { ok: false, error } cuando la API falla
   Mock global.fetch para Resend, mock nodemailer para SMTP.

RESTRICCIONES
- Si @react-email/* no está en package.json, NO instalarlo — documentar como pendiente
- NO instalar resend SDK — llamar la API REST directamente con fetch (sin deps nuevas)
- NO cambiar la lógica de los emails existentes, solo refactorizar cómo se envían
- NO cambiar package.json scripts

VALIDACIÓN
✅ npm run typecheck → 0 errors
✅ npm run lint → 0 warnings
✅ npm test → los nuevos tests pasan
✅ /api/send-budget funciona igual que antes cuando EMAIL_DRIVER no está definido
✅ Si se configura EMAIL_DRIVER=resend + RESEND_API_KEY, usa Resend

COMMIT
Branch: feat/email-driver-resend
Mensaje: "feat(email): add opt-in Resend driver via EMAIL_DRIVER env var, wire into send-budget"
```

---

## D-08 · Chilexpress tracking (P2 · Esfuerzo M · Riesgo Medio)

```
Eres un Tech Lead senior en Soluciones Fabrick 2.5.

ARCHIVO A MODIFICAR
src/lib/shipping/drivers/chilexpress.ts

CONTEXTO
El driver Chilexpress tiene 3 TODOs sin implementar:
1. quote(): necesita mapear origin/destination a códigos de comuna Chilexpress (geodata API)
   y llamar /rating/api/v1.0/rates/courier
2. createShipment(): sin implementar (lanza error)
3. getTracking(): sin implementar (devuelve status: 'unknown')

El archivo carrier.ts en src/lib/shipping/carrier.ts define los tipos:
- CarrierDriver, QuoteRequest, CreateShipmentRequest, TrackingResult, CarrierQuote
- ShippingAddressInput tiene campos: region, comuna, calle, numero, zip

APIs Chilexpress (docs: https://developers.chilexpress.cl/):
- Geodata:    GET /geodata/api/v1.0/coverage-areas?RegionCode={codigo}
- Rating:     POST /rating/api/v1.0/rates/courier
- Transport:  POST /transport-orders/api/v1.0/transport-orders
- Tracking:   GET /tracking/api/v1.0/tracking/{trackingCode}

TAREA
PARTE 1 — Geodata + mapeo de comunas (TODO #1 de quote)
El campo req.origin.comuna y req.destination.comuna llegan como string libre
(ej: "Santiago", "Providencia"). Chilexpress requiere un código numérico de cobertura.

a) Crear función privada en el driver:
   async function getCoverageCode(comuna: string): Promise<string | null>
   - Llama GET /geodata/api/v1.0/coverage-areas?RegionCode=RM (como ejemplo)
   - Busca el área cuyo nombre coincida con la comuna (case-insensitive, normalize)
   - Cachea los resultados en un Map<string, string> (en-memoria, dura vida del proceso)
   - Devuelve null si no encuentra la comuna

b) Implementar quote():
   - Llamar getCoverageCode para origin y destination
   - Si alguno es null, throw con mensaje descriptivo "Comuna '[X]' no encontrada en cobertura Chilexpress"
   - Construir el payload para /rating/api/v1.0/rates/courier:
     {
       "origin": { "countryCode": "CL", "coverageCode": "<code>", "street": req.origin.calle, "number": req.origin.numero },
       "destination": { "countryCode": "CL", "coverageCode": "<code>" },
       "packages": [{ "weight": totalWeight, "height": ..., "width": ..., "length": ... }],
       "serviceType": "EX" // express; si hay otras opciones, devolver todas como array
     }
   - Mapear la respuesta a CarrierQuote[]:
     { carrier: 'chilexpress', service_name, price_clp, estimated_days, currency: 'CLP' }

PARTE 2 — getTracking (TODO #3)
Implementar la llamada real:
   GET /tracking/api/v1.0/tracking/{trackingCode}
   Headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'Accept-language': 'es' }

Mapear la respuesta a TrackingResult:
   {
     carrier: 'chilexpress',
     tracking_code: trackingCode,
     status: 'in_transit' | 'delivered' | 'exception' | 'unknown',
     events: [{ ts, location, description }]
   }

PARTE 3 — createShipment (TODO #2)
Este TODO es el más complejo y requiere credenciales de cliente contratado.
ACCIÓN: En lugar de implementar sin poder probar, agregar un error explícito útil:
   throw new Error(
     'chilexpress:createShipment — requiere CHILEXPRESS_ACCOUNT (código contractual). ' +
     'Contactar a Chilexpress para obtener acceso a /transport-orders.'
   );

PARTE 4 — Tests
Crear tests/unit/chilexpress.test.ts:
- Mock fetch para /geodata y /rating
- Test: quote() devuelve CarrierQuote[] con precio y días estimados
- Test: quote() lanza error si la comuna no existe en geodata
- Test: getTracking() devuelve TrackingResult con eventos
- Test: getTracking() devuelve status:'unknown' si el código no existe (404)
- Test: isConfigured() devuelve false si CHILEXPRESS_API_KEY no está definida

RESTRICCIONES
- NO instalar dependencias nuevas
- NO cambiar la interfaz CarrierDriver en carrier.ts (solo implementar métodos existentes)
- Si la API de Chilexpress devuelve un formato diferente al documentado, adaptarlo
  y dejar un comentario con el campo real
- Si no hay acceso a CHILEXPRESS_API_KEY, los tests DEBEN funcionar con mocks

VARIABLES DE ENTORNO
CHILEXPRESS_API_KEY     — Azure APIM subscription key (obligatoria para funcionar)
CHILEXPRESS_BASE_URL    — default: https://testservices.wschilexpress.com
CHILEXPRESS_ACCOUNT     — código contractual (requerido solo para createShipment)

VALIDACIÓN
✅ npm run typecheck → 0 errors
✅ npm run lint → 0 warnings
✅ npm test → tests de chilexpress pasan con mocks
✅ isConfigured() devuelve false sin la API key (el mock driver sigue activo)
✅ quote() y getTracking() se pueden ejecutar contra el entorno de test de Chilexpress
   con la API key real configurada

COMMIT
Branch: feat/chilexpress-tracking
Mensaje: "feat(shipping): implement Chilexpress quote + tracking, map comunas via geodata API"
```

---

## D-09 · Multi-tenant context (P2 · Esfuerzo L · Riesgo Alto)

```
Eres un Tech Lead senior en Soluciones Fabrick 2.5.

CONTEXTO
Los siguientes archivos YA EXISTEN:
- src/lib/tenant.ts — probablemente define TenantConfig, getTenantById, etc.
- src/lib/tenantProvisioning.ts — provisioning de nuevos tenants
- src/lib/tenant-edge.ts — versión edge-compatible de tenant
- src/app/api/tenant/domain-resolve/ — resolución de dominio a tenant

Lo que NO existe (o está incompleto):
- Un contexto de tenant para las queries del panel admin (las queries admin
  actualmente no filtran por tenant_id en InsForge)
- El JWT de sesión admin NO incluye tenant_id actualmente

PRECAUCIÓN: Este módulo tiene RIESGO ALTO. Debe ir en branch aislado
con feature flag desactivado por defecto.

TAREA PARTE 1 — Auditoría (LEER ANTES DE CAMBIAR CUALQUIER COSA)
1. Leer src/lib/tenant.ts completo — entender qué tipos y funciones define
2. Leer src/lib/tenant-edge.ts — idem
3. Leer src/lib/adminAuth.ts — entender cómo se decodifica la sesión admin
4. Leer src/app/api/admin/me/route.ts — qué devuelve el endpoint de sesión
5. Leer src/lib/insforge.ts — cómo se construye el cliente InsForge
6. Generar un REPORTE de lo que ya existe antes de implementar nada

TAREA PARTE 2 — Completar src/lib/tenantContext.ts
Si el archivo no existe, crearlo. Si existe, completarlo con:

export type AdminTenantContext = {
  tenantId: string | null; // null = superadmin sin tenant específico
  tenantSlug: string | null;
  plan: 'starter' | 'pro' | 'enterprise' | null;
};

export async function getAdminTenantContext(
  sessionSub: string | null
): Promise<AdminTenantContext>
  - Lee el tenant_id del registro de usuario en la tabla users/admins
  - Si sessionSub === 'superadmin' o tiene role=superadmin, devuelve { tenantId: null, ... }
  - Cachea en proceso por TTL 60s (Map<string, {ctx, expiresAt}>)

TAREA PARTE 3 — Feature flag
Crear/verificar ENABLE_MULTI_TENANT en src/lib/env.ts o similar:
   export const MULTI_TENANT_ENABLED = process.env.ENABLE_MULTI_TENANT === 'true';

En getAdminTenantContext: si !MULTI_TENANT_ENABLED, devolver siempre { tenantId: null, ... }

Esto garantiza que si el flag está desactivado, el sistema funciona exactamente igual que hoy.

TAREA PARTE 4 — Wiring mínimo (SOLO CON FEATURE FLAG ACTIVO)
Agregar el contexto en 2-3 queries de ejemplo en src/app/api/admin/productos/route.ts o similar:
   if (MULTI_TENANT_ENABLED && ctx.tenantId) {
     query = query.eq('tenant_id', ctx.tenantId);
   }

NO aplicar a más de 3 archivos en este PR. El rollout completo es un proyecto separado.

TAREA PARTE 5 — Tests
tests/unit/tenantContext.test.ts:
- Test: devuelve null tenantId cuando ENABLE_MULTI_TENANT=false
- Test: devuelve null tenantId para superadmin
- Test: devuelve tenantId correcto para admin regular
- Test: caché TTL funciona (segunda llamada no va a DB)

RESTRICCIONES CRÍTICAS
- NUNCA modificar src/middleware.ts en este PR
- NUNCA modificar src/lib/adminAuth.ts
- El feature flag DEBE estar desactivado por defecto (ENABLE_MULTI_TENANT no configurada = off)
- Si la tabla users/tenants no tiene la columna tenant_id, documentar el migration SQL necesario
  PERO NO ejecutarlo — dejarlo como pendiente explícito
- Máximo 3 archivos de lógica de negocio modificados (solo los ejemplos de wiring)

VALIDACIÓN
✅ npm run typecheck → 0 errors
✅ npm run lint → 0 warnings
✅ npm test → tests de tenantContext pasan
✅ Con ENABLE_MULTI_TENANT no configurada: sistema funciona EXACTAMENTE igual que hoy
✅ No hay regresiones en /admin/productos, /admin/pedidos, /admin/clientes

COMMIT
Branch: feat/tenant-context-base (rama aislada, NO mergear a main sin aprobación senior)
Mensaje: "feat(tenant): add tenantContext with feature flag — disabled by default, no behavior change"
```

---

## D-10 · Cobertura de tests — 18% → 35% (P2 · Esfuerzo L · Riesgo Bajo)

```
Eres un Tech Lead senior en Soluciones Fabrick 2.5.

CONTEXTO
- Test runner: Vitest · configuración en vitest.config.ts
- Umbrales actuales: lines: 18, statements: 18, functions: 40, branches: 70
- Objetivo de esta fase: subir lines/statements a 35 (sin regresiones)
- Los tests existentes están en tests/unit/
- Los helpers cubiertos al 0% estimado (los que NO tienen .test.ts):
  * src/lib/budget.ts — data layer para materiales y cotizaciones
  * src/lib/presupuestos.ts — helper de presupuestos autodestructibles
  * src/lib/social.ts — hub de redes sociales
  * src/lib/whatsapp.ts — integración WhatsApp
  * src/lib/utils.ts — funciones utilitarias genéricas

TAREA
Para cada helper sin cobertura:

--- budget.ts ---
Crear tests/unit/budget.test.ts:
- Leer src/lib/budget.ts completo antes de escribir tests
- Mockear @insforge/sdk con vi.mock('@insforge/sdk', ...)
- Mockear 'server-only' ya está configurado en vitest.config.ts (alias a stub)
- Tests a cubrir:
  * getMaterials(): devuelve [] si DB falla (fail-safe)
  * getMaterials(): mapea correctamente las columnas de InsForge
  * createQuote(): lanza error si campos requeridos faltan
  * computeTotals(): ya cubierto en budgetMath.test.ts — NO duplicar

--- presupuestos.ts ---
Crear tests/unit/presupuestos.test.ts:
- Mock de insforgeAdmin con vi.mock
- Tests a cubrir:
  * createPresupuesto(): genera slug UUID único
  * createPresupuesto(): calcula expires_at = hoy + PRESUPUESTO_TTL_DIAS
  * getPresupuesto(): devuelve null si el slug no existe
  * getPresupuesto(): devuelve null si expires_at < now (expirado)
  * getPresupuesto(): devuelve el objeto si está vigente

--- social.ts ---
Crear tests/unit/social.test.ts (si no existe):
- PRIMERO leer src/lib/social.ts completo
- Identificar las funciones exportadas y sus dependencias
- Mockear fetch global con vi.stubGlobal('fetch', ...)
- Escribir al menos 3 tests funcionales de las funciones más críticas

--- utils.ts ---
Crear tests/unit/utils.test.ts (si no existe):
- PRIMERO leer src/lib/utils.ts completo
- Las funciones utilitarias puras (sin IO) son las más fáciles de testear
- Objetivo: 100% de cobertura en funciones puras
- Para funciones con side effects: al menos test de happy path + error path

REGLAS DE ESCRITURA DE TESTS
- Usar describe/it/expect de Vitest (sin imports de 'describe' — ya en globals:false, importar explícito)
- Mockear SIEMPRE las dependencias externas (DB, fetch, API) — nunca llamadas reales
- Cada test debe ser independiente (beforeEach limpia el mock)
- Nombres descriptivos: it('devuelve null cuando el presupuesto ha expirado', ...)
- NO usar any en los mocks — tipar con Partial<Tipo> o tipos específicos

ACTUALIZAR UMBRALES
Después de agregar los tests, actualizar vitest.config.ts:
   coverage: {
     thresholds: {
       lines: 35,      // era 18
       statements: 35, // era 18
       functions: 40,  // sin cambio
       branches: 70,   // sin cambio
     }
   }

Solo subir el threshold si los tests REALMENTE pasan y la cobertura llega a ese nivel.
Si no llegas al 35%, subir al nivel real alcanzado y documentar la brecha.

VALIDACIÓN
✅ npm test → 0 failures, 0 errors
✅ npm run test:coverage → coverage report muestra lines ≥ 35%
✅ npm run typecheck → 0 errors
✅ Ningún test existente fue modificado (solo se agregan nuevos)

COMMIT
Branch: test/coverage-boost-phase1
Mensaje: "test(coverage): add tests for budget, presupuestos, social, utils — lines 18%→35%"
```

---

## D-11 · Refactor productImport.ts (P2 · Esfuerzo L · Riesgo Medio)

```
Eres un Tech Lead senior en Soluciones Fabrick 2.5.

ARCHIVO OBJETIVO: src/lib/productImport.ts (actualmente ~41 KB)

CONTEXTO
El archivo es un monolito con responsabilidades mezcladas:
- Scraping de URLs (MercadoLibre, Shopify, genérico)
- Parsing de HTML a estructura de producto
- Validación de campos del producto
- Transformación/normalización de datos
- Llamadas a InsForge para guardar/actualizar

Test existente: tests/unit/productImport.test.ts
REGLA: El refactor NO puede romper ningún test existente. La API pública no cambia.

TAREA
FASE 1 — Auditoría (OBLIGATORIA antes de mover cualquier línea)
1. Leer productImport.ts completo
2. Identificar las funciones/clases exportadas (la API pública)
3. Identificar bloques de código que se pueden extraer sin cambiar la API pública
4. Generar un listado de extracción propuesto ANTES de hacer cambios

FASE 2 — Extracción de módulos internos
Crear los siguientes archivos (solo si tiene sentido basado en la auditoría):

src/lib/productImport/
  index.ts           ← re-exporta todo lo que estaba en productImport.ts (backward compat)
  scraper.ts         ← lógica de fetch + extracción de HTML
  parsers/
    mercadolibre.ts  ← parser específico de ML
    generic.ts       ← parser genérico
  validator.ts       ← validación de campos del producto
  normalizer.ts      ← normalización/transformación de datos

REGLA CRÍTICA: src/lib/productImport.ts debe seguir existiendo como re-export:
   // src/lib/productImport.ts
   export * from './productImport/index';
   // NO ELIMINAR ESTE ARCHIVO — muchas partes del codebase lo importan

FASE 3 — Verificar imports
Después del refactor, buscar todos los archivos que importan de '@/lib/productImport':
   grep -r "from '@/lib/productImport'" src/
Verificar que todos siguen funcionando (el re-export debe cubrir todo).

FASE 4 — Tests
- Ejecutar los tests existentes y confirmar 0 failures
- Si hay funciones extraídas que ahora se pueden testear unitariamente, agregar tests:
  tests/unit/productImportScraper.test.ts
  tests/unit/productImportValidator.test.ts

RESTRICCIONES
- La API pública (qué funciones están disponibles via @/lib/productImport) NO puede cambiar
- NO cambiar el nombre de ninguna función exportada
- NO cambiar las firmas de las funciones exportadas
- Si el archivo es difícil de separar sin riesgo, DETENTE y documenta las razones
  — un refactor forzado riesgoso es peor que el monolito
- Máximo un PR por fase (auditoría + propuesta en PR1, extracción en PR2)

VALIDACIÓN
✅ npm run typecheck → 0 errors
✅ npm run lint → 0 warnings
✅ npm test → todos los tests existentes pasan (0 regresiones)
✅ grep -r "from '@/lib/productImport'" src/ → todos los imports resuelven correctamente
✅ npm run build → ✓ Compiled successfully

COMMIT
Branch: refactor/product-import-modular
Mensaje: "refactor(productImport): extract scraper/parsers/validator into submodules, keep public API"
```

---

## D-12 · Upload archivos MaterialManager (P2 · Esfuerzo M · Riesgo Bajo)

```
Eres un Tech Lead senior en Soluciones Fabrick 2.5.

ARCHIVO OBJETIVO: src/components/admin/MaterialManager.tsx

CONTEXTO
En la línea ~376 existe este TODO sin implementar:
   // TODO: const url = await uploadToStorage(file);

El componente necesita subir imágenes de materiales a Cloudinary.

Ya existe en el proyecto:
- src/app/api/admin/cloudinary/route.ts — endpoint para subir a Cloudinary desde admin
- src/lib/cloudinaryCredentials.ts (o similar) — helper de credenciales
- El módulo /admin/medios ya tiene upload funcional a Cloudinary

TAREA
PARTE 1 — Auditoría
1. Leer MaterialManager.tsx completo para entender el flujo actual de imágenes
2. Leer src/app/api/admin/cloudinary/route.ts para entender el endpoint
3. Leer cómo /admin/medios hace el upload (src/app/admin/medios/MediaAdmin.tsx o similar)
4. Identificar el campo del formulario donde se elige la imagen (input type=file)

PARTE 2 — Implementar uploadToStorage
En MaterialManager.tsx, reemplazar el TODO con:

async function uploadMaterialImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  // Opcional: agregar folder/tag para organizar en Cloudinary
  formData.append('folder', 'materiales');

  const res = await fetch('/api/admin/cloudinary', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Upload falló: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.url as string; // URL segura de Cloudinary
}

PARTE 3 — Wiring en el formulario
1. Encontrar el input type="file" en el componente (línea ~519 según TODO)
2. En el onChange del input: llamar uploadMaterialImage(file) al seleccionar un archivo
3. Mostrar estado de carga: spinner/disabled mientras sube
4. Al completar: guardar la URL en el estado local del form (setImageUrl o similar)
5. Si falla: mostrar el error en el form (no silenciar)

PARTE 4 — UX de preview
Agregar preview de imagen seleccionada antes de guardar:
- Si hay URL (ya guardada): mostrar <img src={url} className="..." />
- Mientras sube: mostrar un spinner con texto "Subiendo..."
- Si hay error: mostrar mensaje + botón "Reintentar"

RESTRICCIONES
- Usar el endpoint EXISTENTE /api/admin/cloudinary — NO crear uno nuevo
- NO instalar dependencias para file upload — usar fetch + FormData nativo
- NO cambiar el schema del formulario de materiales (campos existentes)
- Si /api/admin/cloudinary no soporta folder param, omitirlo — no modificar el endpoint
- Tailwind v3.4 para los estilos de preview

VALIDACIÓN
✅ npm run typecheck → 0 errors
✅ npm run lint → 0 warnings
✅ Seleccionar una imagen en el form → se sube a Cloudinary → URL se guarda en el form
✅ Si Cloudinary no está configurado → error descriptivo visible (no crash silencioso)
✅ La imagen subida aparece en /admin/medios?tab=cloudinary

COMMIT
Branch: feat/material-image-upload
Mensaje: "feat(materials): implement image upload to Cloudinary in MaterialManager"
```

---

## D-13 · Fachada DB anti-lock-in InsForge (P3 · Esfuerzo L · Riesgo Alto)

```
Eres un Tech Lead senior en Soluciones Fabrick 2.5.

CONTEXTO
El proyecto usa InsForge SDK directamente en ~60+ archivos:
   import { createClient } from '@insforge/sdk';
   const client = createClient(process.env.INSFORGE_URL!, process.env.INSFORGE_ANON_KEY!);

Si en el futuro se migra a otro proveedor (Supabase, PlanetScale, etc.), habría que
modificar 60+ archivos. Una fachada centraliza ese cambio en un único lugar.

YA EXISTE: src/lib/insforge.ts y src/lib/adminApi.ts que hacen algo de esto.
Leer ambos ANTES de crear nada nuevo.

TAREA PARTE 1 — Auditoría (OBLIGATORIA)
1. Leer src/lib/insforge.ts completo
2. Leer src/lib/adminApi.ts relevante (las funciones de DB)
3. Determinar si ya existe una fachada suficiente o parcial
4. Contar cuántos archivos importan createClient directamente:
   grep -r "from '@insforge/sdk'" src/ | wc -l
5. Generar reporte: "la fachada existente cubre X%, falta Y%"

TAREA PARTE 2 — Completar/crear src/lib/db/index.ts (SOLO si no existe fachada suficiente)
Si src/lib/insforge.ts ya centraliza el cliente, NO crear src/lib/db/index.ts.
Si hay duplicación real, crear:

// src/lib/db/index.ts
export { insforge as db, insforgeAdmin as dbAdmin } from '@/lib/insforge';
// Re-export para que los nuevos archivos usen @/lib/db en vez de @/lib/insforge

TAREA PARTE 3 — Migración gradual (SOLO 5 archivos como piloto)
Elegir 5 archivos que importen @insforge/sdk directamente y migrarlos a usar
el helper centralizado. Los 5 deben ser archivos sin tests o de bajo riesgo.

RESTRICCIONES CRÍTICAS
- NUNCA romper un archivo existente — solo agregar la capa, no forzar la migración
- Si src/lib/insforge.ts ya es la fachada, el entregable es documentarlo y NO crear más capas
- Riesgo Alto = máximo 5 archivos piloto en este PR, el resto en PRs futuros
- No cambiar la lógica de queries, solo la forma de importar el cliente

VALIDACIÓN
✅ npm run typecheck → 0 errors
✅ npm run lint → 0 warnings
✅ npm run build → ✓ Compiled successfully
✅ Los 5 archivos piloto funcionan igual que antes

COMMIT
Branch: refactor/db-facade-pilot
Mensaje: "refactor(db): centralize InsForge client via db facade — pilot 5 files"
```

---

## D-14 · TikTok OAuth — Verificación y rutas (P3 · Esfuerzo M · Riesgo Bajo)

```
Eres un Tech Lead senior en Soluciones Fabrick 2.5.

CONTEXTO
Los siguientes archivos YA EXISTEN (verificado):
- src/lib/tiktokOAuth.ts — buildAuthorizeUrl, exchangeAuthCode, listAdvertisers, signState, verifyState
- tests/unit/tiktokOAuth.test.ts — tests del helper
- src/app/api/admin/tiktok/ — directorio existe

Verificar si las rutas OAuth (start + callback) están completas o si solo existe el directorio.

TAREA PARTE 1 — Auditoría
1. Listar src/app/api/admin/tiktok/:
   ls src/app/api/admin/tiktok/
2. Si existen start/route.ts y callback/route.ts: leerlos y verificar si están completos
3. Leer src/lib/tiktokOAuth.ts completo para entender las funciones disponibles
4. Leer las rutas equivalentes de ML como referencia:
   src/app/api/admin/ml/oauth/start/route.ts (99 líneas)
   src/app/api/admin/ml/oauth/callback/route.ts (219 líneas)

TAREA PARTE 2 — Completar rutas (si faltan)
Si start/route.ts no existe, crearlo siguiendo el patrón de ML:
- Verificar sesión admin con getAdminSession
- Verificar que TIKTOK_APP_ID esté configurado
- Generar state firmado con signState
- Construir URL de autorización con buildAuthorizeUrl
- Redirigir al usuario a TikTok for Business

Si callback/route.ts no existe, crearlo:
- Verificar state con verifyState
- Intercambiar code por token con exchangeAuthCode
- Obtener lista de advertisers con listAdvertisers
- Guardar token encriptado en tabla integrations (provider='tiktok')
- Redirigir a /admin/integraciones?connected=tiktok

TAREA PARTE 3 — Variables de entorno
TIKTOK_APP_ID      — App ID de TikTok for Business
TIKTOK_APP_SECRET  — App Secret

Si no están en el proyecto, documentar en src/lib/tiktokOAuth.ts con getTikTokAppId() similar
a los otros OAuth helpers.

RESTRICCIONES
- NO cambiar src/lib/tiktokOAuth.ts si los tests pasan (solo agregar si falta algo)
- Seguir el MISMO patrón que mlOAuth — copy/adapt, no inventar
- NO instalar TikTok SDK oficial — usar fetch directo con las URLs del helper existente
- Variables de entorno sin valor por defecto — si no están configuradas, devolver 400 con mensaje claro

VALIDACIÓN
✅ npm run typecheck → 0 errors
✅ npm run lint → 0 warnings
✅ npm test → tests de tiktokOAuth.test.ts siguen pasando
✅ GET /api/admin/tiktok/oauth/start (sin TIKTOK_APP_ID) → 400 { error: "TIKTOK_APP_ID no configurada" }
✅ Con TIKTOK_APP_ID configurado → redirige a TikTok authorization URL

COMMIT
Branch: feat/tiktok-oauth-routes
Mensaje: "feat(integrations): complete TikTok OAuth routes following ML pattern"
```

---

## PROMPT MAESTRO — Para ejecutar todo el plan en orden

```
Eres el Tech Lead senior de Soluciones Fabrick 2.5. Tienes el plan completo de deuda técnica
en docs/tech-debt-plan-2026-05.md y los prompts detallados en docs/prompts-tech-debt.md.

SECUENCIA DE EJECUCIÓN (de menor a mayor riesgo):

SEMANA 1:
1. D-07: Migración ESLint CLI (30 min) — branch: fix/eslint-cli-migration
2. D-12: Upload imágenes MaterialManager (4h) — branch: feat/material-image-upload
3. D-06: Email driver Resend opt-in (4h) — branch: feat/email-driver-resend
4. D-08: Chilexpress tracking (6h) — branch: feat/chilexpress-tracking

SEMANA 2:
5. D-05: OAuth integraciones UI (8h) — branch: feat/oauth-integrations-ui
6. D-10: Coverage de tests 18%→35% (8h) — branch: test/coverage-boost-phase1
7. D-11: Refactor productImport fase 1/auditoría (4h) — branch: refactor/product-import-modular
8. D-14: TikTok OAuth rutas (2h) — branch: feat/tiktok-oauth-routes

POST-SEMANA 2 (branch aislado, requiere aprobación):
9. D-09: Multi-tenant context (branch: feat/tenant-context-base)
10. D-13: DB facade piloto (branch: refactor/db-facade-pilot)

REGLAS DE EJECUCIÓN:
- Cada ítem es un PR independiente — NO mezclar cambios de distintos ítems
- Antes de empezar cada ítem: leer los archivos mencionados, no asumir su contenido
- Si un archivo "faltante" ya existe, auditarlo primero antes de crear uno nuevo
- Si algo es más complejo de lo esperado: crear un PR de "auditoría" documentando el estado
  real y las opciones — mejor documentar que implementar mal
- Después de cada PR: npm run typecheck + npm run lint + npm run build
- Los PRs de Fase 2 y 3 requieren revisión humana antes de merge a main

ÁREAS PROTEGIDAS (NUNCA tocar en estos PRs):
- src/middleware.ts
- src/lib/adminAuth.ts, adminPasswordHash.ts, adminTotp.ts
- src/app/api/checkout/, src/app/api/mercadopago/
- Cualquier var: ADMIN_SESSION_SECRET, DATABASE_URL, MP_ACCESS_TOKEN
```
