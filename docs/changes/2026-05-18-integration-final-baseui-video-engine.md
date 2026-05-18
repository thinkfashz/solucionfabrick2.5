# Integración final · BaseUI stages 1-6 + Video Engine

## Fecha
2026-05-18

## Rama
`claude/integrate-video-engine-a2XGK`

## PRs integrados
- #189 · BaseUI stages 1-3 (layout, kit, pages)
- #190 · BaseUI stage 4 (seguridad/passkeys)
- #191 · BaseUI stage 5 (navegación)
- #192 · BaseUI stage 6 (polish + canonical nav doc)
- #193 · Fabrick Studio IA video engine

## Qué cambió

### Design system
- `src/components/admin/baseui-kit.tsx` — AdminBasePage, AdminBaseGrid, AdminBaseMetric, AdminBaseCard, AdminBaseButton
- `src/components/admin/AdminBaseThemeFrame.tsx` — dark theme wrapper global
- `src/components/admin/settings/AdminBusinessSettingsPage.tsx` — configuración del negocio

### Navegación
- `src/components/admin/AdminShell.tsx` — sidebar unificado con nuevas rutas: módulos, ai-developer, diagnóstico, video-engine; corrige /admin/center legacy; breadcrumbs consistentes
- `src/app/admin/layout.tsx` — wraps en AdminBaseThemeFrame

### Páginas admin actualizadas
- `seguridad/page.tsx` — WebAuthn con AdminBasePage, métricas reales
- `configuracion/page.tsx` — thin shell → AdminBusinessSettingsPage
- `modulos/page.tsx` — mapa modular con BaseUI
- `inventario/page.tsx` + `scan/page.tsx` — BaseUI adapted
- `proyectos/page.tsx` — sin seed/demo data
- `reviews/page.tsx`, `social/page.tsx`, `blog/page.tsx` — BaseUI adapted
- `clientes/page.tsx`, `cupones/page.tsx` — BaseUI adapted
- `medios/MediaAdmin.tsx` — InsForge + Cloudinary tabs

### Video Engine (PR #193)
- `src/modules/ai-video-engine/` — módulo completo (tipos, hook, servicios, componentes)
- `src/app/admin/video-engine/page.tsx` — ruta /admin/video-engine
- `src/app/api/ai-video-engine/generate/` — endpoint OpenRouter
- `src/app/api/ai-video-engine/upload-cloudinary/` — endpoint Cloudinary
- `scripts/create-ai-video-engine-tables.sql` — tablas opcionales

### Documentación
- `docs/admin-navigation-canonical.md` — mapa canónico de rutas
- `docs/ADMIN_BASEUI_MIGRATION_MEMORY.md` — memoria de migración

## Reglas respetadas
- No merge a main
- No deploy automático
- No credenciales expuestas
- No páginas demo
- No rutas duplicadas
- Build pasa: ✓ Compiled successfully

## Pendiente para deploy
1. Ejecutar `scripts/create-ai-video-engine-tables.sql` en InsForge/Postgres (opcional, best-effort)
2. Revisar preview en rama integration
3. Crear PR único hacia main con revisión humana
4. Deploy manual post-aprobación
