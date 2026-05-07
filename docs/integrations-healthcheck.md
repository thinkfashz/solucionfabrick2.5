# Cron diario: health-check de integraciones

`/api/cron/integrations-healthcheck` corre **una vez al día a las 09:00 UTC**
(`0 9 * * *`, configurado en `vercel.json`). El plan Hobby de Vercel solo
permite crons diarios — para cadencias más finas hay que migrar al plan
Pro o disparar el endpoint desde un cron externo.

## Qué hace

Para cada proveedor con credenciales configuradas, ejecuta el mismo runner
que `/api/admin/integrations/test`:

| Provider | Runner | Señales que produce |
|---|---|---|
| `resend` | `runResendChecks` | dominios verificados, formato `from`, dominio del remitente |
| `openrouter` | `runOpenRouterChecks` | usage en USD, limit, free tier |
| `serper` | `runSerperChecks` | créditos restantes (header `x-ratelimit-remaining`) |
| `serpapi` | `runSerpApiChecks` | búsquedas restantes, plan, uso del mes |
| `whatsapp` | `runWhatsAppChecks` | quality rating, verificación, permiso `whatsapp_business_messaging` |
| `mercadolibre` | check de expiración | alerta cuando faltan ≤72 h para que caduque el access_token |

## Persistencia

- **`integration_health_log`**: una fila por proveedor con el JSON
  completo de checks. Permite ver regresiones históricas (por ejemplo
  quality rating GREEN → YELLOW).
- **`integration_quota_snapshots`**: última fila por proveedor con el
  par (used, quota_limit). Alimenta `<QuotaBar />` en la cabecera de
  cada tarjeta del centro de integraciones.

Las dos tablas se crean en `scripts/create-tables.sql`.

## Alertas por email

Si al menos un proveedor falla, envía **un único email consolidado** a
`ADMIN_ALERT_EMAIL` usando Resend (con la plantilla
`src/emails/IntegrationHealthEmail.tsx`). Si todo está OK no se envía
nada — el cron es silencioso por diseño para no spamear.

## Variables de entorno requeridas

| Variable | Obligatoria | Para qué |
|---|---|---|
| `CRON_SECRET` | Sí (en Vercel) | Vercel Cron lo envía como `Authorization: Bearer …` |
| `ADMIN_ALERT_EMAIL` | Sí | Destinatario de las alertas. Sin esto el cron corre pero no avisa por email. |
| `RESEND_API_KEY` (o tarjeta Resend) | Sí | Para enviar la alerta. |
| `RESEND_FROM` | Recomendado | Remitente verificado. Si falta usa `onboarding@resend.dev` (sandbox). |
| `NEXT_PUBLIC_SITE_URL` | Opcional | Se incluye como link al panel en el cuerpo del email. |

## Disparo manual

Un admin autenticado puede correr el cron desde el navegador (la sesión
admin sustituye al `CRON_SECRET`):

```
GET https://<tu-dominio>/api/cron/integrations-healthcheck
```

La respuesta JSON contiene `failures`, `results[]` y la confirmación de
si se persistió y si se envió email.

## Por qué solo 09:00 UTC

Vercel Hobby limita los crons a una vez al día. Cualquier expresión
sub-diaria hace fallar el deploy con _"Hobby accounts are limited to
daily cron jobs"_. Si necesitas más frecuencia, migra a Pro o programa
una llamada HTTP externa (GitHub Actions, cron de tu VPS) apuntando al
mismo endpoint con el header `Authorization: Bearer $CRON_SECRET`.
