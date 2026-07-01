# Build Guard — evitar deploys rojos en Vercel

Este proceso existe para evitar repetir una cadena de deploys fallidos por errores de TypeScript o configuración.

## Comando obligatorio antes de empujar a main

```bash
pnpm deploy:verify
```

Ese comando ejecuta, en orden:

1. `pnpm typecheck`
2. `pnpm deploy:preflight`
3. `pnpm build`

Si cualquiera falla, no empujar a `main`.

## Flujo recomendado

```bash
git status
pnpm deploy:verify
git add .
git commit -m "mensaje claro"
git push origin main
```

Después de hacer push:

1. Abrir Vercel → Deployments.
2. Esperar el último deployment.
3. Si queda `READY`, el cambio entró.
4. Si queda `ERROR`, abrir Build Logs y buscar el primer `Type error` o `Failed to compile`.

## Regla anti-cascada

No empujar 10 o 15 commits seguidos si Vercel está fallando.

Cuando aparezca el primer deploy rojo:

1. Detener cambios nuevos.
2. Leer logs del primer error real.
3. Corregir en un único commit.
4. Esperar un deploy verde.
5. Continuar.

## Orden de diagnóstico

### 1. TypeScript

Errores típicos:

```txt
Type error: Type 'string' is not assignable to type ...
```

Solución: corregir tipos antes de seguir tocando runtime.

### 2. Build Next.js

Errores típicos:

```txt
Failed to compile
Command "pnpm build" exited with 1
```

Solución: revisar el archivo señalado por Next.js. El cambio no llegó a producción.

### 3. Runtime

Si el deploy está `READY` pero la app falla, revisar Runtime Logs en Vercel.

### 4. Variables de entorno

Si falla al iniciar funciones o admin:

- revisar variables en Vercel
- ejecutar `pnpm deploy:preflight`
- revisar `/api/admin/observability`

## Qué significa cada estado de Vercel

- `READY`: cambio disponible.
- `ERROR`: build falló; no llegó a producción.
- `CANCELED`: otro commit lo reemplazó; no se toma como producción.
- `QUEUED` o `BUILDING`: esperar antes de confirmar.

## Checklist rápido

```txt
[ ] pnpm deploy:verify OK
[ ] git push hecho
[ ] último deploy READY
[ ] no hay errores runtime críticos
[ ] /api/admin/observability no está degraded
```
