import type { Metadata } from 'next';
import {
  AirVent,
  ArrowDown,
  Bath,
  Blocks,
  Building2,
  Flame,
  Fence,
  Hammer,
  Home,
  Layers3,
  Lightbulb,
  PaintRoller,
  PanelsTopLeft,
  Ruler,
  Sofa,
  Sparkles,
  ThermometerSun,
  Wrench,
} from 'lucide-react';
import { getActiveMaterials } from '@/lib/budget';
import PresupuestoClient from './PresupuestoClient';
import Navbar from '@/components/Navbar';
import ConstructionM2Calculator from '@/components/landing/ConstructionM2Calculator';

/**
 * /presupuesto — Cotizador público (servidor + cliente).
 *
 * El servidor entrega los materiales activos del catálogo y el cliente
 * (`PresupuestoClient`) los inyecta en `ProjectBuilder`. Una conexión SSE a
 * `/api/cms/events` mantiene el catálogo en vivo: si el admin cambia un
 * precio en /admin/materiales, se refleja al instante en esta pantalla.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Presupuesto de construcción y reparaciones en Linares | Soluciones Fabrick',
  description:
    'Cotiza construcción, reparaciones, Metalcon, techos, gasfitería, electricidad, climatización, revestimientos, pisos y remodelaciones en Linares y Región del Maule.',
  keywords: [
    'presupuesto construcción Linares',
    'reparaciones Linares',
    'Metalcon Linares',
    'gasfitería Linares',
    'electricidad domiciliaria Linares',
    'instalación aire acondicionado Maule',
    'remodelaciones Linares',
    'pisos laminados Linares',
    'cierre perimetral Maule',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/presupuesto' },
};

const SERVICES = [
  {
    icon: PaintRoller,
    title: 'Pintura y terminaciones',
    text: 'Pintura interior y exterior, preparación de muros, sellos, reparación de superficies y terminaciones limpias.',
  },
  {
    icon: PanelsTopLeft,
    title: 'Paneles en Metalcon o madera',
    text: 'Fabricación e instalación de paneles, divisiones, ampliaciones y soluciones estructurales adaptadas al espacio.',
  },
  {
    icon: Home,
    title: 'Kit básico, avanzado y llave en mano',
    text: 'Alternativas por etapas para comenzar con estructura, avanzar con instalaciones o recibir un proyecto completo.',
  },
  {
    icon: Building2,
    title: 'Techos y cubiertas',
    text: 'Estructuras, cambio de zinc, reparaciones de filtraciones, aislación, canaletas y mejoras de cubierta.',
  },
  {
    icon: AirVent,
    title: 'Aire acondicionado',
    text: 'Venta, instalación, conexión, mantención y orientación para escoger la capacidad adecuada del equipo.',
  },
  {
    icon: Bath,
    title: 'Gasfitería y fontanería',
    text: 'Reparación de fugas, redes de agua, grifería, artefactos, desagües y puntos de agua fría o caliente.',
  },
  {
    icon: Lightbulb,
    title: 'Electricidad domiciliaria',
    text: 'Puntos eléctricos, iluminación, tableros, enchufes, canalizaciones y corrección de fallas domésticas.',
  },
  {
    icon: Fence,
    title: 'Cierres perimetrales',
    text: 'Estructuras, portones, cierres metálicos o de madera y soluciones de seguridad para viviendas y terrenos.',
  },
  {
    icon: Layers3,
    title: 'Pisos laminados, cerámicos y flotantes',
    text: 'Preparación de superficie, instalación, guardapolvos, nivelación y terminaciones para cada tipo de piso.',
  },
  {
    icon: Blocks,
    title: 'Revestimientos modernos',
    text: 'Instalación de siding, wall panel, madera decorativa y revestimientos interiores o exteriores de alta presencia.',
  },
  {
    icon: Wrench,
    title: 'Bajadas de agua y evacuación',
    text: 'Instalación y reparación de bajadas de agua lluvia, canaletas, descargas y conducción segura hacia el exterior.',
  },
  {
    icon: Flame,
    title: 'Instalación de estufas',
    text: 'Montaje de estufas a pellet o tradicionales, revisión del lugar, salida de gases y terminaciones de instalación.',
  },
  {
    icon: Hammer,
    title: 'Remodelaciones',
    text: 'Baños, cocinas, dormitorios, ampliaciones, reparación de espacios y renovación integral por etapas.',
  },
  {
    icon: Sofa,
    title: 'Mueblería a medida',
    text: 'Muebles para cocina, baño, clóset, almacenamiento y soluciones fabricadas según medidas y necesidades.',
  },
  {
    icon: Ruler,
    title: 'Visita, medición y diagnóstico',
    text: 'Revisión en terreno para definir alcance, materiales, condiciones de acceso y una propuesta más precisa.',
  },
];

const STEPS = [
  ['01', 'Selecciona una solución', 'Escoge el servicio o tipo de proyecto que más se acerca a lo que necesitas.'],
  ['02', 'Calcula una referencia', 'Usa la calculadora por m² o agrega partidas específicas al presupuesto.'],
  ['03', 'Cuéntanos los detalles', 'Indica ubicación, medidas, fotografías y condiciones actuales del espacio.'],
  ['04', 'Recibe una evaluación', 'Revisamos el caso y afinamos el valor según terreno, materiales y terminaciones.'],
] as const;

export default async function PresupuestoPage() {
  const materials = await getActiveMaterials();
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#080705] text-white">
      <Navbar />

      <section className="relative overflow-hidden border-b border-white/10 px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-24 lg:pt-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,.18),transparent_30rem),radial-gradient(circle_at_88%_18%,rgba(249,115,22,.14),transparent_28rem),linear-gradient(180deg,#0b0906,#080705)]" />
        <div className="relative mx-auto grid max-w-[1380px] gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.34em] text-yellow-300">Presupuesto Soluciones Fabrick</p>
            <h1 className="mt-5 max-w-5xl text-4xl font-black leading-[.95] tracking-[-.06em] sm:text-6xl lg:text-7xl">
              Los <span className="text-yellow-300">360° de soluciones</span> que necesita tu hogar, en un solo sitio.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 sm:text-lg">
              Desde una reparación puntual hasta una remodelación completa: construcción, instalaciones, terminaciones, climatización y mueblería coordinadas por un solo equipo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#servicios-presupuesto" className="inline-flex h-13 items-center gap-2 rounded-full bg-yellow-300 px-6 py-3.5 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-yellow-200">
                Ver todos los servicios <ArrowDown className="h-4 w-4" />
              </a>
              <a href="#calculadora-m2" className="inline-flex h-13 items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-sm font-black text-white transition hover:border-yellow-300/50 hover:text-yellow-300">
                Calcular mi proyecto <Sparkles className="h-4 w-4" />
              </a>
            </div>
          </div>

          <aside className="border-y border-white/10 py-6 lg:border-y-0 lg:border-l lg:pl-8">
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-zinc-500">Una sola evaluación</p>
            <p className="mt-3 text-2xl font-black leading-tight text-white">Menos proveedores. Más control sobre tu proyecto.</p>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Puedes combinar estructura, instalaciones, revestimientos, pisos, climatización y mobiliario dentro de una misma solicitud.
            </p>
          </aside>
        </div>
      </section>

      <section id="servicios-presupuesto" className="border-b border-white/10 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-[1380px]">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[.32em] text-yellow-300">Servicios disponibles</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-.045em] sm:text-5xl">Todo lo que tu hogar puede necesitar</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">
              Selecciona una solución, combínala con otras partidas y solicita una evaluación clara según tus medidas, ubicación y nivel de terminación.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="group min-h-[210px] bg-[#0c0a08] p-6 transition hover:bg-[#12100c] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-black shadow-[0_12px_30px_rgba(250,204,21,.12)] transition group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[.2em] text-zinc-600">Fabrick 360</span>
                </div>
                <h3 className="mt-6 text-xl font-black tracking-[-.025em] text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0b0907] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {STEPS.map(([step, title, text]) => (
              <div key={step} className="p-6 lg:p-7">
                <span className="text-4xl font-black text-yellow-300/30">{step}</span>
                <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ConstructionM2Calculator />

      <section className="border-t border-white/10 px-4 pb-4 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1380px]">
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Presupuesto detallado</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[-.045em] sm:text-5xl">Agrega materiales, instalaciones y servicios específicos.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
            Usa esta segunda herramienta cuando necesites armar una solicitud más técnica, combinar partidas o guardar una cotización detallada.
          </p>
        </div>
      </section>

      <PresupuestoClient initialMaterials={materials} />
    </main>
  );
}
