# Runbook — Fabrick Studio IA · Video Engine (Operaciones post-deploy)

> Actualizado: 2026-05-18 · Módulo: `src/modules/ai-video-engine/`

---

## 1. Verificación de tablas InsForge (Paso obligatorio post-merge)

### ¿Por qué?
El módulo persiste runs de generación y assets de escenas en InsForge (best-effort).  
Si las tablas no existen, la app **no falla** (el error se silencia), pero no habrá historial de generaciones.

### Ejecutar SQL

```sql
-- Archivo: scripts/create-ai-video-engine-tables.sql
-- Ejecutar UNA SOLA VEZ contra el proyecto InsForge (Postgres)

-- Opción A: desde la terminal SQL del admin
-- 1. Ir a /admin/sql
-- 2. Pegar el contenido del archivo
-- 3. Ejecutar

-- Opción B: desde el CLI de Postgres
psql "$DATABASE_URL" -f scripts/create-ai-video-engine-tables.sql

-- Opción C: desde el panel InsForge
-- Dashboard > SQL Editor > pegar y ejecutar
```

### Verificar que las tablas existen

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ai_video_engine_runs', 'ai_video_scene_assets');
-- Debe devolver 2 filas
```

### Estructura esperada

| Tabla                    | Columnas clave                                          |
|--------------------------|---------------------------------------------------------|
| `ai_video_engine_runs`   | `id` (uuid PK), `prompt`, `result` (jsonb), `created_at` |
| `ai_video_scene_assets`  | `id` (uuid PK), `run_id` (fk), `cloudinary_url`, `scene_index` |

---

## 2. Variables de entorno requeridas

| Variable                | Fuente            | Obligatoria | Fallback                                        |
|-------------------------|-------------------|-------------|------------------------------------------------|
| `OPENROUTER_API_KEY`    | Vercel env / DB   | Sí          | `OPENROUTER_KEY` (alias)                       |
| `OPENROUTER_MODEL`      | Vercel env / DB   | No          | Default interno (`openai/gpt-4o-mini`)         |
| `CLOUDINARY_CLOUD_NAME` | Vercel env / DB   | Sí*         | Desde `integrations` table (`provider=cloudinary`) |
| `CLOUDINARY_API_KEY`    | Vercel env / DB   | Sí*         | Idem                                            |
| `CLOUDINARY_API_SECRET` | Vercel env / DB   | Sí*         | Idem                                            |

*Si las credenciales Cloudinary están en la tabla `integrations` del admin, no se necesitan env vars.  
Verificar en `/admin/integraciones` → sección Cloudinary.

---

## 3. Smoke test manual — Ruta feliz

### Acceso desde Coach de Campañas
1. Ir a `/admin/publicidad/coach`
2. Verificar que aparece la card **"Generar video con Fabrick Studio IA"**
3. Hacer clic → debe redirigir a `/admin/video-engine`

### Generación básica en `/admin/video-engine`
```
Tema:      "Silla ergonómica de trabajo"
Público:   "Profesionales home office"
Estilo:    "Minimalista"
Formato:   "Reel vertical"
Duración:  "30 segundos"
```
4. Clic en **Generar** → debe aparecer barra de progreso
5. Verificar que el JSON de escenas se renderiza en el preview HTML
6. Verificar que el timeline muestra al menos 3 escenas

### Captura y subida de escena (requiere Cloudinary configurado)
7. Seleccionar escena 1 en el timeline
8. Clic en **Capturar escena** → debe disparar `POST /api/ai-video-engine/upload-cloudinary`
9. Verificar en `/admin/medios?tab=cloudinary` que el asset aparece

### Checks de respaldo en `/admin/diagnostico`
- OpenRouter: debe mostrar estado "Conectado"
- Cloudinary: debe mostrar estado "Conectado"

---

## 4. Verificación de logs en caso de error

### Error "No OpenRouter credentials"
```
/admin/diagnostico → sección "APIs IA" → verificar OPENROUTER_API_KEY
/admin/integraciones → proveedor "openrouter" → test de conexión
```

### Error "Cloudinary upload failed"
```
/admin/vercel-logs → filtrar por "upload-cloudinary"
/admin/integraciones → proveedor "cloudinary" → test de conexión
```

### Error "Table does not exist"
```
Ejecutar scripts/create-ai-video-engine-tables.sql (ver sección 1)
/admin/sql → SELECT * FROM ai_video_engine_runs LIMIT 1;
```

---

## 5. Rollback

El módulo es **aditivo y aislado** — no toca módulos existentes.

Para desactivar el Video Engine sin revertir el deploy:
1. Eliminar la entrada del sidebar en `AdminShell.tsx` y `StudioSidebar.tsx`
2. Hacer redirect en `src/app/admin/video-engine/page.tsx` a `/admin/publicidad`
3. No se pierden datos: las tablas quedan intactas

Para reactivar: revertir los cambios anteriores.

---

## 6. Checklist de deploy completado

- [ ] SQL ejecutado en InsForge (tablas `ai_video_engine_runs`, `ai_video_scene_assets`)
- [ ] `OPENROUTER_API_KEY` configurada en Vercel env
- [ ] Cloudinary configurado en `/admin/integraciones` o vía env vars
- [ ] Smoke test manual completado (sección 3)
- [ ] `/admin/diagnostico` muestra OpenRouter + Cloudinary "Conectado"
- [ ] Preview en `/admin/publicidad/coach` muestra card de Video Engine
