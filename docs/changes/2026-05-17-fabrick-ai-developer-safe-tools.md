# Mejora: Herramientas seguras para Fabrick AI Developer

## Fecha
2026-05-17

## Contexto

El Módulo 8 necesita evolucionar hacia un AI Developer capaz de ayudar con el proyecto. Antes de darle acciones reales sobre GitHub o Vercel, se creó una primera capa de herramientas seguras.

## Implementación

Se creó:

```txt
src/app/api/admin/ai-developer/tools/route.ts
```

Endpoint:

```txt
POST /api/admin/ai-developer/tools
```

## Acciones permitidas

```txt
read_repo_status
propose_change
prepare_branch_plan
prepare_pr_plan
```

Estas acciones no modifican archivos, no crean ramas reales todavía, no crean PRs reales todavía, no hacen merge y no despliegan.

## Acciones bloqueadas

```txt
merge
deploy
delete_branch
delete_file
write_main
```

Si se solicita una de estas acciones, el endpoint responde `403` y registra auditoría como acción bloqueada.

## Seguridad

El endpoint:

- exige sesión admin;
- bloquea viewer/demo;
- audita acciones seguras con `recordAdminAudit()`;
- audita acciones bloqueadas con `recordAdminBlocked()`;
- audita errores con `recordAdminFailure()`;
- no expone secretos;
- no toca producción;
- no escribe directo en `main`.

## Estado

```txt
Sección 4: herramientas Git controladas iniciada en modo seguro
```

## Pendiente

Siguiente etapa real:

- conectar GitHub App/MCP o token auditado;
- implementar lectura real de repo;
- implementar lectura real de archivos;
- permitir creación de rama solo bajo confirmación;
- permitir creación de PR solo bajo confirmación;
- mantener merge/deploy bloqueados.
