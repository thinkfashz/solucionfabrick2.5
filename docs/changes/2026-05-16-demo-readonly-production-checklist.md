# Checklist de producción · Demo solo lectura

Fecha: 2026-05-16
Rama: `fix/demo-readonly-production`

## Estado

El cierre técnico del modo demo ya fue integrado en `main` mediante el PR #179. Este documento deja un checkpoint claro para revisar antes de activar producción en Vercel.

## Objetivo

Permitir que un visitante acceda al panel admin en modo demostración, navegue por la aplicación y vea detalles guiados, sin poder ejecutar acciones sensibles.

## Flujo esperado

1. El administrador genera un link demo.
2. El visitante abre `/admin/acceso-demo?token=...` desde Android, iPhone o PC.
3. El sistema crea una sesión `viewer` temporal.
4. El visitante puede navegar por páginas permitidas del admin.
5. El sistema registra eventos invisibles de navegación y tiempo en pantalla.
6. Las rutas críticas redirigen o bloquean acceso.
7. Las escrituras hacia `/api/admin/*` quedan bloqueadas para `viewer`.

## Zonas críticas bloqueadas para demo

- `/admin/equipo`
- `/admin/sql`
- `/admin/setup`
- `/admin/center`
- `/admin/extensions`
- `/admin/seguridad`
- `/admin/activar`
- `/admin/vercel-logs`

## Escrituras bloqueadas para viewer

El middleware bloquea métodos de escritura sobre `/api/admin/*`:

- `POST`
- `PUT`
- `PATCH`
- `DELETE`

Excepciones necesarias:

- `/api/admin/demo/events`
- `/api/admin/logout`

## Pruebas manuales antes de producción

### Android

- Abrir link demo.
- Entrar al panel.
- Navegar por `/admin`, `/admin/modulos`, productos, cotizaciones y contenido.
- Confirmar que `/admin/equipo` redirige o bloquea.
- Confirmar que `/admin/sql` redirige o bloquea.

### iPhone / Safari

- Abrir link demo.
- Confirmar que la sesión entra correctamente.
- Navegar entre páginas.
- Cambiar de pestaña o bloquear pantalla.
- Volver y confirmar que el tracker no rompe la navegación.

### PC

- Abrir link demo.
- Probar navegación normal.
- Intentar llamar una API de escritura desde consola.
- Confirmar respuesta `403` en modo demo.

## Variables necesarias

- `ADMIN_SESSION_SECRET`
- `ADMIN_PASSWORD_PEPPER`
- `INSFORGE_API_KEY`
- `NEXT_PUBLIC_INSFORGE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `WEBAUTHN_RP_ID`
- `WEBAUTHN_ORIGIN`
- `NEXT_PUBLIC_APP_URL`

## Nota

No subir credenciales al repositorio. Todas las claves deben vivir en variables de entorno de Vercel/Railway/hosting.
