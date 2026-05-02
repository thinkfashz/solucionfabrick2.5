# 📘 MANUAL COMPLETO — Soluciones Fabrick 2.5

> Manual técnico y funcional para desarrolladores y administradores de la plataforma.
> Última actualización: 2026

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Variables de Entorno](#2-variables-de-entorno)
3. [Base de Datos](#3-base-de-datos)
4. [Frontend — Páginas Públicas](#4-frontend--páginas-públicas)
5. [Componentes Reutilizables](#5-componentes-reutilizables)
6. [Hooks Personalizados](#6-hooks-personalizados)
7. [Contexts (Estado Global)](#7-contexts-estado-global)
8. [CSS y Diseño Tailwind](#8-css-y-diseño-tailwind)
9. [Backend — API Routes](#9-backend--api-routes)
10. [Panel de Administración](#10-panel-de-administración)
11. [Seguridad](#11-seguridad)
12. [Sistema CMS](#12-sistema-cms)
13. [Pagos con MercadoPago](#13-pagos-con-mercadopago)
14. [Carrito de Tienda vs Cotizaciones](#14-carrito-de-tienda-vs-cotizaciones)
15. [Tiempo Real (Realtime)](#15-tiempo-real-realtime)
16. [Blog y Casos de Estudio](#16-blog-y-casos-de-estudio)
17. [Diseñador 3D (/juego y /editor)](#17-diseñador-3d-juego-y-editor)
18. [Notificaciones Push](#18-notificaciones-push)
19. [Cómo Agregar Nuevas Funciones](#19-cómo-agregar-nuevas-funciones)
20. [Comandos del Proyecto](#20-comandos-del-proyecto)

---

## 1. Arquitectura General

La app es un **Next.js 15** (App Router) con **React 19**, conectada a **InsForge** como backend-as-a-service (PostgreSQL + autenticación + storage + tiempo real).

```
solucionfabrick2.5/
├── src/
│   ├── app/               ← Páginas y rutas (App Router)
│   │   ├── page.tsx       ← Inicio (/)
│   │   ├── layout.tsx     ← Layout raíz (providers globales)
│   │   ├── servicios/     ← /servicios
│   │   ├── tienda/        ← /tienda
│   │   ├── blog/          ← /blog
│   │   ├── checkout/      ← /checkout
│   │   ├── cotizaciones/  ← /cotizaciones
│   │   ├── juego/         ← /juego (diseñador 3D)
│   │   ├── admin/         ← Panel admin
│   │   └── api/           ← API Routes (backend)
│   ├── components/        ← Componentes React
│   ├── context/           ← Providers de estado global
│   ├── hooks/             ← Custom hooks
│   ├── lib/               ← Lógica y utilidades
│   └── middleware.ts      ← Middleware (CSP + auth)
├── scripts/
│   └── create-tables.sql  ← Esquema de la base de datos
├── public/                ← Archivos estáticos
└── tailwind.config.js     ← Configuración Tailwind
```

**Tecnologías clave:**

- **Next.js 15** con App Router y React Server Components
- **InsForge SDK** (`@insforge/sdk`) — PostgreSQL + Auth + Realtime
- **Tailwind CSS 3.4** — estilos
- **Framer Motion + GSAP** — animaciones
- **Zustand** — estado de UI complejo
- **Three.js + React Three Fiber** — diseñador 3D
- **MercadoPago** — pagos

---

## 2. Variables de Entorno

Archivo: `.env.local` (copiar desde `.env.example`).

```bash
# OBLIGATORIAS ───────────────────────────────────
NEXT_PUBLIC_INSFORGE_URL=https://tu-proyecto.us-east.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=ik_tu_clave_publica_aqui
INSFORGE_API_KEY=tu_clave_privada
ADMIN_SESSION_SECRET=tu_secreto_largo_aleatorio

# PAGOS ───────────────────────────────────────────
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADO_PAGO_WEBHOOK_SECRET=xxx
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-xxx

# OPCIONALES ─────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://www.solucionesfabrick.com
NEXT_PUBLIC_WHATSAPP_NUMBER=56930121625

# Notificaciones push (opcional)
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:tu@email.com
```

**Cómo agregar una nueva variable:**

1. Agrégala a `.env.example` con un comentario.
2. Si necesita estar en el navegador → prefijo `NEXT_PUBLIC_`.
3. Si es solo del servidor → sin prefijo.
4. En Vercel: Settings → Environment Variables.

---

## 3. Base de Datos

Las tablas se crean ejecutando `scripts/create-tables.sql` desde `/admin/setup` (botón **"Crear tablas ahora"**).

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `products` | Catálogo de la tienda |
| `configuracion` | CMS: pares clave/valor de configuración global |
| `home_sections` | Secciones dinámicas de la página de inicio |
| `blog_posts` | Artículos del blog editables desde admin |
| `orders` | Pedidos de la tienda |
| `leads` | Contactos del formulario |
| `projects` | Portafolio de proyectos |
| `admin_users` | Usuarios del panel admin |
| `cupones` | Códigos de descuento |
| `banners` | Banners del carrusel |
| `push_subscriptions` | Suscripciones a notificaciones |
| `integrations` | Credenciales de Cloudinary y otros servicios |

### Cómo agregar una nueva tabla

1. En `scripts/create-tables.sql`, agrega al final:

   ```sql
   -- TABLA: mi_nueva_tabla
   CREATE TABLE IF NOT EXISTS public.mi_nueva_tabla (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     nombre text NOT NULL,
     datos jsonb DEFAULT '{}'::jsonb,
     activo boolean DEFAULT true,
     created_at timestamptz DEFAULT now()
   );

   -- TABLA: mi_nueva_tabla-migrate
   ALTER TABLE public.mi_nueva_tabla ADD COLUMN IF NOT EXISTS datos jsonb DEFAULT '{}'::jsonb;
   ```

2. Ve a `/admin/setup` y presiona **"Crear tablas ahora"**.

3. Usa la tabla:

   ```ts
   import { insforge } from '@/lib/insforge';

   const { data, error } = await insforge.database
     .from('mi_nueva_tabla')
     .select('*')
     .eq('activo', true);
   ```

### Consultar la base de datos desde el admin

`/admin/sql` — terminal SQL directo para ejecutar cualquier consulta.

---

## 4. Frontend — Páginas Públicas

### 4.1 Inicio (`/`) — `src/app/page.tsx`

Renderiza en el servidor. Lee `configuracion` y `home_sections` desde la DB.

- **Cambiar título principal:** `/admin/configuracion` → `hero_title`.
- **Cambiar imagen de fondo:** `/admin/configuracion` → `hero_cover_url`.
- **Agregar secciones dinámicas:** `/admin/home`.

**Hero (CSS):** `src/components/Hero.tsx`. El título usa `font-playfair`, el dorado es `yellow-400` (`#FACC15`), las animaciones de entrada usan **GSAP**.

### 4.2 Servicios (`/servicios`) — `src/app/servicios/page.tsx`

Renderiza `<SolucionesContent initialTab="servicios" />`. Lista de servicios y precios por m² están en `src/components/SolucionesContent.tsx`.

### 4.3 Tienda (`/tienda`) — `src/app/tienda/page.tsx`

Carga productos en tiempo real desde la tabla `products`.
**Agregar producto:** `/admin/productos` → "Nuevo producto".

### 4.4 Blog (`/blog`)

Combina artículos de la DB (`blog_posts`) con archivos Markdown en `src/content/blog/*.md`.

**Crear post desde archivos:**

```markdown
---
title: "Título del artículo"
description: "Descripción breve"
date: "2025-01-15"
cover: "https://url-imagen.com/foto.jpg"
tags: ["metalcon", "construcción"]
---

Contenido en **markdown** aquí...
```

**Crear post desde admin:** `/admin/blog` → "Nuevo artículo".

### 4.5 Checkout (`/checkout`)

Procesa pagos con MercadoPago. Requiere carrito en `sessionStorage` (clave `fabrick.cart.session.v2`).

### 4.6 Cotizaciones (`/cotizaciones`)

Formulario de cotización. Los ítems se acumulan en `QuoteCartContext`.

### 4.7 Proyectos (`/proyectos`)

Portafolio. Lee desde la tabla `projects`. Agregar desde `/admin/proyectos`.

### 4.8 Diseñador 3D (`/juego`)

Permite al usuario diseñar una casa en 3D. Ver sección 17.

### 4.9 Contacto (`/contacto`)

Crea un `lead` en la tabla `leads`.

### 4.10 Mi Cuenta (`/mi-cuenta`)

Perfil del usuario autenticado con InsForge Auth.

---

## 5. Componentes Reutilizables

### `Navbar` — `src/components/Navbar.tsx`

Barra de navegación fija. Para agregar un enlace nuevo:

```tsx
// NAV_LINKS (desktop):
const NAV_LINKS: NavLink[] = [
  // ... existentes
  { label: 'Mi Nuevo Link', href: '/mi-ruta' },
];

// MENU_ITEMS (móvil):
import { Star } from 'lucide-react';
const MENU_ITEMS = [
  // ... existentes
  { label: 'Mi Nuevo Link', href: '/mi-ruta', Icon: Star },
];
```

### `Hero` — `src/components/Hero.tsx`

```tsx
<Hero coverUrl="https://url-de-imagen.com/foto.jpg" />
```

### `HomeDynamicSections` — `src/components/HomeDynamicSections.tsx`

Renderiza secciones dinámicas de la DB. Para agregar nuevo tipo:

1. Agrega el tipo en `src/lib/homeSectionKinds.ts`.
2. Crea el componente en `src/components/`.
3. Agrégalo al `switch` en `HomeDynamicSections.tsx`.

### `CheckoutApp` — `src/components/CheckoutApp.tsx`

Formulario completo de checkout. Lee carrito de `sessionStorage` y envía pagos a `/api/payments/mercadopago`.

### `ContactForm`, `WhatsAppButton`, `BannerCarousel`

Componentes auxiliares. WhatsApp y banners se configuran desde el admin.

---

## 6. Hooks Personalizados

### `useRealtimeProducts` — `src/hooks/useRealtimeProducts.ts`

Carga productos con caché local y suscripción de tiempo real.

```tsx
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';

function MiComponente() {
  const { products, loading, connected } = useRealtimeProducts();
  if (loading) return <p>Cargando...</p>;
  return (
    <div>
      {connected && <span className="text-green-400">● En vivo</span>}
      {products.map(p => <div key={p.id}>{p.name} — ${p.price}</div>)}
    </div>
  );
}
```

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `products` | `Product[]` | Productos activos |
| `loading` | `boolean` | `true` mientras carga |
| `connected` | `boolean` | Conexión tiempo real activa |
| `lastEvent` | `RealtimeEvent \| null` | Último evento |
| `reload` | `() => void` | Recargar desde DB |

### `useCategories`, `useCart`, `useCatalogProducts`, `useAdminIdleLogout`

Cada uno expone una funcionalidad específica. Ver `src/hooks/`.

### Crear un hook nuevo

```tsx
// src/hooks/useProjects.ts
'use client';
import { useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';

export interface Project {
  id: string; titulo: string; categoria: string; imagen_url?: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insforge.database
      .from('projects')
      .select('id, titulo, categoria, imagen_url')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setProjects(data as Project[]);
        setLoading(false);
      });
  }, []);

  return { projects, loading };
}
```

---

## 7. Contexts (Estado Global)

La app tiene 4 providers globales en `src/app/layout.tsx`:

```tsx
<ThemeProvider>
  <AuthProvider>
    <CartProvider>
      <QuoteCartProvider>
        {children}
      </QuoteCartProvider>
    </CartProvider>
  </AuthProvider>
</ThemeProvider>
```

### `AuthContext`

```tsx
import { useAuth } from '@/context/AuthContext';

const { user, loading, signOut } = useAuth();
```

### `CartContext` (carrito de tienda)

```tsx
import { useCartContext } from '@/context/CartContext';

const { items, totalItems, totalPrice, addToCart, clearCart } = useCartContext();

// Versión segura (no lanza error si no hay provider):
import { useCartContextSafe } from '@/context/CartContext';
const cart = useCartContextSafe(); // puede ser null
```

### `QuoteCartContext` (carrito de cotizaciones)

Independiente del carrito de tienda, para servicios + módulos del diseñador 3D.

### `ThemeContext`

```tsx
import { useTheme } from '@/lib/ThemeContext';
const { theme, toggleTheme } = useTheme();
```

### Crear un Context nuevo

```tsx
// src/context/NotificationsContext.tsx
'use client';
import { createContext, useContext, useState } from 'react';

interface Notification { id: string; message: string; type: 'success' | 'error' | 'info'; }

interface NotificationsCtx {
  notifications: Notification[];
  addNotification: (msg: string, type?: Notification['type']) => void;
  removeNotification: (id: string) => void;
}

const Ctx = createContext<NotificationsCtx | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string, type: Notification['type'] = 'info') => {
    const id = crypto.randomUUID();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id: string) =>
    setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <Ctx.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </Ctx.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications fuera de provider');
  return ctx;
};
```

Luego envuélvelo en `src/app/layout.tsx`.

---

## 8. CSS y Diseño Tailwind

### Paleta de la marca

| Nombre | Tailwind | Hex | Uso |
|--------|---------|-----|-----|
| Dorado eléctrico | `yellow-400` | `#FACC15` | Acentos, botones primarios |
| Dorado brillante | `yellow-300` | `#FDE047` | Hover de botones |
| Dorado profundo | `yellow-600` | `#CA8A04` | Texto secundario |
| Negro base | `black` | `#000000` | Fondo principal |
| Zinc oscuro | `zinc-950` | `#09090B` | Fondo de tarjetas |
| Zinc medio | `zinc-800` | `#27272A` | Bordes |
| Zinc claro | `zinc-400` | `#A1A1AA` | Texto secundario |

### Sombras doradas personalizadas

`shadow-yellow-sm`, `shadow-yellow-md`, `shadow-yellow-lg`, `shadow-yellow-xl`.

### Fuentes

| Clase | Fuente | Uso |
|-------|--------|-----|
| `font-playfair` | Playfair Display | Títulos H1 grandes |
| `font-inter` | Inter | Cuerpo de texto |
| `font-cormorant` | Cormorant Garamond | Texto editorial |

### Patrones frecuentes

**Botón primario:**

```tsx
<button className="px-6 py-3 bg-yellow-400 text-black font-bold uppercase tracking-widest rounded-full hover:bg-yellow-300 transition-all shadow-yellow-sm hover:shadow-yellow-md">
  Acción principal
</button>
```

**Botón outline:**

```tsx
<button className="px-6 py-3 border border-yellow-400/40 text-yellow-400 rounded-full hover:bg-yellow-400/10 hover:border-yellow-400 transition-all">
  Acción secundaria
</button>
```

**Tarjeta oscura:**

```tsx
<div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-yellow-400/20 transition-all">
  Contenido
</div>
```

**Badge:**

```tsx
<span className="inline-flex items-center gap-2 px-3 py-1 border border-yellow-400/30 rounded-full bg-black/40 text-xs uppercase tracking-widest text-yellow-400/90">
  Destacado
</span>
```

**Separador dorado:**

```tsx
<div className="w-24 h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto my-8" />
```

### Modo oscuro

Usa la clase `dark` en `<html>`:

```tsx
<div className="bg-white dark:bg-zinc-900 text-black dark:text-white">
```

### Animación CSS personalizada

En `tailwind.config.js`:

```js
animation: {
  'pulse-gold': 'pulseGold 2s ease-in-out infinite',
},
keyframes: {
  pulseGold: {
    '0%, 100%': { boxShadow: '0 0 15px rgba(250,204,21,0.3)' },
    '50%':       { boxShadow: '0 0 40px rgba(250,204,21,0.7)' },
  },
},
```

Uso: `className="animate-pulse-gold"`.

---

## 9. Backend — API Routes

Todas las API routes están en `src/app/api/`.

### Estructura básica

```ts
// src/app/api/mi-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ data: 'resultado' });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
```

### APIs principales

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/productos` | GET | Lista productos públicos |
| `/api/orders` | GET/POST | Consultar/crear pedidos |
| `/api/payments/mercadopago` | POST | Procesar pago MP |
| `/api/payments/mp-status` | GET | Estado de configuración MP |
| `/api/payments/webhook` | POST | Webhook de MercadoPago |
| `/api/cms` | GET | Leer configuración CMS |
| `/api/cotizaciones` | POST | Enviar cotización |
| `/api/leads` | POST | Crear lead |
| `/api/push/subscribe` | POST | Suscribir notificaciones |
| `/api/admin/login` | POST | Login del admin |
| `/api/admin/blog` | GET/POST | Gestionar blog |
| `/api/admin/media` | POST | Subir imágenes a Cloudinary |
| `/api/admin/sql` | POST | Ejecutar SQL (admin) |
| `/api/admin/setup-tables` | POST | Crear/migrar tablas |

### API protegida por admin

```ts
// src/app/api/admin/mi-recurso/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';

export async function GET(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { data, error } = await insforgeAdmin.database
      .from('mi_nueva_tabla')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Error al leer datos' }, { status: 500 });
  }
}
```

---

## 10. Panel de Administración

**URL:** `/admin`. **Login:** `/admin/login`.

### Secciones

| Ruta | Descripción |
|------|-------------|
| `/admin` | Dashboard con KPIs |
| `/admin/productos` | Gestionar catálogo |
| `/admin/pedidos` | Pedidos |
| `/admin/cotizaciones` | Cotizaciones recibidas |
| `/admin/blog` | Blog |
| `/admin/proyectos` | Portafolio |
| `/admin/clientes` | Clientes registrados |
| `/admin/home` | Editar página de inicio |
| `/admin/tienda` | Configurar la tienda |
| `/admin/medios` | Cloudinary y biblioteca |
| `/admin/configuracion` | CMS general |
| `/admin/equipo` | Usuarios admin (superadmin) |
| `/admin/setup` | Crear/migrar tablas |
| `/admin/sql` | Terminal SQL |
| `/admin/manual` | **Este manual** |

### Crear nueva página admin

1. Crea `src/app/admin/mi-seccion/page.tsx`.
2. Agrega el enlace al sidebar en `src/components/admin/AdminShell.tsx` (`navSections`).
3. Agrega el `PATH_LABELS['/admin/mi-seccion']` para breadcrumbs.

### Roles

| Rol | Acceso |
|-----|--------|
| `admin` | Completo excepto `/admin/equipo` |
| `superadmin` | Todo |

---

## 11. Seguridad

### Content Security Policy (CSP)

`src/middleware.ts` emite una CSP estricta con nonce por petición.

**Si agregas un `<script>` inline en un Server Component:**

```tsx
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function MiPagina() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Thing' };
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

### Protección del admin

Todas las rutas `/admin/*` se validan en `src/middleware.ts`. La sesión es un JWT firmado con HMAC-SHA256 usando `ADMIN_SESSION_SECRET`.

```ts
import { verifyAdminSession } from '@/lib/adminAuth';

const session = await verifyAdminSession(request);
if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
```

### Anti-bot Turnstile

Formulario de contacto: `src/components/TurnstileWidget.tsx`.

### Variables de entorno secretas

- `NEXT_PUBLIC_*` → bundle del navegador (solo datos públicos).
- Sin prefijo → solo servidor.

Nunca pongas en código fuente claves privadas, tokens o contraseñas.

---

## 12. Sistema CMS

CMS clave-valor en la tabla `configuracion`.

### Leer configuración (servidor)

```ts
import { getCmsSettings } from '@/lib/cms';

const settings = await getCmsSettings();
```

### Claves disponibles

| Clave | Descripción |
|-------|-------------|
| `nombre_empresa` | Nombre del negocio |
| `slogan` | Slogan |
| `whatsapp` | Número WhatsApp (solo dígitos) |
| `email_contacto` | Email |
| `direccion` | Dirección física |
| `hero_cover_url` | Imagen de fondo Hero |
| `logo_url` | URL del logo |
| `social_instagram` | URL Instagram |
| `social_facebook` | URL Facebook |
| `social_tiktok` | URL TikTok |

### Agregar nueva clave

1. En `src/lib/cms.ts`, agrega al interface `CmsSettings` y al `DEFAULT_SETTINGS`.
2. En `/admin/sql` ejecuta:

   ```sql
   INSERT INTO configuracion (clave, valor) VALUES ('mi_clave', 'mi valor')
   ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
   ```

3. Úsala: `settings.mi_clave`.

### Secciones dinámicas (`home_sections`)

Edítalas desde `/admin/home`. Tipos disponibles (`kind`):

`hero`, `features`, `gallery`, `cta`, `testimonials`, `stats`.

---

## 13. Pagos con MercadoPago

### Flujo

1. Usuario llena `/checkout`.
2. Cliente → `POST /api/payments/mercadopago`.
3. Servidor procesa con SDK MP.
4. Respuestas:
   - `200 {status: 'approved'}` → aprobado.
   - `202 {status: 'pending'}` → pendiente.
   - `422 {status: 'rejected'}` → rechazado.
   - `503` → MP no configurado.

### Configuración

```bash
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxx
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-xxxx
```

### Verificar estado

```ts
const res = await fetch('/api/payments/mp-status');
const { configured, publicKey } = await res.json();
```

### Webhook

URL para configurar en tu cuenta MP: `https://www.solucionesfabrick.com/api/payments/webhook`.

---

## 14. Carrito de Tienda vs Cotizaciones

### Carrito de tienda — `CartContext`

- Productos físicos.
- Persiste en `localStorage` (clave `fabrick.cart.v2`), 24 h.
- Flujo: Tienda → Carrito → Checkout → MercadoPago.

### Carrito de cotizaciones — `QuoteCartContext`

- Servicios y módulos del diseñador 3D.
- Persiste en `localStorage` (clave distinta).
- Flujo: Servicios/Diseñador → Cotización → Email.

Son **independientes**: agregar a uno no afecta al otro.

---

## 15. Tiempo Real (Realtime)

InsForge ofrece WebSocket para suscribirse a cambios en tablas.

```tsx
'use client';
import { useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';

export function MiComponente() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    let cleanup = false;

    (async () => {
      await insforge.realtime.connect();
      if (cleanup) return;
      await insforge.realtime.subscribe('mi_tabla');

      insforge.realtime.on('INSERT_mi_tabla', (payload) => {
        setItems(prev => [...prev, payload.contenido]);
      });
      insforge.realtime.on('UPDATE_mi_tabla', (payload) => {
        // manejar update
      });
    })();

    return () => {
      cleanup = true;
      insforge.realtime.unsubscribe('mi_tabla');
    };
  }, []);

  return <div>{items.length} mensajes en vivo</div>;
}
```

**Eventos:** `{OPERACION}_{nombre_tabla}` → `INSERT_products`, `UPDATE_products`, `INSERT_orders`, etc.

---

## 16. Blog y Casos de Estudio

### Blog

Dos fuentes combinadas:

1. Markdown en `src/content/blog/*.md` (fallback).
2. DB tabla `blog_posts` (editable desde admin).

**Crear desde Markdown:**

```markdown
---
title: "Título del artículo"
description: "Descripción de 160 caracteres max"
date: "2025-06-15"
cover: "https://url-imagen.com/foto.jpg"
tags: ["metalcon", "construcción"]
draft: false
---

Texto en **Markdown**.
```

### Casos (`/casos`)

Markdown en `src/content/casos/*.md` con campos extra:

```markdown
---
title: "Casa Metalcon 2 pisos — Colina"
client: "Familia Rodríguez"
location: "Colina, RM"
services: ["Metalcon", "Gasfitería", "Electricidad"]
duration: "4 meses"
outcome: "142 m² terminados a tiempo"
---
```

---

## 17. Diseñador 3D (`/juego` y `/editor`)

`src/app/juego/HouseDesigner.tsx` — diseñador con drag & drop de módulos.

**Catálogo de módulos** — `PANEL_TYPES`:

```tsx
const PANEL_TYPES = [
  { id: 'wall', label: 'Muro', ... },
  { id: 'window', label: 'Ventana', ... },
  // Para agregar:
  {
    id: 'terraza',
    label: 'Terraza',
    color: '#8B7355',
    dimensions: { width: 4, height: 0.2, depth: 3 },
    price: 250000,
  },
];
```

**Tecnologías:** `react-three-fiber`, `@react-three/drei`, `three.js`, `zustand` + `zundo` (undo/redo).

`/editor` monta el mismo `HouseDesigner` vía `next/dynamic`.

---

## 18. Notificaciones Push

### Configuración (una vez)

```bash
npx web-push generate-vapid-keys
```

Agrega a `.env.local`:

```bash
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:tu@email.com
```

### Suscribir usuario

Componente `PushOptIn` en `src/components/PushOptIn.tsx` lo hace automáticamente.

### Enviar notificación

Desde `/admin` o vía API (admin):

```ts
const res = await fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Nuevo proyecto publicado',
    body: 'Mira nuestro último trabajo',
    url: '/proyectos/casa-colina',
  }),
});
```

---

## 19. Cómo Agregar Nuevas Funciones

### Ejemplo: agregar sección de **Testimonios**

**Paso 1 — DB.** En `/admin/sql`:

```sql
CREATE TABLE IF NOT EXISTS public.testimonios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  cargo text,
  comentario text NOT NULL,
  puntuacion integer DEFAULT 5,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Paso 2 — API:**

```ts
// src/app/api/testimonios/route.ts
import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

export async function GET() {
  try {
    const { data, error } = await insforge.database
      .from('testimonios').select('*').eq('activo', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
```

**Paso 3 — Hook:**

```ts
// src/hooks/useTestimonios.ts
'use client';
import { useEffect, useState } from 'react';

export function useTestimonios() {
  const [testimonios, setTestimonios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/testimonios')
      .then(r => r.json())
      .then(({ data }) => { setTestimonios(data); setLoading(false); });
  }, []);

  return { testimonios, loading };
}
```

**Paso 4 — Componente:**

```tsx
// src/components/Testimonios.tsx
'use client';
import { useTestimonios } from '@/hooks/useTestimonios';

export default function Testimonios() {
  const { testimonios, loading } = useTestimonios();
  if (loading) return null;

  return (
    <section className="py-20 px-6">
      <h2 className="font-playfair text-4xl font-bold text-white text-center mb-12">
        Lo que dicen nuestros <span className="text-yellow-400">clientes</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonios.map((t: any) => (
          <div key={t.id} className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-yellow-400/20 transition-all">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: t.puntuacion }).map((_, i) => (
                <span key={i} className="text-yellow-400">★</span>
              ))}
            </div>
            <p className="text-zinc-300 text-sm mb-4">"{t.comentario}"</p>
            <p className="text-white font-semibold">{t.nombre}</p>
            {t.cargo && <p className="text-zinc-500 text-xs">{t.cargo}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Paso 5 — Mostrar en home.** Agrega `<Testimonios />` en `src/app/page.tsx`.

**Paso 6 — Admin.** Crea `src/app/admin/testimonios/page.tsx` y enlace en `AdminShell.tsx`.

---

## 20. Comandos del Proyecto

```bash
# Desarrollo local
npm run dev

# Producción
npm run build
npm run start

# Calidad
npm run lint
npm run typecheck

# Tests
npm test
npm run test:coverage
npm run test:e2e
```

### Despliegue

Vercel: cada push a `main` hace deploy automático. Configura las variables en Settings → Environment Variables.

### Docker (local)

```bash
docker compose up
docker compose -f compose.debug.yaml up
```

---

## Resumen — Dónde modificar cada área

| Área | Archivo / Ruta |
|------|----------------|
| Logo y nombre | `/admin/configuracion` |
| Hero (texto/imagen) | `/admin/configuracion` |
| Menú navegación | `src/components/Navbar.tsx` |
| Colores y fuentes | `tailwind.config.js` |
| CSS global | `src/app/globals.css` |
| Productos | `/admin/productos` |
| Secciones home | `/admin/home` |
| Blog | `/admin/blog` o `src/content/blog/*.md` |
| Portafolio | `/admin/proyectos` |
| WhatsApp | `/admin/configuracion` → `whatsapp` |
| Pagos | `.env.local` → `MERCADO_PAGO_*` |
| CSP / seguridad | `src/lib/csp.ts` |
| Tablas DB | `scripts/create-tables.sql` + `/admin/setup` |
| Nueva página pública | `src/app/[ruta]/page.tsx` |
| Nueva página admin | `src/app/admin/[seccion]/page.tsx` |
| Nuevo endpoint API | `src/app/api/[endpoint]/route.ts` |

---

© Soluciones Fabrick — Manual técnico interno.
