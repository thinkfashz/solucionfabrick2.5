# Soluciones Fabrick — checklist de despliegue, staging y campañas

Este documento es la guía operativa para pasar cambios a producción sin repetir el problema de deploys rojos en Vercel.

## 1. Regla principal

Nunca lanzar anuncios fuertes si el último deploy de Vercel no está en `READY` y el admin no marca readiness aceptable.

Antes de campaña:

1. Confirmar que el último deployment de `main` está en `READY`.
2. Entrar al admin y revisar `/api/admin/observability` o el Observatory.
3. Ejecutar smoke test con baja carga.
4. Activar modo campaña si el tráfico va a ser alto.
5. Revisar checkout con una orden de prueba.
6. Revisar Mercado Pago y webhooks.

## 2. Variables obligatorias de producción

Configurar en Vercel → Project → Settings → Environment Variables.

### Seguridad admin

```env
ADMIN_SESSION_SECRET=
ADMIN_PASSWORD_PEPPER=
ADMIN_INIT_SECRET=
INTEGRATIONS_ENC_KEY=
```

Cada una debe tener mínimo 32 caracteres. Recomendado:

```bash
openssl rand -base64 48
```

### InsForge

```env
NEXT_PUBLIC_INSFORGE_URL=
NEXT_PUBLIC_INSFORGE_ANON_KEY=
INSFORGE_API_KEY=
```

`INSFORGE_API_KEY` es necesaria para SQL admin, setup de tablas, stock atómico y operaciones protegidas.

### URL pública

```env
NEXT_PUBLIC_APP_URL=https://solucionesfabrick.com
NEXT_PUBLIC_SITE_URL=https://solucionesfabrick.com
NEXTAUTH_URL=https://solucionesfabrick.com
```

### Mercado Pago

```env
MERCADO_PAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MP_PUBLIC_KEY=
MERCADO_PAGO_WEBHOOK_SECRET=
```

Producción usa token `APP_USR-...`. Sandbox usa `TEST-...`.

### Email y formularios

Usar Resend o SMTP:

```env
RESEND_API_KEY=
```

o

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
```

### Bot protection

```env
TURNSTILE_SECRET_KEY=
```

Sin esta variable, Turnstile queda desactivado por diseño para no romper formularios.

## 3. Modo campaña

Variables de control:

```env
FABRICK_CAMPAIGN_MODE=normal
CAMPAIGN_RETRY_AFTER_SECONDS=300
DISABLE_PUBLIC_AI_CHAT=false
DISABLE_PUBLIC_CHECKOUT=false
DISABLE_PUBLIC_FORMS=false
```

### normal

Todo activo.

```env
FABRICK_CAMPAIGN_MODE=normal
```

### limited

Recomendado para campañas medianas: pausa IA pública y mantiene checkout/formularios.

```env
FABRICK_CAMPAIGN_MODE=limited
```

### catalog

Recomendado si se espera tráfico muy alto o si Mercado Pago/InsForge está inestable: mantiene catálogo y páginas, pausa checkout e IA.

```env
FABRICK_CAMPAIGN_MODE=catalog
```

### Pausas de emergencia

```env
DISABLE_PUBLIC_AI_CHAT=true
DISABLE_PUBLIC_CHECKOUT=true
DISABLE_PUBLIC_FORMS=true
```

## 4. Antes de deploy

En local o preview:

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm deploy:preflight
```

Con URL real/preview:

```bash
BASE_URL=https://preview.vercel.app pnpm load:smoke
```

Criterio mínimo:

- Último deploy `READY`.
- `pnpm typecheck` sin errores.
- `pnpm build` sin errores.
- Smoke test con error rate menor a 2%.
- p95 menor a 2500 ms.

## 5. Después de deploy

Revisar:

```txt
/api/admin/health
/api/admin/observability
/api/tienda/products
/api/productos?limit=3
/api/payments/mp-status
```

Si `/api/admin/observability` devuelve `degraded`, no lanzar campaña.

Si devuelve `watch`, lanzar solo con `FABRICK_CAMPAIGN_MODE=limited`.

Si devuelve `ready`, se puede lanzar normal o limited según presupuesto.

## 6. Ejecución de SQL/setup

Después de cambios de DB:

1. Entrar al admin.
2. Ejecutar setup de tablas.
3. Confirmar que no fallen bloques críticos:
   - `products`
   - `orders`
   - `payment_webhooks`
   - `checkout-atomic-stock`
   - `admin_error_logs`

No activar campañas hasta que esas tablas estén listas.

## 7. Orden de campaña recomendado

### Fase 1 — prueba chica

```env
FABRICK_CAMPAIGN_MODE=limited
```

- $5.000 a $10.000 CLP en anuncios.
- Smoke test cada 15–30 minutos.
- Revisar observatory.

### Fase 2 — campaña normal

```env
FABRICK_CAMPAIGN_MODE=normal
```

Solo si:

- Mercado Pago OK.
- InsForge menor a 900 ms.
- errores última hora menores a 10.
- checkout probado.

### Fase 3 — tráfico fuerte

```env
FABRICK_CAMPAIGN_MODE=catalog
```

Usar si el objetivo es visitas/captura por WhatsApp y no compra inmediata.

## 8. Si Vercel vuelve a fallar

Orden de revisión:

1. Abrir el deployment rojo.
2. Revisar `Build Logs` → `errors only`.
3. Si el error dice `Type error`, corregir TypeScript antes de tocar runtime.
4. Si el error dice `Command "pnpm build" exited`, el cambio no llegó a producción.
5. Esperar el siguiente deployment `READY`.
6. Confirmar que el deployment `READY` esté arriba de los rojos.

Los deploys rojos viejos no se corrigen; quedan como historial. Lo importante es el último deploy verde en producción.

## 9. Rollback

Si producción queda mal:

1. En Vercel → Deployments.
2. Buscar el último deploy `READY` estable.
3. Usar `Promote to Production` o rollback.
4. Activar temporalmente:

```env
FABRICK_CAMPAIGN_MODE=catalog
DISABLE_PUBLIC_AI_CHAT=true
```

5. Revisar `/api/admin/observability`.

## 10. Checklist express

```txt
[ ] Último deploy READY
[ ] pnpm typecheck OK
[ ] pnpm build OK
[ ] pnpm deploy:preflight OK
[ ] pnpm load:smoke OK
[ ] /api/admin/observability ready/watch
[ ] Mercado Pago OK
[ ] InsForge OK
[ ] SQL setup aplicado
[ ] Modo campaña configurado
[ ] WhatsApp visible como fallback
```
