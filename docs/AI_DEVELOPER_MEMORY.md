# Memoria técnica · Módulo 8 · Fabrick AI Developer

Fecha: 2026-05-17
Rama activa: `feature/fabrick-ai-developer`
PR activo: `#186 feat: add Fabrick AI Developer module`

Este documento complementa `docs/AI_PROJECT_MEMORY.md` y guarda el estado específico del módulo **Fabrick AI Developer**.

## Objetivo del módulo

Crear un panel dentro del admin para comunicarse con proveedores IA y mejorar la plataforma Soluciones Fabrick de forma segura.

Ruta principal:

```txt
/admin/ai-developer
```

Nombre visual:

```txt
Fabrick AI Developer
```

El módulo debe permitir, por etapas:

1. Chatear con IA real.
2. Analizar código y módulos.
3. Proponer mejoras.
4. Crear ramas.
5. Crear PRs.
6. Documentar cambios.
7. Bloquear merge/deploy automático.

## Reglas obligatorias

- No tocar `main` directo.
- No hacer merge automático.
- No hacer deploy automático.
- No mostrar API keys completas.
- No registrar secretos en logs/auditoría.
- Bloquear `viewer/demo` para acciones reales.
- Mantener arquitectura modular progresiva.
- Usar `/admin/integraciones` como centro oficial de credenciales.
- Usar DB cifrada primero y Vercel env como fallback.

## Estado actual general

Ya existe:

```txt
/admin/ai-developer
```

Ya tiene:

- UI tipo chat moderna;
- diseño responsive móvil/tablet/PC;
- marca `Fabrick AI Developer`;
- selector visual de proveedor;
- selector visual de modo;
- prompts rápidos;
- panel lateral de seguridad;
- card en Centro de Módulos como Módulo 8;
- componente visual `FabrickAIProviderCards` con tarjetas 3D;
- tarjetas OpenAI, OpenRouter y Claude visuales con detalle desplegable;
- barra animada de test visual.

Aún no está conectado completamente al modelo real desde la UI.

## Sección 1 · Credenciales IA server-side

Estado: avanzada.

Archivo actualizado:

```txt
src/lib/integrationsEnvMap.ts
```

Proveedores reconocidos server-side:

```txt
openai:
  api_key -> OPENAI_API_KEY / OPENAI_KEY
  model   -> OPENAI_MODEL

openrouter:
  api_key  -> OPENROUTER_API_KEY / OPENROUTER_KEY
  model    -> OPENROUTER_MODEL
  site_url -> OPENROUTER_SITE_URL / NEXT_PUBLIC_SITE_URL
  app_name -> OPENROUTER_APP_NAME

claude:
  api_key -> ANTHROPIC_API_KEY / CLAUDE_API_KEY / ANTHROPIC_KEY
  model   -> ANTHROPIC_MODEL / CLAUDE_MODEL
```

Esto permite que `resolveIntegrationCredentials()` pueda resolver credenciales de IA con estrategia DB-first + Vercel fallback.

Pendiente de Sección 1:

- Agregar OpenAI y Claude como tarjetas reales en `/admin/integraciones`.
- No reescribir `/admin/integraciones/page.tsx` completo a ciegas porque es grande y sensible.
- Si se toca, hacerlo de forma quirúrgica.

## Sección 2 · Endpoint real del chat

Estado: pendiente.

Intentado pero no confirmado: creación de:

```txt
src/app/api/admin/ai-developer/chat/route.ts
```

Verificación actual:

```txt
El archivo todavía no existe en la rama.
```

Debe crearse con:

- `POST /api/admin/ai-developer/chat`;
- `requireAdminPermission(request, { resource: 'admin', action: 'read' })`;
- bloqueo explícito a `viewer`;
- entrada: `provider`, `mode`, `messages` o `prompt`;
- proveedores: `auto`, `openai`, `openrouter`, `claude`;
- lectura de credenciales con `resolveIntegrationCredentials()`;
- auditoría con `recordAdminAudit()` y `recordAdminFailure()`;
- llamada real a OpenAI/OpenRouter/Claude;
- no herramientas Git todavía;
- no merge/deploy.

## Diseño recomendado del endpoint

Provider order para modo `auto`:

```txt
openai -> openrouter -> claude
```

Modelos por defecto sugeridos:

```txt
openai: gpt-4.1-mini
openrouter: openai/gpt-4.1-mini
claude: claude-3-5-sonnet-latest
```

System prompt obligatorio:

```txt
Eres Fabrick AI Developer, un asistente interno para mejorar la plataforma Soluciones Fabrick.
Reglas:
- No reveles secretos.
- No afirmes que modificaste código si solo propones.
- No hagas merge ni deploy.
- Trabaja modular, seguro y por etapas.
```

## Sección 3 · Conectar UI al endpoint

Estado: pendiente.

Archivo a modificar:

```txt
src/app/admin/ai-developer/page.tsx
```

Debe:

- enviar `provider`, `mode` y conversación a `/api/admin/ai-developer/chat`;
- mostrar respuesta real;
- mostrar error si faltan credenciales;
- indicar fuente `db` o `env` si backend la devuelve;
- dejar de responder con texto simulado cuando el backend exista;
- mantener UI mobile-first.

## Sección 4 · Herramientas Git controladas

Estado: pendiente.

Futuro:

- leer repo;
- leer archivos;
- buscar rutas;
- proponer cambios;
- crear rama;
- crear PR;
- comentar PR.

Prohibido en esta etapa:

- merge automático;
- deploy automático;
- borrar ramas;
- borrar archivos críticos;
- tocar `main` directo;
- mostrar secretos.

## Sección 5 · Auditoría completa

Estado: parcialmente preparada.

Ya existe:

```txt
src/lib/adminAudit.ts
```

Debe auditar:

- prompt enviado;
- proveedor usado;
- modelo usado;
- modo;
- IP;
- user agent;
- errores del proveedor;
- uso futuro de herramientas;
- ramas/PR creados.

No registrar:

- API keys;
- tokens;
- contraseñas;
- secretos;
- contenido sensible innecesario.

## SQL relevante ya esperado

Tabla de auditoría:

```sql
create table if not exists public.admin_action_audit (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  actor_role text,
  tenant_id text,
  action text not null,
  resource text not null,
  resource_id text,
  status text not null default 'success',
  ip text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Tabla de integraciones:

```sql
create table if not exists public.integrations (
  provider text primary key,
  credentials jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
```

## Diseño modular futuro

Cuando el módulo crezca, separar en:

```txt
src/modules/ai-developer/
  providers/
  tools/
  audit/
  prompts/
  policies/
```

No crear carpetas vacías todavía. Crear solo cuando haya lógica real.

## Próximo paso exacto

Crear:

```txt
src/app/api/admin/ai-developer/chat/route.ts
```

Usar:

```txt
requireAdminPermission()
resolveIntegrationCredentials()
recordAdminAudit()
recordAdminFailure()
```

Después avisar al usuario:

```txt
Sección 2 completada. ¿Continúo con Sección 3?
```
