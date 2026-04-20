# Notificaciones push (Web Push)

Este proyecto soporta **notificaciones push web** mediante VAPID + Web Push API.
La característica está **apagada por defecto** y sólo se activa si las tres
variables de entorno siguientes están presentes en producción.

## 1. Generar un par de claves VAPID

```bash
npx web-push generate-vapid-keys
```

Salida de ejemplo:

```
=======================================
Public Key: BLC8...sZ3Y
Private Key: kCq...xY2M
=======================================
```

## 2. Configurar variables de entorno

| Variable | Ámbito | Descripción |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | **cliente + servidor** | Clave pública (base64url). Se sirve al cliente a través de `/api/push/public-key`. |
| `VAPID_PRIVATE_KEY` | servidor | Clave privada. **Nunca** exponer en bundles de cliente. |
| `VAPID_SUBJECT` | servidor | `mailto:` o `https://` propiedad del operador. Ej: `mailto:ops@solucionesfabrick.com`. |

En Vercel: *Settings → Environment Variables*, crear las tres con el ámbito
correspondiente (la pública también en *Production* y *Preview*).

## 3. Crear la tabla `push_subscriptions` en InsForge

Tabla mínima (columnas sugeridas):

| columna | tipo | notas |
|---|---|---|
| `id` | uuid pk | `default gen_random_uuid()` |
| `endpoint` | text unique not null | URL del push service |
| `p256dh` | text not null | llave pública base64url del cliente |
| `auth` | text not null | secreto de autenticación base64url |
| `user_agent` | text null | para diagnóstico |
| `created_at` | timestamptz default now() | |

Crear un índice único sobre `endpoint` para evitar duplicados en subscribe.

## 4. Endpoints disponibles

| Ruta | Método | Auth | Descripción |
|---|---|---|---|
| `/api/push/public-key` | GET | — | Devuelve `{ enabled, publicKey }`. |
| `/api/push/subscribe` | POST | — | Persiste `{ subscription: PushSubscriptionJSON }`. |
| `/api/push/unsubscribe` | POST | — | Borra por `{ endpoint }`. |
| `/api/push/send` | POST | **admin** | Cuerpo: `{ title, body, url?, icon?, tag? }`. Envía a todos los suscriptores. |

Si las VAPID env vars no están configuradas, los endpoints devuelven **503** y
el componente cliente `PushOptIn` se oculta automáticamente.

## 5. Enviar una notificación manual

```bash
curl -X POST https://www.solucionesfabrick.com/api/push/send \
  -H "content-type: application/json" \
  -H "cookie: admin_session=…" \
  -d '{"title":"Nuevo caso publicado","body":"Lee la ampliación en Linares","url":"/casos/ampliacion-linares-38m2"}'
```

## 6. Flujo del cliente

El componente `PushOptIn` (montado en `/mi-cuenta`) se encarga de:

1. Consultar `/api/push/public-key` al montar.
2. Pedir permiso al usuario cuando haga click en *Activar notificaciones*.
3. Registrar la suscripción con `PushManager.subscribe` y POSTearla a
   `/api/push/subscribe`.
4. Permitir dar de baja (`PushManager.unsubscribe` + POST a
   `/api/push/unsubscribe`).

Si el navegador no soporta Push API, o si la feature está apagada en el
servidor, el componente no se muestra.
