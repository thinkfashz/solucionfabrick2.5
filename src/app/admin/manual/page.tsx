'use client';

/**
 * /admin/manual — Manual completo de la app, embebido en el panel admin.
 *
 * Estructura:
 *  - Hero animado con título, subtítulo y CTA
 *  - Tabla de contenidos lateral (sticky) con scroll-spy
 *  - 20 secciones del manual con jerarquía visual
 *  - Animaciones de entrada por sección (framer-motion)
 *  - Botón al final que abre el manual completo (`/MANUAL.md`)
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Layers,
  KeyRound,
  Database,
  LayoutGrid,
  Component,
  Anchor,
  Boxes,
  Palette,
  ServerCog,
  ShieldCheck,
  FileEdit,
  CreditCard,
  ShoppingCart,
  Radio,
  Newspaper,
  Box,
  Bell,
  Sparkles,
  Terminal,
  ExternalLink,
  ChevronRight,
  Download,
  Hash,
  Copy,
  Check,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────
 * Tipos
 * ───────────────────────────────────────────────────────── */

interface Section {
  id: string;
  num: number;
  title: string;
  icon: typeof BookOpen;
  color: string;
  content: ReactNode;
}

/* ──────────────────────────────────────────────────────────
 * Helpers UI
 * ───────────────────────────────────────────────────────── */

function CodeBlock({ children, lang = 'tsx' }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400/80">
          {lang}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 transition-all hover:border-yellow-400/40 hover:text-yellow-400"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copiado
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copiar
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-[12px] leading-relaxed text-zinc-200">
        <code className="font-mono">{children}</code>
      </pre>
    </div>
  );
}

function Callout({
  type = 'info',
  children,
}: {
  type?: 'info' | 'warning' | 'success';
  children: ReactNode;
}) {
  const styles = {
    info: 'border-yellow-400/30 bg-yellow-400/5 text-yellow-100',
    warning: 'border-orange-400/30 bg-orange-400/5 text-orange-100',
    success: 'border-emerald-400/30 bg-emerald-400/5 text-emerald-100',
  };
  return (
    <div className={`my-4 rounded-2xl border ${styles[type]} px-4 py-3 text-[13px] leading-relaxed`}>
      {children}
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300">
      {children}
    </span>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (ReactNode | string)[][];
}) {
  return (
    <div className="my-4 overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-left text-[12px]">
        <thead className="bg-yellow-400/5">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border-b border-yellow-400/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-zinc-300 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 text-[15px] font-bold text-white flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
      {children}
    </h3>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="my-3 text-[13.5px] leading-relaxed text-zinc-300">{children}</p>;
}

function UL({ children }: { children: ReactNode }) {
  return <ul className="my-3 space-y-1.5 pl-4 text-[13px] text-zinc-300">{children}</ul>;
}

function LI({ children }: { children: ReactNode }) {
  return (
    <li className="relative pl-3 leading-relaxed before:absolute before:left-0 before:top-[0.55em] before:h-1 before:w-1 before:rounded-full before:bg-yellow-400/60">
      {children}
    </li>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[12px] text-yellow-200">
      {children}
    </code>
  );
}

/* ──────────────────────────────────────────────────────────
 * Sección animada
 * ───────────────────────────────────────────────────────── */

function AnimatedSection({
  section,
  onInView,
}: {
  section: Section;
  onInView: (id: string) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: '-40% 0px -50% 0px' });

  useEffect(() => {
    if (inView) onInView(section.id);
  }, [inView, section.id, onInView]);

  const Icon = section.icon;

  return (
    <motion.section
      ref={ref}
      id={section.id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="scroll-mt-24"
    >
      <div className="mb-5 flex items-start gap-4">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, type: 'spring' }}
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${section.color} shadow-[0_4px_20px_rgba(250,204,21,0.25)]`}
        >
          <Icon className="h-5 w-5 text-black" />
        </motion.span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-yellow-400/70">
            Sección {String(section.num).padStart(2, '0')}
          </p>
          <h2 className="font-playfair text-2xl font-black text-white md:text-3xl">
            {section.title}
          </h2>
        </div>
        <a
          href={`#${section.id}`}
          className="hidden items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 transition-all hover:border-yellow-400/40 hover:text-yellow-400 md:inline-flex"
          aria-label={`Enlace a sección ${section.num}`}
        >
          <Hash className="h-3 w-3" />
          {section.id}
        </a>
      </div>

      <div className="mb-5 h-px w-full bg-gradient-to-r from-yellow-400/40 via-yellow-400/10 to-transparent" />

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 to-black p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        {section.content}
      </div>
    </motion.section>
  );
}

/* ──────────────────────────────────────────────────────────
 * Tabla de contenidos
 * ───────────────────────────────────────────────────────── */

function TOC({
  sections,
  activeId,
}: {
  sections: Section[];
  activeId: string;
}) {
  return (
    <nav
      aria-label="Tabla de contenidos"
      className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#0e0e10,#0a0a0b)] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
    >
      <div className="mb-3 flex items-center gap-2 border-b border-white/5 pb-3">
        <BookOpen className="h-4 w-4 text-yellow-400" />
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-400">
          Contenido
        </p>
      </div>
      <ul className="space-y-0.5">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = activeId === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all ${
                  active
                    ? 'bg-yellow-400/15 border border-yellow-400/30'
                    : 'border border-transparent hover:bg-white/[0.04] hover:border-white/10'
                }`}
              >
                <span
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                    active
                      ? 'bg-yellow-400 text-black'
                      : 'bg-white/5 text-yellow-400/70 group-hover:text-yellow-400'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <span
                  className={`flex-1 truncate text-[11.5px] font-semibold leading-tight ${
                    active ? 'text-yellow-400' : 'text-zinc-300 group-hover:text-white'
                  }`}
                >
                  <span className="text-zinc-500 mr-1">{String(s.num).padStart(2, '0')}.</span>
                  {s.title}
                </span>
                {active && <ChevronRight className="h-3 w-3 flex-shrink-0 text-yellow-400" />}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ──────────────────────────────────────────────────────────
 * Datos: secciones del manual
 * ───────────────────────────────────────────────────────── */

const SECTIONS: Section[] = [
  {
    id: 'arquitectura',
    num: 1,
    title: 'Arquitectura General',
    icon: Layers,
    color: 'bg-yellow-400',
    content: (
      <>
        <P>
          La app es <strong className="text-white">Next.js 15</strong> (App Router) con{' '}
          <strong className="text-white">React 19</strong>, conectada a{' '}
          <strong className="text-yellow-400">InsForge</strong> como backend-as-a-service
          (PostgreSQL + autenticación + storage + tiempo real).
        </P>
        <CodeBlock lang="tree">{`solucionfabrick2.5/
├── src/
│   ├── app/               ← Páginas y rutas (App Router)
│   │   ├── page.tsx       ← Inicio (/)
│   │   ├── layout.tsx     ← Layout raíz (providers globales)
│   │   ├── servicios/     ← /servicios
│   │   ├── tienda/        ← /tienda
│   │   ├── admin/         ← Panel admin
│   │   └── api/           ← API Routes (backend)
│   ├── components/        ← Componentes React
│   ├── context/           ← Providers de estado global
│   ├── hooks/             ← Custom hooks
│   ├── lib/               ← Lógica y utilidades
│   └── middleware.ts      ← Middleware (CSP + auth)
├── scripts/
│   └── create-tables.sql  ← Esquema de la base de datos
└── tailwind.config.js     ← Configuración Tailwind`}</CodeBlock>
        <H3>Tecnologías clave</H3>
        <div className="flex flex-wrap gap-2">
          <Tag>Next.js 15</Tag>
          <Tag>React 19</Tag>
          <Tag>InsForge SDK</Tag>
          <Tag>Tailwind 3.4</Tag>
          <Tag>Framer Motion</Tag>
          <Tag>GSAP</Tag>
          <Tag>Zustand</Tag>
          <Tag>Three.js / R3F</Tag>
          <Tag>MercadoPago</Tag>
        </div>
      </>
    ),
  },
  {
    id: 'env',
    num: 2,
    title: 'Variables de Entorno',
    icon: KeyRound,
    color: 'bg-yellow-400',
    content: (
      <>
        <P>
          Archivo: <Code>.env.local</Code> (copiar desde <Code>.env.example</Code>).
        </P>
        <CodeBlock lang="bash">{`# OBLIGATORIAS ──────────────────────────────────
NEXT_PUBLIC_INSFORGE_URL=https://tu-proyecto.us-east.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=ik_tu_clave_publica_aqui
INSFORGE_API_KEY=tu_clave_privada
ADMIN_SESSION_SECRET=tu_secreto_largo_aleatorio

# PAGOS ─────────────────────────────────────────
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADO_PAGO_WEBHOOK_SECRET=xxx
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-xxx

# OPCIONALES ───────────────────────────────────
NEXT_PUBLIC_APP_URL=https://www.solucionesfabrick.com
NEXT_PUBLIC_WHATSAPP_NUMBER=56930121625

# Notificaciones push (opcional)
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:tu@email.com`}</CodeBlock>
        <Callout type="warning">
          <strong>Regla de oro:</strong> variables con prefijo <Code>NEXT_PUBLIC_</Code> se
          incluyen en el bundle del navegador (solo datos públicos). Sin prefijo solo están
          disponibles en el servidor.
        </Callout>
        <H3>Cómo agregar una nueva variable</H3>
        <UL>
          <LI>Agrégala a <Code>.env.example</Code> con un comentario.</LI>
          <LI>
            Si necesita estar en el navegador → prefijo <Code>NEXT_PUBLIC_</Code>. Sino, sin
            prefijo.
          </LI>
          <LI>En Vercel: Settings → Environment Variables.</LI>
        </UL>
      </>
    ),
  },
  {
    id: 'database',
    num: 3,
    title: 'Base de Datos',
    icon: Database,
    color: 'bg-yellow-400',
    content: (
      <>
        <P>
          Las tablas se crean ejecutando <Code>scripts/create-tables.sql</Code> desde{' '}
          <Code>/admin/setup</Code> (botón <strong className="text-yellow-400">Crear tablas
          ahora</strong>).
        </P>
        <H3>Tablas principales</H3>
        <DataTable
          headers={['Tabla', 'Descripción']}
          rows={[
            [<Code key="1">products</Code>, 'Catálogo de la tienda'],
            [<Code key="2">configuracion</Code>, 'CMS clave/valor de configuración global'],
            [<Code key="3">home_sections</Code>, 'Secciones dinámicas de la home'],
            [<Code key="4">blog_posts</Code>, 'Artículos del blog'],
            [<Code key="5">orders</Code>, 'Pedidos de la tienda'],
            [<Code key="6">leads</Code>, 'Contactos del formulario'],
            [<Code key="7">projects</Code>, 'Portafolio de proyectos'],
            [<Code key="8">admin_users</Code>, 'Usuarios del panel admin'],
            [<Code key="9">cupones</Code>, 'Códigos de descuento'],
            [<Code key="10">banners</Code>, 'Banners del carrusel'],
            [<Code key="11">push_subscriptions</Code>, 'Suscripciones a notificaciones'],
            [<Code key="12">integrations</Code>, 'Credenciales de Cloudinary y otros'],
          ]}
        />
        <H3>Cómo agregar una nueva tabla</H3>
        <CodeBlock lang="sql">{`-- 1. En scripts/create-tables.sql, agrega:
-- TABLA: mi_nueva_tabla
CREATE TABLE IF NOT EXISTS public.mi_nueva_tabla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  datos jsonb DEFAULT '{}'::jsonb,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- TABLA: mi_nueva_tabla-migrate
ALTER TABLE public.mi_nueva_tabla
  ADD COLUMN IF NOT EXISTS datos jsonb DEFAULT '{}'::jsonb;

-- 2. Ve a /admin/setup → "Crear tablas ahora"`}</CodeBlock>
        <CodeBlock lang="ts">{`// 3. Úsala en código:
import { insforge } from '@/lib/insforge';

const { data, error } = await insforge.database
  .from('mi_nueva_tabla')
  .select('*')
  .eq('activo', true);`}</CodeBlock>
        <Callout type="info">
          Para SQL ad-hoc usa <Code>/admin/sql</Code> (terminal SQL directo).
        </Callout>
      </>
    ),
  },
  {
    id: 'paginas',
    num: 4,
    title: 'Frontend — Páginas Públicas',
    icon: LayoutGrid,
    color: 'bg-yellow-400',
    content: (
      <>
        <DataTable
          headers={['Ruta', 'Archivo', 'Cómo modificar']}
          rows={[
            [<Code key="1">/</Code>, 'src/app/page.tsx', '/admin/configuracion + /admin/home'],
            [<Code key="2">/servicios</Code>, 'src/app/servicios/page.tsx', 'src/components/SolucionesContent.tsx'],
            [<Code key="3">/tienda</Code>, 'src/app/tienda/page.tsx', '/admin/productos'],
            [<Code key="4">/blog</Code>, 'src/app/blog/page.tsx', '/admin/blog o src/content/blog/*.md'],
            [<Code key="5">/checkout</Code>, 'src/app/checkout/page.tsx', 'src/components/CheckoutApp.tsx'],
            [<Code key="6">/cotizaciones</Code>, 'src/app/cotizaciones/', 'CotizacionesClient.tsx'],
            [<Code key="7">/proyectos</Code>, 'src/app/proyectos/', '/admin/proyectos'],
            [<Code key="8">/juego</Code>, 'src/app/juego/HouseDesigner.tsx', 'PANEL_TYPES'],
            [<Code key="9">/contacto</Code>, 'src/app/contacto/', 'src/components/ContactForm.tsx'],
            [<Code key="10">/mi-cuenta</Code>, 'src/app/mi-cuenta/', 'AuthContext'],
          ]}
        />
        <H3>Ejemplo: cambiar el badge del Hero</H3>
        <CodeBlock lang="tsx">{`// src/components/Hero.tsx, línea ~117
<span className="text-xs uppercase tracking-[0.25em] text-yellow-400/90 font-medium">
  Tu nuevo texto aquí
</span>`}</CodeBlock>
        <H3>Crear una página nueva</H3>
        <UL>
          <LI>Crea el archivo <Code>src/app/mi-ruta/page.tsx</Code>.</LI>
          <LI>Si tiene <Code>{'<Suspense>'}</Code> o JSON-LD inline, agrega <Code>export const dynamic = &apos;force-dynamic&apos;</Code>.</LI>
          <LI>Si quieres SEO, exporta <Code>metadata: Metadata</Code>.</LI>
        </UL>
      </>
    ),
  },
  {
    id: 'componentes',
    num: 5,
    title: 'Componentes Reutilizables',
    icon: Component,
    color: 'bg-yellow-400',
    content: (
      <>
        <H3>Navbar — agregar un enlace nuevo</H3>
        <CodeBlock lang="tsx">{`// src/components/Navbar.tsx
const NAV_LINKS: NavLink[] = [
  // ... existentes
  { label: 'Mi Nuevo Link', href: '/mi-ruta' },
];

// Para que aparezca también en el menú móvil:
import { Star } from 'lucide-react';
const MENU_ITEMS = [
  // ... existentes
  { label: 'Mi Nuevo Link', href: '/mi-ruta', Icon: Star },
];`}</CodeBlock>
        <H3>Componentes principales</H3>
        <DataTable
          headers={['Componente', 'Propósito']}
          rows={[
            [<Code key="1">Navbar</Code>, 'Navegación fija con menú hamburguesa'],
            [<Code key="2">Hero</Code>, 'Banner con animaciones GSAP + parallax'],
            [<Code key="3">HomeDynamicSections</Code>, 'Renderiza secciones de DB'],
            [<Code key="4">CheckoutApp</Code>, 'Formulario de checkout MP'],
            [<Code key="5">ContactForm</Code>, 'Formulario con Turnstile'],
            [<Code key="6">WhatsAppButton</Code>, 'Botón flotante WhatsApp'],
            [<Code key="7">BannerCarousel</Code>, 'Carrusel de banners'],
            [<Code key="8">CmsRealtimeListener</Code>, 'Refresca CMS al actualizar'],
          ]}
        />
      </>
    ),
  },
  {
    id: 'hooks',
    num: 6,
    title: 'Hooks Personalizados',
    icon: Anchor,
    color: 'bg-yellow-400',
    content: (
      <>
        <H3>useRealtimeProducts</H3>
        <CodeBlock lang="tsx">{`import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';

function MiComponente() {
  const { products, loading, connected } = useRealtimeProducts();
  if (loading) return <p>Cargando...</p>;
  return (
    <div>
      {connected && <span className="text-green-400">● En vivo</span>}
      {products.map(p => <div key={p.id}>{p.name} — \${p.price}</div>)}
    </div>
  );
}`}</CodeBlock>
        <H3>Crear un hook nuevo</H3>
        <CodeBlock lang="ts">{`// src/hooks/useProjects.ts
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
}`}</CodeBlock>
        <DataTable
          headers={['Hook', 'Descripción']}
          rows={[
            [<Code key="1">useRealtimeProducts</Code>, 'Productos con caché + tiempo real'],
            [<Code key="2">useCategories</Code>, 'Categorías de productos'],
            [<Code key="3">useCart</Code>, 'Acceso rápido al carrito'],
            [<Code key="4">useCatalogProducts</Code>, 'Productos con filtros'],
            [<Code key="5">useAdminIdleLogout</Code>, 'Auto-logout por inactividad'],
          ]}
        />
      </>
    ),
  },
  {
    id: 'contexts',
    num: 7,
    title: 'Contexts (Estado Global)',
    icon: Boxes,
    color: 'bg-yellow-400',
    content: (
      <>
        <P>4 providers globales en <Code>src/app/layout.tsx</Code>:</P>
        <CodeBlock lang="tsx">{`<ThemeProvider>
  <AuthProvider>
    <CartProvider>
      <QuoteCartProvider>
        {children}
      </QuoteCartProvider>
    </CartProvider>
  </AuthProvider>
</ThemeProvider>`}</CodeBlock>
        <H3>AuthContext</H3>
        <CodeBlock lang="tsx">{`import { useAuth } from '@/context/AuthContext';

const { user, loading, signOut } = useAuth();

if (!user) return <p>No has iniciado sesión</p>;
return <p>Hola, {user.name || user.email}</p>;`}</CodeBlock>
        <H3>CartContext (carrito de tienda)</H3>
        <CodeBlock lang="tsx">{`import { useCartContext, useCartContextSafe } from '@/context/CartContext';

const { items, totalItems, totalPrice, addToCart, clearCart } = useCartContext();

// Versión segura (no lanza error fuera del provider):
const cart = useCartContextSafe(); // puede ser null`}</CodeBlock>
        <H3>QuoteCartContext (carrito de cotizaciones)</H3>
        <P>Independiente del carrito de tienda, para servicios + módulos del diseñador 3D.</P>
        <H3>ThemeContext</H3>
        <CodeBlock lang="tsx">{`import { useTheme } from '@/lib/ThemeContext';

const { theme, toggleTheme } = useTheme();
return <button onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>;`}</CodeBlock>
      </>
    ),
  },
  {
    id: 'css',
    num: 8,
    title: 'CSS y Diseño Tailwind',
    icon: Palette,
    color: 'bg-yellow-400',
    content: (
      <>
        <H3>Paleta de la marca</H3>
        <DataTable
          headers={['Tailwind', 'Hex', 'Uso']}
          rows={[
            [
              <Code key="1">yellow-400</Code>,
              <span key="1b" className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded bg-[#FACC15]" /> #FACC15
              </span>,
              'Acentos, botones primarios',
            ],
            [
              <Code key="2">yellow-300</Code>,
              <span key="2b" className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded bg-[#FDE047]" /> #FDE047
              </span>,
              'Hover de botones',
            ],
            [
              <Code key="3">yellow-600</Code>,
              <span key="3b" className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded bg-[#CA8A04]" /> #CA8A04
              </span>,
              'Texto secundario',
            ],
            [
              <Code key="4">black</Code>,
              <span key="4b" className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded bg-black border border-white/20" /> #000000
              </span>,
              'Fondo principal',
            ],
            [
              <Code key="5">zinc-950</Code>,
              <span key="5b" className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded bg-[#09090B]" /> #09090B
              </span>,
              'Fondo de tarjetas',
            ],
          ]}
        />
        <H3>Sombras doradas personalizadas</H3>
        <div className="my-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['shadow-yellow-sm', 'shadow-[0_0_15px_rgba(250,204,21,0.25)]'],
            ['shadow-yellow-md', 'shadow-[0_0_30px_rgba(250,204,21,0.35)]'],
            ['shadow-yellow-lg', 'shadow-[0_0_60px_rgba(250,204,21,0.4)]'],
            ['shadow-yellow-xl', 'shadow-[0_0_100px_rgba(250,204,21,0.45)]'],
          ].map(([name, cls]) => (
            <div
              key={name}
              className={`rounded-2xl border border-yellow-400/20 bg-zinc-900 p-3 text-center text-[10px] font-mono text-yellow-300 ${cls}`}
            >
              {name}
            </div>
          ))}
        </div>
        <H3>Fuentes</H3>
        <DataTable
          headers={['Clase', 'Fuente', 'Uso']}
          rows={[
            [
              <Code key="1">font-playfair</Code>,
              <span key="2" className="font-playfair text-base">
                Playfair Display
              </span>,
              'Títulos H1 grandes',
            ],
            [<Code key="3">font-inter</Code>, 'Inter', 'Cuerpo de texto'],
            [
              <Code key="4">font-cormorant</Code>,
              <span key="5" className="font-cormorant text-base">
                Cormorant Garamond
              </span>,
              'Texto editorial',
            ],
          ]}
        />
        <H3>Patrones frecuentes</H3>
        <CodeBlock lang="tsx">{`// Botón primario
<button className="px-6 py-3 bg-yellow-400 text-black font-bold uppercase tracking-widest rounded-full hover:bg-yellow-300 transition-all shadow-yellow-sm hover:shadow-yellow-md">
  Acción principal
</button>

// Botón outline
<button className="px-6 py-3 border border-yellow-400/40 text-yellow-400 rounded-full hover:bg-yellow-400/10 hover:border-yellow-400 transition-all">
  Acción secundaria
</button>

// Tarjeta oscura
<div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-yellow-400/20 transition-all">
  Contenido
</div>

// Separador dorado
<div className="w-24 h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto my-8" />`}</CodeBlock>
        <H3>Animación CSS personalizada</H3>
        <CodeBlock lang="js">{`// tailwind.config.js
animation: {
  'pulse-gold': 'pulseGold 2s ease-in-out infinite',
},
keyframes: {
  pulseGold: {
    '0%, 100%': { boxShadow: '0 0 15px rgba(250,204,21,0.3)' },
    '50%':       { boxShadow: '0 0 40px rgba(250,204,21,0.7)' },
  },
},

// Uso: className="animate-pulse-gold"`}</CodeBlock>
      </>
    ),
  },
  {
    id: 'api',
    num: 9,
    title: 'Backend — API Routes',
    icon: ServerCog,
    color: 'bg-yellow-400',
    content: (
      <>
        <P>
          Todas las API routes están en <Code>src/app/api/</Code>. Son funciones serverless.
        </P>
        <H3>Estructura básica</H3>
        <CodeBlock lang="ts">{`// src/app/api/mi-endpoint/route.ts
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
}`}</CodeBlock>
        <Callout type="warning">
          <strong>Importante:</strong> Toda API route debe tener un <Code>try/catch</Code>{' '}
          superior. Throws sin manejar producen HTML 500 que confunde al cliente con
          &quot;Error de red&quot;.
        </Callout>
        <H3>APIs principales</H3>
        <DataTable
          headers={['Ruta', 'Método', 'Descripción']}
          rows={[
            [<Code key="1">/api/productos</Code>, 'GET', 'Lista productos'],
            [<Code key="2">/api/orders</Code>, 'GET/POST', 'Pedidos'],
            [<Code key="3">/api/payments/mercadopago</Code>, 'POST', 'Procesar pago'],
            [<Code key="4">/api/payments/webhook</Code>, 'POST', 'Webhook MP'],
            [<Code key="5">/api/cms</Code>, 'GET', 'Configuración CMS'],
            [<Code key="6">/api/cotizaciones</Code>, 'POST', 'Enviar cotización'],
            [<Code key="7">/api/leads</Code>, 'POST', 'Crear lead'],
            [<Code key="8">/api/admin/login</Code>, 'POST', 'Login admin'],
            [<Code key="9">/api/admin/sql</Code>, 'POST', 'Ejecutar SQL (admin)'],
            [<Code key="10">/api/admin/setup-tables</Code>, 'POST', 'Crear/migrar tablas'],
          ]}
        />
        <H3>API protegida por admin</H3>
        <CodeBlock lang="ts">{`import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';

export async function GET(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data, error } = await insforgeAdmin.database
      .from('mi_nueva_tabla')
      .select('*');
    if (error) throw error;
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Error al leer' }, { status: 500 });
  }
}`}</CodeBlock>
      </>
    ),
  },
  {
    id: 'admin',
    num: 10,
    title: 'Panel de Administración',
    icon: ShieldCheck,
    color: 'bg-yellow-400',
    content: (
      <>
        <P>
          URL: <Code>/admin</Code>. Login: <Code>/admin/login</Code>. Sesión protegida por
          cookie HMAC firmada con <Code>ADMIN_SESSION_SECRET</Code>.
        </P>
        <H3>Secciones</H3>
        <DataTable
          headers={['Ruta', 'Descripción']}
          rows={[
            [<Code key="1">/admin</Code>, 'Dashboard con KPIs'],
            [<Code key="2">/admin/productos</Code>, 'Catálogo de productos'],
            [<Code key="3">/admin/pedidos</Code>, 'Pedidos y cobros'],
            [<Code key="4">/admin/cotizaciones</Code>, 'Cotizaciones recibidas'],
            [<Code key="5">/admin/blog</Code>, 'Blog'],
            [<Code key="6">/admin/proyectos</Code>, 'Portafolio'],
            [<Code key="7">/admin/clientes</Code>, 'Clientes registrados'],
            [<Code key="8">/admin/home</Code>, 'Editar página de inicio'],
            [<Code key="9">/admin/tienda</Code>, 'Configurar tienda'],
            [<Code key="10">/admin/medios</Code>, 'Cloudinary y biblioteca'],
            [<Code key="11">/admin/configuracion</Code>, 'CMS general'],
            [<Code key="12">/admin/equipo</Code>, 'Usuarios admin (superadmin)'],
            [<Code key="13">/admin/setup</Code>, 'Crear/migrar tablas'],
            [<Code key="14">/admin/sql</Code>, 'Terminal SQL'],
            [<Code key="15">/admin/manual</Code>, 'Este manual'],
          ]}
        />
        <H3>Crear nueva página admin</H3>
        <UL>
          <LI>
            Crea <Code>src/app/admin/mi-seccion/page.tsx</Code>.
          </LI>
          <LI>
            Agrega el enlace al sidebar en{' '}
            <Code>src/components/admin/AdminShell.tsx</Code> en <Code>navSections</Code>.
          </LI>
          <LI>
            Agrega <Code>{"PATH_LABELS['/admin/mi-seccion'] = 'Mi Sección'"}</Code> para
            breadcrumbs.
          </LI>
        </UL>
        <H3>Roles</H3>
        <DataTable
          headers={['Rol', 'Acceso']}
          rows={[
            [<Tag key="1">admin</Tag>, 'Completo excepto /admin/equipo'],
            [<Tag key="2">superadmin</Tag>, 'Acceso total'],
          ]}
        />
      </>
    ),
  },
  {
    id: 'seguridad',
    num: 11,
    title: 'Seguridad',
    icon: ShieldCheck,
    color: 'bg-yellow-400',
    content: (
      <>
        <H3>Content Security Policy (CSP)</H3>
        <P>
          <Code>src/middleware.ts</Code> emite una CSP estricta con nonce por petición. Esto
          impide inyección de scripts maliciosos (XSS).
        </P>
        <Callout type="warning">
          Si agregas un <Code>{'<script>'}</Code> inline en un Server Component, debes pasarle
          el <strong>nonce</strong> y la ruta debe ser <Code>force-dynamic</Code>.
        </Callout>
        <CodeBlock lang="tsx">{`import { headers } from 'next/headers';

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
}`}</CodeBlock>
        <H3>Protección del admin</H3>
        <P>
          Todas las rutas <Code>/admin/*</Code> validan la cookie <Code>admin_session</Code>{' '}
          (JWT HMAC-SHA256). Si no es válida → redirect a <Code>/admin/login</Code>.
        </P>
        <CodeBlock lang="ts">{`import { verifyAdminSession } from '@/lib/adminAuth';

const session = await verifyAdminSession(request);
if (!session) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
// session.email, session.rol`}</CodeBlock>
        <H3>Reglas básicas</H3>
        <UL>
          <LI>Nunca pongas claves privadas, tokens o contraseñas en código fuente.</LI>
          <LI>Variables <Code>NEXT_PUBLIC_*</Code> solo para datos públicos.</LI>
          <LI>El formulario de contacto valida con Cloudflare Turnstile (anti-bot).</LI>
          <LI>Toda API route debe tener <Code>try/catch</Code> de nivel superior.</LI>
        </UL>
      </>
    ),
  },
  {
    id: 'cms',
    num: 12,
    title: 'Sistema CMS',
    icon: FileEdit,
    color: 'bg-yellow-400',
    content: (
      <>
        <P>
          CMS clave-valor en la tabla <Code>configuracion</Code>.
        </P>
        <H3>Leer configuración (servidor)</H3>
        <CodeBlock lang="ts">{`import { getCmsSettings } from '@/lib/cms';

const settings = await getCmsSettings();
// settings.nombre_empresa, settings.whatsapp, settings.hero_cover_url, etc.`}</CodeBlock>
        <H3>Claves disponibles</H3>
        <DataTable
          headers={['Clave', 'Descripción']}
          rows={[
            [<Code key="1">nombre_empresa</Code>, 'Nombre del negocio'],
            [<Code key="2">slogan</Code>, 'Slogan'],
            [<Code key="3">whatsapp</Code>, 'Número WhatsApp (solo dígitos)'],
            [<Code key="4">email_contacto</Code>, 'Email de contacto'],
            [<Code key="5">direccion</Code>, 'Dirección física'],
            [<Code key="6">hero_cover_url</Code>, 'Imagen de fondo Hero'],
            [<Code key="7">logo_url</Code>, 'URL del logo'],
            [<Code key="8">social_instagram</Code>, 'URL Instagram'],
            [<Code key="9">social_facebook</Code>, 'URL Facebook'],
            [<Code key="10">social_tiktok</Code>, 'URL TikTok'],
          ]}
        />
        <H3>Agregar nueva clave</H3>
        <CodeBlock lang="ts">{`// 1. En src/lib/cms.ts agrega al interface y a DEFAULT_SETTINGS:
export interface CmsSettings {
  // ... existentes
  mi_nueva_clave: string;
}

const DEFAULT_SETTINGS: CmsSettings = {
  // ... existentes
  mi_nueva_clave: 'valor por defecto',
};

// 2. En /admin/sql ejecuta:
// INSERT INTO configuracion (clave, valor)
// VALUES ('mi_nueva_clave', 'mi valor')
// ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;`}</CodeBlock>
        <H3>Secciones dinámicas (home_sections)</H3>
        <P>
          Edítalas desde <Code>/admin/home</Code>. Tipos (<Code>kind</Code>): <Tag>hero</Tag>{' '}
          <Tag>features</Tag> <Tag>gallery</Tag> <Tag>cta</Tag> <Tag>testimonials</Tag>{' '}
          <Tag>stats</Tag>.
        </P>
      </>
    ),
  },
  {
    id: 'pagos',
    num: 13,
    title: 'Pagos con MercadoPago',
    icon: CreditCard,
    color: 'bg-yellow-400',
    content: (
      <>
        <H3>Flujo</H3>
        <UL>
          <LI>Usuario llena <Code>/checkout</Code>.</LI>
          <LI>Cliente → <Code>POST /api/payments/mercadopago</Code>.</LI>
          <LI>Servidor procesa con SDK de MercadoPago.</LI>
          <LI>Persiste pedido en tabla <Code>orders</Code>.</LI>
        </UL>
        <H3>Respuestas posibles</H3>
        <DataTable
          headers={['Status', 'Significado']}
          rows={[
            ['200 approved', 'Pago aprobado'],
            ['202 pending', 'Pago pendiente'],
            ['422 rejected', 'Pago rechazado'],
            ['503', 'MercadoPago no configurado'],
          ]}
        />
        <H3>Configuración</H3>
        <CodeBlock lang="bash">{`MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxx     # secreto del servidor
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-xxxx     # clave pública del navegador`}</CodeBlock>
        <Callout type="info">
          La función <Code>getMercadoPagoPublicKey()</Code> en{' '}
          <Code>src/lib/mercadopago.ts</Code> acepta múltiples nombres de variables:{' '}
          <Code>NEXT_PUBLIC_MP_PUBLIC_KEY</Code>, <Code>MP_PUBLIC_KEY</Code>,{' '}
          <Code>MERCADO_PAGO_PUBLIC_KEY</Code>, etc.
        </Callout>
        <H3>Verificar estado</H3>
        <CodeBlock lang="ts">{`const res = await fetch('/api/payments/mp-status');
const { configured, publicKey } = await res.json();`}</CodeBlock>
        <H3>Webhook</H3>
        <P>
          URL para configurar en tu cuenta MP:{' '}
          <Code>https://www.solucionesfabrick.com/api/payments/webhook</Code>
        </P>
      </>
    ),
  },
  {
    id: 'carritos',
    num: 14,
    title: 'Carrito de Tienda vs Cotizaciones',
    icon: ShoppingCart,
    color: 'bg-yellow-400',
    content: (
      <>
        <Callout type="warning">
          La app tiene <strong>dos carritos independientes</strong>: agregar a uno no afecta al
          otro.
        </Callout>
        <div className="my-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-yellow-400/20 bg-zinc-900 p-5">
            <h4 className="mb-2 font-bold text-yellow-400">CartContext</h4>
            <p className="mb-3 text-[12px] text-zinc-400">Carrito de tienda</p>
            <UL>
              <LI>Productos físicos</LI>
              <LI>localStorage <Code>fabrick.cart.v2</Code></LI>
              <LI>Duración: 24 h</LI>
              <LI>Tienda → Carrito → Checkout → MP</LI>
            </UL>
          </div>
          <div className="rounded-2xl border border-yellow-400/20 bg-zinc-900 p-5">
            <h4 className="mb-2 font-bold text-yellow-400">QuoteCartContext</h4>
            <p className="mb-3 text-[12px] text-zinc-400">Carrito de cotizaciones</p>
            <UL>
              <LI>Servicios + módulos 3D</LI>
              <LI>localStorage (clave distinta)</LI>
              <LI>Servicios/Diseñador → Cotización → Email</LI>
            </UL>
          </div>
        </div>
        <CodeBlock lang="tsx">{`import { useCartContext } from '@/context/CartContext';
import { useQuoteCartSafe } from '@/context/QuoteCartContext';

const cart = useCartContext();           // tienda
const quote = useQuoteCartSafe();        // cotización (puede ser null)

cart.addToCart(product, 1);
quote?.addItem({ id, label, price });`}</CodeBlock>
      </>
    ),
  },
  {
    id: 'realtime',
    num: 15,
    title: 'Tiempo Real (Realtime)',
    icon: Radio,
    color: 'bg-yellow-400',
    content: (
      <>
        <P>
          InsForge ofrece WebSocket para suscribirse a cambios en tablas. Cuando el admin edita
          un producto, los clientes en la tienda lo ven al instante.
        </P>
        <CodeBlock lang="tsx">{`'use client';
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
        // manejar actualización
      });
    })();

    return () => {
      cleanup = true;
      insforge.realtime.unsubscribe('mi_tabla');
    };
  }, []);

  return <div>{items.length} mensajes en vivo</div>;
}`}</CodeBlock>
        <P>
          <strong>Eventos:</strong> el patrón es{' '}
          <Code>{'{OPERACION}_{nombre_tabla}'}</Code> →{' '}
          <Code>INSERT_products</Code>, <Code>UPDATE_products</Code>,{' '}
          <Code>INSERT_orders</Code>, etc.
        </P>
      </>
    ),
  },
  {
    id: 'blog',
    num: 16,
    title: 'Blog y Casos de Estudio',
    icon: Newspaper,
    color: 'bg-yellow-400',
    content: (
      <>
        <P>
          Los artículos vienen de <strong>dos fuentes</strong> combinadas: archivos Markdown
          (<Code>src/content/blog/*.md</Code>) y la tabla <Code>blog_posts</Code>.
        </P>
        <H3>Crear post desde archivos</H3>
        <CodeBlock lang="markdown">{`---
title: "Título del artículo"
description: "Descripción de 160 caracteres max"
date: "2025-06-15"
cover: "https://url-imagen.com/foto.jpg"
tags: ["metalcon", "construcción"]
draft: false
---

# Contenido del artículo

Texto en **Markdown**.`}</CodeBlock>
        <H3>Casos de estudio (/casos)</H3>
        <P>Markdown en <Code>src/content/casos/*.md</Code> con campos extra:</P>
        <CodeBlock lang="markdown">{`---
title: "Casa Metalcon 2 pisos — Colina"
client: "Familia Rodríguez"
location: "Colina, RM"
services: ["Metalcon", "Gasfitería", "Electricidad"]
duration: "4 meses"
outcome: "142 m² terminados a tiempo"
---`}</CodeBlock>
      </>
    ),
  },
  {
    id: 'disenador-3d',
    num: 17,
    title: 'Diseñador 3D (/juego y /editor)',
    icon: Box,
    color: 'bg-yellow-400',
    content: (
      <>
        <P>
          <Code>src/app/juego/HouseDesigner.tsx</Code> — diseñador con drag &amp; drop de
          módulos. <Code>/editor</Code> monta el mismo componente vía <Code>next/dynamic</Code>.
        </P>
        <H3>Catálogo de módulos (PANEL_TYPES)</H3>
        <CodeBlock lang="tsx">{`// src/app/juego/HouseDesigner.tsx
const PANEL_TYPES = [
  { id: 'wall', label: 'Muro', ... },
  { id: 'window', label: 'Ventana', ... },
  // Para agregar un módulo nuevo:
  {
    id: 'terraza',
    label: 'Terraza',
    color: '#8B7355',
    dimensions: { width: 4, height: 0.2, depth: 3 },
    price: 250000, // CLP
  },
];`}</CodeBlock>
        <H3>Tecnologías</H3>
        <div className="flex flex-wrap gap-2">
          <Tag>react-three-fiber</Tag>
          <Tag>@react-three/drei</Tag>
          <Tag>three.js</Tag>
          <Tag>zustand</Tag>
          <Tag>zundo (undo/redo)</Tag>
        </div>
      </>
    ),
  },
  {
    id: 'push',
    num: 18,
    title: 'Notificaciones Push',
    icon: Bell,
    color: 'bg-yellow-400',
    content: (
      <>
        <H3>Configuración (una vez)</H3>
        <CodeBlock lang="bash">{`npx web-push generate-vapid-keys`}</CodeBlock>
        <P>Agrega a <Code>.env.local</Code>:</P>
        <CodeBlock lang="bash">{`VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:tu@email.com`}</CodeBlock>
        <H3>Suscribir usuario</H3>
        <P>
          El componente <Code>PushOptIn</Code> en{' '}
          <Code>src/components/PushOptIn.tsx</Code> lo hace automáticamente.
        </P>
        <H3>Enviar notificación (admin)</H3>
        <CodeBlock lang="ts">{`const res = await fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Nuevo proyecto publicado',
    body: 'Mira nuestro último trabajo',
    url: '/proyectos/casa-colina',
  }),
});`}</CodeBlock>
        <Callout type="info">
          Las suscripciones se guardan en la tabla <Code>push_subscriptions</Code> (campo{' '}
          <Code>endpoint</Code> único).
        </Callout>
      </>
    ),
  },
  {
    id: 'agregar-funciones',
    num: 19,
    title: 'Cómo Agregar Nuevas Funciones',
    icon: Sparkles,
    color: 'bg-yellow-400',
    content: (
      <>
        <P>
          Ejemplo completo: agregar una sección de <strong className="text-yellow-400">
          Testimonios</strong>.
        </P>
        <H3>Paso 1 — DB</H3>
        <CodeBlock lang="sql">{`-- En /admin/sql
CREATE TABLE IF NOT EXISTS public.testimonios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  cargo text,
  comentario text NOT NULL,
  puntuacion integer DEFAULT 5,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);`}</CodeBlock>
        <H3>Paso 2 — API</H3>
        <CodeBlock lang="ts">{`// src/app/api/testimonios/route.ts
import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

export async function GET() {
  try {
    const { data, error } = await insforge.database
      .from('testimonios')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json({ data: [] });
  }
}`}</CodeBlock>
        <H3>Paso 3 — Hook</H3>
        <CodeBlock lang="ts">{`// src/hooks/useTestimonios.ts
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
}`}</CodeBlock>
        <H3>Paso 4 — Componente público</H3>
        <CodeBlock lang="tsx">{`// src/components/Testimonios.tsx
'use client';
import { useTestimonios } from '@/hooks/useTestimonios';

export default function Testimonios() {
  const { testimonios, loading } = useTestimonios();
  if (loading) return null;
  return (
    <section className="py-20 px-6">
      <h2 className="font-playfair text-4xl text-white text-center mb-12">
        Lo que dicen nuestros <span className="text-yellow-400">clientes</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonios.map((t: any) => (
          <div key={t.id} className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
            <p className="text-zinc-300 text-sm mb-4">"{t.comentario}"</p>
            <p className="text-white font-semibold">{t.nombre}</p>
          </div>
        ))}
      </div>
    </section>
  );
}`}</CodeBlock>
        <H3>Paso 5 — Mostrar y administrar</H3>
        <UL>
          <LI>
            Agrega <Code>{'<Testimonios />'}</Code> en <Code>src/app/page.tsx</Code>.
          </LI>
          <LI>
            Crea <Code>src/app/admin/testimonios/page.tsx</Code> para gestionarlos.
          </LI>
          <LI>
            Agrega el enlace al sidebar admin en <Code>AdminShell.tsx</Code>.
          </LI>
        </UL>
      </>
    ),
  },
  {
    id: 'comandos',
    num: 20,
    title: 'Comandos del Proyecto',
    icon: Terminal,
    color: 'bg-yellow-400',
    content: (
      <>
        <CodeBlock lang="bash">{`# Desarrollo local
npm run dev

# Producción
npm run build
npm run start

# Calidad
npm run lint
npm run typecheck

# Tests
npm test                    # Vitest unitarios
npm run test:coverage       # con cobertura
npm run test:e2e            # Playwright`}</CodeBlock>
        <H3>Despliegue</H3>
        <P>
          <strong className="text-yellow-400">Vercel</strong>: cada push a <Code>main</Code>{' '}
          hace deploy automático. Configura las variables en Settings → Environment Variables.
        </P>
        <H3>Docker (local)</H3>
        <CodeBlock lang="bash">{`docker compose up
docker compose -f compose.debug.yaml up`}</CodeBlock>
        <H3>Resumen — Dónde modificar cada área</H3>
        <DataTable
          headers={['Área', 'Ubicación']}
          rows={[
            ['Logo y nombre', '/admin/configuracion'],
            ['Hero (texto/imagen)', '/admin/configuracion'],
            ['Menú navegación', 'src/components/Navbar.tsx'],
            ['Colores y fuentes', 'tailwind.config.js'],
            ['CSS global', 'src/app/globals.css'],
            ['Productos', '/admin/productos'],
            ['Secciones home', '/admin/home'],
            ['Blog', '/admin/blog o src/content/blog/*.md'],
            ['Portafolio', '/admin/proyectos'],
            ['WhatsApp', '/admin/configuracion → whatsapp'],
            ['Pagos MP', '.env.local → MERCADO_PAGO_*'],
            ['CSP / seguridad', 'src/lib/csp.ts'],
            ['Tablas DB', 'scripts/create-tables.sql + /admin/setup'],
            ['Nueva página pública', 'src/app/[ruta]/page.tsx'],
            ['Nueva página admin', 'src/app/admin/[seccion]/page.tsx'],
            ['Nuevo endpoint API', 'src/app/api/[endpoint]/route.ts'],
          ]}
        />
      </>
    ),
  },
];

/* ──────────────────────────────────────────────────────────
 * Página principal
 * ───────────────────────────────────────────────────────── */

export default function ManualPage() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Barra de progreso de lectura
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const pct = total > 0 ? (h.scrollTop / total) * 100 : 0;
      setScrollProgress(pct);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Barra de progreso fija arriba */}
      <div className="fixed left-0 right-0 top-0 z-40 h-0.5 bg-black/40">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400"
          style={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-black via-zinc-950 to-black p-8 md:p-12 mb-8 shadow-[0_4px_40px_rgba(250,204,21,0.1)]"
      >
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-yellow-400/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-yellow-400/5 blur-[100px]" />

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/5 px-4 py-2"
          >
            <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-yellow-400">
              Manual técnico interno
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-playfair text-3xl font-black leading-tight text-white md:text-5xl"
          >
            Manual completo de <span className="text-yellow-400">Soluciones Fabrick</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-4 max-w-3xl text-[14px] leading-relaxed text-zinc-400 md:text-[15px]"
          >
            Guía técnica y funcional para desarrolladores y administradores. Aprende cómo
            modificar cada página, agregar nuevas funciones, usar los hooks y contexts,
            entender la base de datos, los pagos, la seguridad CSP y el panel admin —
            con ejemplos prácticos.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4"
          >
            {[
              { label: 'Secciones', value: String(SECTIONS.length) },
              { label: 'Stack', value: 'Next 15' },
              { label: 'Backend', value: 'InsForge' },
              { label: 'Estilos', value: 'Tailwind' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur"
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-zinc-500">
                  {s.label}
                </p>
                <p className="font-playfair text-xl font-black text-yellow-400">{s.value}</p>
              </div>
            ))}
          </motion.div>

          {/* CTA Hero */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6 flex flex-wrap gap-3"
          >
            <a
              href="#arquitectura"
              className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-black shadow-[0_4px_20px_rgba(250,204,21,0.4)] transition-all hover:bg-yellow-300 hover:shadow-[0_4px_30px_rgba(250,204,21,0.6)]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Comenzar lectura
            </a>
            <a
              href="/MANUAL.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-yellow-400/40 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-400 transition-all hover:bg-yellow-400/10 hover:border-yellow-400"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar .md
            </a>
          </motion.div>
        </div>
      </motion.section>

      {/* Layout 2 columnas: TOC + contenido */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* TOC lateral (solo desktop) */}
        <aside className="hidden lg:block">
          <TOC sections={SECTIONS} activeId={activeId} />
        </aside>

        {/* TOC móvil colapsable */}
        <details className="lg:hidden rounded-3xl border border-white/10 bg-zinc-950 px-4 py-3">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.28em] text-yellow-400 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Tabla de contenidos ({SECTIONS.length})
          </summary>
          <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-zinc-300 hover:bg-white/5 hover:text-yellow-400"
                >
                  <span className="text-zinc-500">
                    {String(s.num).padStart(2, '0')}.
                  </span>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </details>

        {/* Contenido principal */}
        <main className="space-y-12 min-w-0">
          {SECTIONS.map((section) => (
            <AnimatedSection
              key={section.id}
              section={section}
              onInView={setActiveId}
            />
          ))}

          {/* CTA Final — abrir manual completo */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-gradient-to-br from-yellow-400/10 via-zinc-950 to-yellow-400/5 p-8 md:p-12 shadow-[0_4px_40px_rgba(250,204,21,0.15)]"
          >
            <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-yellow-400/15 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-yellow-400/10 blur-[120px]" />

            <div className="relative text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', duration: 0.6 }}
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-yellow-400 shadow-[0_8px_40px_rgba(250,204,21,0.5)]"
              >
                <BookOpen className="h-7 w-7 text-black" />
              </motion.div>

              <h2 className="font-playfair text-3xl font-black text-white md:text-4xl">
                ¿Listo para profundizar?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-zinc-300">
                Abre el <strong className="text-yellow-400">manual completo</strong> en
                formato Markdown — fácil de leer, descargar, imprimir o compartir con tu
                equipo. Contiene exactamente este contenido en una sola página.
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <motion.a
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  href="/MANUAL.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-yellow-400 px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.25em] text-black shadow-[0_8px_30px_rgba(250,204,21,0.5)] transition-all hover:bg-yellow-300 hover:shadow-[0_8px_40px_rgba(250,204,21,0.75)]"
                >
                  <BookOpen className="h-4 w-4" />
                  Abrir manual completo
                  <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </motion.a>

                <a
                  href="/MANUAL.md"
                  download="MANUAL-Fabrick.md"
                  className="inline-flex items-center gap-2 rounded-full border border-yellow-400/40 px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400 transition-all hover:bg-yellow-400/10 hover:border-yellow-400"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar
                </a>
              </div>

              <p className="mt-8 text-[10px] uppercase tracking-[0.32em] text-zinc-600">
                © {new Date().getFullYear()} Soluciones Fabrick · Manual técnico interno
              </p>
            </div>
          </motion.section>
        </main>
      </div>

      {/* Botón flotante "volver arriba" */}
      <AnimatePresence>
        {scrollProgress > 10 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-black shadow-[0_8px_30px_rgba(250,204,21,0.5)] transition-all hover:scale-110 hover:bg-yellow-300"
            aria-label="Volver arriba"
          >
            <ChevronRight className="h-5 w-5 -rotate-90" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
