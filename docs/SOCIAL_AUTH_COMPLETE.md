# Social Auth — Conectar / Desconectar completado

Estado: **LISTO PARA PRODUCCIÓN**

## Proveedores implementados

| Proveedor | Conectar | Desconectar | Revocación en proveedor |
|-----------|----------|-------------|------------------------|
| MercadoLibre | ✅ OAuth + PKCE | ✅ DB delete | — (no endpoint público) |
| Google | ✅ OAuth + PKCE | ✅ Revoca token + DB delete | ✅ `https://oauth2.googleapis.com/revoke` |
| Meta (Facebook/Instagram) | ✅ OAuth + long-lived token | ✅ Revoca permisos + DB delete | ✅ `DELETE /me/permissions` |
| TikTok for Business | ✅ OAuth | ✅ DB delete | — (no endpoint público) |

## Rutas API

### Flujo OAuth (ya existían, sin cambios)
- `GET /api/admin/ml/oauth/start` → inicia OAuth con Mercado Libre
- `GET /api/admin/ml/oauth/callback` → procesa callback, guarda tokens cifrados
- `GET /api/admin/google/oauth/start` → inicia OAuth con Google
- `GET /api/admin/google/oauth/callback`
- `GET /api/admin/meta/oauth/start` → inicia OAuth con Meta
- `GET /api/admin/meta/oauth/callback`
- `GET /api/admin/tiktok/oauth/start` → inicia OAuth con TikTok for Business
- `GET /api/admin/tiktok/oauth/callback`

### Nueva ruta de revocación
- `POST /api/admin/integrations/oauth/revoke`
  - Body: `{ provider: 'mercadolibre' | 'google' | 'meta' | 'tiktok' }`
  - Intenta revocar token en el proveedor (best-effort)
  - Siempre elimina las credenciales de la tabla `integrations`
  - Escribe audit log en `integration_audit`
  - Respuesta: `{ ok: true, revokedAtProvider: boolean, providerDetail?: string }`

## Variables de entorno requeridas

```
# MercadoLibre
ML_CLIENT_ID=<App ID de developers.mercadolibre.com>
ML_CLIENT_SECRET=<Secret Key>
ML_AUTH_DOMAIN=auth.mercadolibre.cl   # opcional, default .cl
ML_REDIRECT_URI=                      # opcional, auto-detectado

# Google
GOOGLE_CLIENT_ID=<OAuth 2.0 Client ID>
GOOGLE_CLIENT_SECRET=<Client Secret>
GOOGLE_REDIRECT_URI=                  # opcional

# Meta
META_APP_ID=<App ID de developers.facebook.com>
META_APP_SECRET=<App Secret>
META_REDIRECT_URI=                    # opcional

# TikTok
TIKTOK_APP_ID=<App ID del Developer Portal>
TIKTOK_APP_SECRET=<App Secret>
TIKTOK_REDIRECT_URI=                  # opcional
```

## Redirect URIs a registrar en cada plataforma

| Plataforma | URI a registrar |
|------------|----------------|
| Mercado Libre | `https://<dominio>/api/admin/ml/oauth/callback` |
| Google Cloud Console | `https://<dominio>/api/admin/google/oauth/callback` |
| Meta Developers | `https://<dominio>/api/admin/meta/oauth/callback` |
| TikTok for Business | `https://<dominio>/api/admin/tiktok/oauth/callback` |

## Cambios en la UI (`/admin/integraciones`)

- **Sección OAuth** en cada tarjeta: muestra estado verde "Vinculado con OAuth" cuando hay credenciales; muestra metadata (user_id, expires_at, connected_at, scopes)
- **Botón Conectar**: redirige al flujo OAuth del proveedor
- **Botón Reconectar**: visible cuando ya está conectado, permite re-autorizar
- **Botón Desconectar** (rojo): visible solo cuando está conectado; abre confirmación → llama `POST /api/admin/integrations/oauth/revoke` → revoca token + elimina credenciales
- **Botón Desactivar** (genérico): visible solo para proveedores NO OAuth (Stripe, Resend, Cloudinary, etc.)

## Fix incluido en este commit

**ESLint flat config**: Los entries de `.eslintignore` se migraron al array `ignores` de `eslint.config.js`.  
ESLint 9 no lee `.eslintignore` automáticamente, lo que causaba errores de build en Vercel al lintear archivos que antes estaban ignorados.
