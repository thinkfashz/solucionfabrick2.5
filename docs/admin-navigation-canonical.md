# Mapa canónico de navegación admin

## Objetivo

Este documento fija las rutas oficiales del admin para evitar que futuras mejoras vuelvan a duplicar módulos o mover credenciales a pantallas incorrectas.

## Reglas principales

```txt
/admin/integraciones = único centro oficial de credenciales, API keys y pruebas de proveedores
/admin/configuracion = datos del negocio + acceso admin
/admin/seguridad = passkeys, WebAuthn y dispositivos confiables
/admin/modulos = mapa modular del admin
/admin/center = redirect legacy hacia /admin/integraciones
```

## Credenciales e integraciones

Todas las claves API deben vivir en:

```txt
/admin/integraciones
```

Incluye:

- Resend
- Cloudinary
- OpenAI
- OpenRouter
- Claude / Anthropic
- Meta
- Google
- TikTok
- MercadoPago
- MercadoLibre
- Vercel
- Sentry
- otros proveedores futuros

Las credenciales pueden venir de:

```txt
1. Base de datos cifrada en integrations
2. Variables de entorno Vercel como fallback
```

La pantalla `/admin/configuracion` no debe administrar API keys.

## Configuración

La ruta:

```txt
/admin/configuracion
```

queda reservada para:

- datos del negocio;
- sesión admin actual;
- cambio de contraseña;
- enlaces hacia integraciones y sesiones.

No debe contener formularios de API keys.

## Seguridad

La ruta:

```txt
/admin/seguridad
```

queda reservada para:

- Passkeys;
- WebAuthn;
- huella / Face ID / bloqueo del dispositivo;
- dispositivos confiables;
- eliminación de passkeys.

La app nunca guarda huella, cara, iris ni llave privada. Solo verifica firmas contra llave pública.

## Rutas legacy

```txt
/admin/center
```

Debe mantenerse como redirect para no romper enlaces antiguos, pero no debe ser promocionada en navegación nueva.

## Navegación

La navegación principal debe mantener consistencia entre:

```txt
src/components/admin/AdminShell.tsx
src/components/admin/AdminContextMenu.tsx
src/components/AdminBottomNav.tsx
```

Si se agrega un módulo nuevo, primero revisar si ya existe una ruta equivalente para evitar duplicados.

## Regla para futuras IA

Antes de crear una página nueva en `/admin`, buscar primero si ya existe una ruta equivalente.

No crear sin justificación documentada:

```txt
/admin/api-keys
/admin/credentials
/admin/center nuevo
/admin/database si no hay módulo real
/admin/passkeys si /admin/seguridad ya cubre WebAuthn
```
