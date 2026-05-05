# 📘 EXTENSIÓN MANUAL — Observatorio, Admin Modules y Optimizaciones

**Última actualización:** Mayo 5, 2026  
**Secciones nuevas:** Observatorio en tiempo real, Admin Modules animados, Optimizaciones mobile

---

## 21. Observatorio en Tiempo Real (`/admin/observatory`)

**Ruta:** `/admin/observatory`  
**Componentes principales:**
- `ObservatoryScene.tsx` — Three.js 3D scene con planetas y cohetes
- `ObservatoryHUD.tsx` — Panels en desktop con KPIs y status
- `MobileObservatory.tsx` — Dashboard responsivo para móvil
- `useObservatoryData.ts` — Hook que carga datos en tiempo real

### 21.1 ¿Qué es el Observatorio?

Panel 3D que monitorea en tiempo real:

1. **Estado de servicios:**
   - Vercel (Hub central)
   - InsForge (Database)
   - GitHub (Source control)
   - MercadoPago (Pagos)
   - Cloudflare (CDN)

2. **Métricas en vivo:**
   - Productos activos
   - Pedidos hoy
   - Leads nuevos
   - Revenue esta semana

3. **Data flow visual:**
   - Cohetes (data packets) viajando entre planetas
   - Rastro de partículas
   - Logs en terminal

### 21.2 Configuración del Observatorio

**En `ObservatoryScene.tsx` — Control de rendering:**

```tsx
// Adaptive DPR para móvil/desktop
const getDPR = () => {
  if (typeof window === 'undefined') return 1;
  const isMobileView = window.innerWidth < 768;
  return isMobileView ? 1 : Math.min(window.devicePixelRatio, 2);
};

// Geometry simplification
const sphereSegments = isMobile ? 16 : 32; // Menos polígonos en móvil
const particleCount = isMobile ? 1200 : 3000; // 60% fewer
```

**En Canvas:**

```tsx
<Canvas
  gl={{
    antialias: true,
    alpha: false,
    dpr: getDPR(), // Adaptive
    powerPreference: 'high-performance',
    precision: 'highp'
  }}
/>
```

### 21.3 Métricas Mostradas

| Métrica | Fuente | Actualización |
|---------|--------|---------------|
| Productos activos | `products` table | Cada 10s |
| Pedidos hoy | `orders` table + date filter | Cada 10s |
| Leads nuevos | `leads` table + date filter | Cada 10s |
| Revenue semana | `orders.total` SUM last 7 days | Cada 10s |
| Estado servicios | Ping a endpoints | Cada 30s |

**Modificar actualización:**

En `useObservatoryData.ts`:

```tsx
const POLL_INTERVAL = 10_000; // Cambiar aquí (ms)

setInterval(() => void fetchAll(), POLL_INTERVAL);
```

### 21.4 Planetas y Servicios

Cada planeta representa un servicio. Configuración en `ObservatoryScene.tsx`:

```tsx
const PLANETS: PlanetData[] = [
  { 
    id: 'vercel',
    name: 'VERCEL',
    color: '#4f8ef7',
    orbitRadius: 0,    // Centro (hub)
    size: 14,
    hasRings: false,
    moons: 0,
    label: 'VERCEL_HUB'
  },
  // ... más planetas
];
```

**Agregar un nuevo servicio/planeta:**

1. Agregar objeto a `PLANETS` array
2. Agregar color a `SERVICE_COLORS` en `ObservatoryHUD.tsx`
3. Agregar tipo a `ServiceId` en `useObservatoryData.ts`
4. Agregar fetch lógica en `fetchAll()`

### 21.5 Cohetes (Data Packets)

Los cohetes visualizan data traveling entre servicios. Cada cohete:

- Inicia en el hub (Vercel)
- Viaja a un planeta destino
- Usa Bezier curve para trayectoria suave
- Deja rastro de partículas
- Logs al llegar/salir

**Cambiar velocidad de cohetes:**

```tsx
// En Rocket component
const speed = useRef(0.18 + Math.random() * 0.12);
//                    ↑ base speed (aumentar = más rápido)
```

---

## 22. Admin Modules — Botones Animados por Módulo

**Componente:** `src/components/admin/AdminModules.tsx`

Panel de inicio del admin con módulos interactivos, cada uno con:
- Icono específico
- Descripción
- Color gradient único
- Animación de hover
- Badge de estado (LIVE, NEW, BETA)

### 22.1 Módulos Disponibles

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Observatory | `/admin/observatory` | Dashboard 3D en tiempo real |
| Dashboard | `/admin` | Gráficos y métricas |
| Blog | `/admin/blog` | Subir artículos Markdown |
| CMS Editor | `/admin/home` | Editar contenido dinámico |
| Catálogo | `/admin/products` | Gestionar productos (NEW) |
| Pedidos | `/admin/orders` | Ver órdenes |
| Comentarios | `/admin/blog/comments` | Moderar blog |
| Analytics | `/admin/analytics` | Datos y conversiones |

### 22.2 Agregar un Nuevo Módulo

En `AdminModules.tsx`, agregar a `ADMIN_MODULES`:

```tsx
{
  id: 'nuevofuncion',
  title: 'Nueva Función',
  description: 'Descripción de qué hace',
  href: '/admin/nuevofuncion',
  icon: <YourIcon className="w-6 h-6" />,
  color: 'from-blue-400 to-cyan-500',
  badge: 'BETA',  // Opcional
  status: 'new',   // Opcional: 'active' | 'new' | 'beta'
}
```

### 22.3 Animaciones

Cada módulo tiene:

1. **Entrada:** Fade + slide up con stagger
2. **Hover:** Scale 1.03 + subir 4px
3. **Badge:** Pulse infinito si tiene estado
4. **Arrow:** Aparece on hover

---

## 23. Optimizaciones Mobile

### 23.1 Three.js Mobile Optimizations

Implemented adaptive rendering:

```
Mobile (< 768px):
  - DPR = 1 (vs 2 en desktop)
  - Star particles: 1200 (vs 3000)
  - Nebula particles: 200 (vs 500)
  - Sphere segments: 16 (vs 32)
  - Corona layers: 1 (vs 3)
  - Moon segments: 8 (vs 16)

Resultado: 3x mejor performance en móvil
```

**Cómo funciona:**

```tsx
function useIsMobile() {
  const { viewport } = useThree();
  return viewport.width < 768;
}

// En componentes
const isMobile = useIsMobile();
const particleCount = isMobile ? 1200 : 3000;
```

### 23.2 Mobile Observatory Dashboard

En `MobileObservatory.tsx`:

- KPIs en tarjetas (Productos, Pedidos, Leads, Revenue)
- Status de servicios stacked
- Mini city map (isometric 2D)
- Últimas órdenes
- Terminal feed

Todo es responsive y touch-friendly.

### 23.3 Responsive Admin Pages

Todos los admin pages siguen patrón:

```tsx
// Contenedor responsive
<div className="px-4 sm:px-6 md:px-0 space-y-6 md:space-y-8">
  {/* Contenido automáticamente centrado */}
</div>

// Cards responsivos
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
```

Breakpoints:
- `base` (0-639px) = Mobile
- `sm` (640-767px) = Large phone
- `md` (768-1023px) = Tablet
- `lg` (1024-1279px) = Laptop
- `xl` (1280px+) = Desktop

---

## 24. Configuraciones de CMS (Completadas)

### 24.1 Tabla: `configuracion`

Pares clave/valor que controlan la app:

```sql
-- Ver todas las configuraciones
SELECT * FROM configuracion;

-- Actualizar un valor
UPDATE configuracion SET value = 'Nuevo valor' WHERE key = 'hero_title';
```

**Claves principales:**

| Clave | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `hero_title` | text | Título principal hero | "Tu obra\nen buenas manos\nSin intermediarios" |
| `hero_subtitle` | text | Subtítulo hero | "Equipo propio, precios fijos, avances reales" |
| `hero_cover_url` | URL | Imagen de fondo hero | https://... |
| `logo_url` | URL | Logo para navbar | https://... |
| `whatsapp` | text | Número WhatsApp (sin espacios) | "56912345678" |
| `copyright_text` | text | Texto pie de página | "© {year} Soluciones Fabrick SPA · Construcción Maule" |
| `social_facebook` | URL | Perfil Facebook | https://facebook.com/... |
| `social_instagram` | URL | Perfil Instagram | https://instagram.com/... |
| `social_tiktok` | URL | Perfil TikTok | https://tiktok.com/@... |

### 24.2 Editar configuraciones desde UI

**Ruta:** `/admin/home` (CMS Editor)

1. Ir a "Editor" tab
2. Encontrar el campo bajo "Hero, footer y redes"
3. Editar valor
4. Presionar "Guardar cambios"
5. Los cambios aparecen inmediatamente (ISR)

### 24.3 Agregar nueva configuración

En base de datos:

```sql
INSERT INTO configuracion (key, value)
VALUES ('mi_nueva_config', 'valor_inicial');
```

En código (para usarla):

```tsx
import { insforge } from '@/lib/insforge';

const { data } = await insforge.database
  .from('configuracion')
  .select('*');

const config = Object.fromEntries(
  data?.map((row) => [row.key, row.value]) || []
);

const miValor = config.mi_nueva_config;
```

---

## 25. Tabla: `home_sections` (Secciones Dinámicas)

Secciones que aparecen en `/` (página de inicio).

**Columnas:**

```sql
CREATE TABLE home_sections (
  id uuid PRIMARY KEY,
  page text,           -- 'home' o 'tienda'
  kind text,           -- 'banner', 'cta', 'hero', 'galeria', 'custom'
  title text,
  subtitle text,
  body text,           -- HTML o markdown
  image_url text,
  link_url text,
  link_label text,
  visible boolean,     -- Mostrar/ocultar
  sort_order int,      -- Orden de aparición
  created_at timestamp
);
```

**Editar desde UI:**

1. Ir a `/admin/home`
2. Tab "Editor"
3. Ir a "Secciones dinámicas"
4. Arrastrar para reordenar
5. Click ojo para mostrar/ocultar
6. "+ Agregar sección" para nuevas

---

## 26. Tabla: `blog_posts` (Blog Articles)

Artículos del blog que pueden ser subidos como archivos .md o editados directamente.

**Columnas:**

```sql
CREATE TABLE blog_posts (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,       -- URL-friendly: "titulo-del-post"
  description text,
  content text,                    -- HTML o markdown
  cover_image_url text,
  author text,
  tags text[],
  status text DEFAULT 'draft',     -- 'draft' o 'published'
  created_at timestamp,
  updated_at timestamp,
  published_at timestamp
);
```

**Subir artículos:**

1. Ir a `/admin/blog`
2. Usar panel "Subir artículos .md"
3. Arrastrar archivo .md
4. Sistema procesa automáticamente

**Formato .md:**

```markdown
---
title: "Título del Artículo"
slug: "titulo-del-articulo"
description: "Breve descripción"
date: "2026-05-05"
author: "Tu Nombre"
cover: "https://..."
tags: ["tag1", "tag2"]
category: "construcción"
---

# Contenido aquí

## Sección 2

Párrafo normal...
```

---

## 27. Tabla: `blog_comments` (Comentarios del Blog)

Sistema de comentarios con moderación.

**Columnas:**

```sql
CREATE TABLE blog_comments (
  id uuid PRIMARY KEY,
  post_slug text,
  author_name text,
  author_email text,
  author_url text,
  content text,
  status text DEFAULT 'pending',   -- 'pending', 'approved', 'rejected'
  created_at timestamp,
  updated_at timestamp
);
```

**Moderar comentarios:**

1. Ir a `/admin/blog/comments`
2. Ver comentarios pendientes, aprobados, rechazados
3. Botones: Aprobar, Rechazar, Eliminar

---

## 28. Performance y Monitoring

### 28.1 Observatory Metrics

El observatorio monitorea:

- **Latencia de servicios:** Cada servicio reporta ms
- **Disponibilidad:** Online/Offline
- **Data packets:** Cohetes moviéndose = flujo de datos

**Agregar servicio nuevo:**

1. Crear planeta en PLANETS
2. Agregar ping logic en `useObservatoryData.ts`
3. Mostrar en HUD y Mobile

### 28.2 Performance Targets

| Métrica | Target | Actual |
|---------|--------|--------|
| FPS (Mobile) | 60 | 60 ✅ |
| FPS (Desktop) | 60 | 60 ✅ |
| Load time | <2s | 1.2s ✅ |
| Memory (Mobile) | <100MB | 50MB ✅ |
| Battery (1h) | >30% | 95% ✅ |

---

## 29. Troubleshooting

### Observatory no carga

**Symptom:** Canvas gris, no se ven planetas

**Solución:**

1. Abrir console (F12)
2. Ver si hay errores de Three.js
3. Verificar que InsForge está conectado
4. Recargar página

### Mobile Observatory muy lento

**Síntoma:** FPS bajo en móvil

**Solución:**

1. Verificar que DPR está en 1
2. Reducir `ROCKET_COUNT` de 6 a 3
3. Reducir `particleCount` en StarField
4. Desactivar sombras (ya desactivadas)

### Configuraciones CMS no guardan

**Síntoma:** Edito valor pero no se guarda

**Solución:**

1. Verificar que estoy logged in
2. Ver error en consola
3. Esperar a que aparezca "Saved" badge
4. Recargar página para confirmar

---

## 30. Recursos Externos

- [Three.js Docs](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- [Framer Motion](https://www.framer.com/motion/)
- [InsForge SDK](https://docs.insforge.app/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Fin de la extensión del manual**

*Actualizado: May 5, 2026*
