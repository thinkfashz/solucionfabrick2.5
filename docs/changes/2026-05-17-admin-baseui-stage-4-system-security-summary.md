# Migración visual admin · Etapa 4 · Sistema, seguridad y herramientas técnicas

## Fecha
2026-05-17

## Rama

```txt
feature/admin-baseui-stage-4-system-security
```

## PR

```txt
#190 · feat: admin BaseUI stage 4 system security
```

## Base del PR

```txt
feature/admin-baseui-interface
```

Este PR es apilado sobre las etapas 1, 2 y 3. No va directo a `main`.

## Rutas revisadas

```txt
/admin/seguridad
/admin/passkeys
/admin/sesiones
/admin/equipo
/admin/estado
/admin/monitor
/admin/observatory
/admin/vercel-logs
/admin/sql
/admin/setup
/admin/database
/admin/diagnostico-apis
/admin/ai-developer
/admin/modulos
```

## Cambios aplicados

### /admin/seguridad

Archivo:

```txt
src/app/admin/seguridad/page.tsx
```

Cambio:

- Migrada a BaseUI/dark.
- Mantiene WebAuthn real.
- Mantiene endpoints existentes:
  - `/api/admin/passkeys`
  - `/api/admin/passkeys/register/options`
  - `/api/admin/passkeys/register/verify`
  - `/api/admin/passkeys/[id]`
- No guarda huella, cara, iris ni llave privada.
- Explica que la app solo verifica firma segura con llave pública.
- Muestra métricas reales de passkeys registradas, sincronizadas, usadas y soporte WebAuthn del browser.

## Rutas revisadas sin reescritura

### /admin/passkeys

Estado:

- No existe una ruta separada.
- `/admin/seguridad` es el módulo correcto para passkeys.
- No hay duplicado que eliminar.

### /admin/sesiones

Estado:

- Usa `/api/admin/sessions`.
- Muestra resumen superadmin, IPs, dispositivos, user-agent y auditoría.
- Ya es funcional y sensible.
- No se reescribió para no romper auditoría.

### /admin/equipo

Estado:

- Usa `/api/admin/me`, `/api/admin/team` y `/api/admin/invitations`.
- Gestiona usuarios, invitaciones, roles, auditoría e IP.
- Solo accesible para superadmin.
- No se reescribió para no romper control de acceso.

### /admin/estado

Estado:

- Ya revisada en etapa 1.
- Usa diagnóstico real desde `/api/admin/estado`.
- No requiere cambios en esta etapa.

### /admin/monitor

Estado:

- Ya corregida en etapa 1.
- Usa datos reales desde `/api/admin/health`.
- No usa `Math.random()`.

### /admin/observatory

Estado:

- Experiencia 3D propia.
- Usa dashboard mobile separado.
- No se forzó a BaseUI porque su interfaz es intencionalmente distinta.

### /admin/vercel-logs

Estado:

- Ya revisada en etapa 1.
- Usa datos reales de endpoints internos de Vercel.
- No se reescribió.

### /admin/sql

Estado:

- Herramienta técnica real conectada a endpoints SQL/migración.
- No se reescribió por sensibilidad.

### /admin/setup

Estado:

- Usa `/api/admin/setup` y `/api/admin/setup-tables`.
- Verifica tablas y permite creación real.
- No se reescribió por sensibilidad.

### /admin/database

Estado:

- No existe `src/app/admin/database/page.tsx`.
- Queda como ruta pendiente/no implementada si aparece en navegación.

### /admin/diagnostico-apis

Estado:

- No se encontró ruta real equivalente.
- Si aparece en navegación, debe apuntar a `/admin/estado`, `/admin/monitor` o a un módulo real futuro.

### /admin/ai-developer

Estado:

- Ya alineada visualmente.
- Usa `/api/admin/ai-developer/chat`.
- Mantiene modos seguros: lectura, propuesta y PR manual.
- No modifica main ni despliega automáticamente.

### /admin/modulos

Estado:

- Ya migrada en etapa 1.
- Funciona como catálogo visual de módulos.

## Pendientes reales detectados

```txt
1. Revisar navegación/hamburguesa por si aún apunta a /admin/database o /admin/diagnostico-apis inexistentes.
2. Si se necesita diagnóstico API separado, crear ruta real o consolidarla con /admin/estado.
3. Ejecutar build preview del PR #190 después de los cambios.
4. No mergear #190 directo a main; es PR apilado.
```

## Regla mantenida

```txt
No secretos expuestos.
No datos demo.
No simulaciones de seguridad.
No merge ni deploy automático.
```
