'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Droplets,
  Hammer,
  Home,
  Layers3,
  MessageCircle,
  Paintbrush,
  PanelsTopLeft,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import FabrickLogo from '@/components/FabrickLogo';
import { HOME_PREMIUM_VISUALS } from '@/lib/homePremiumVisuals';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type ServiceChapter = {
  id: string;
  budgetId: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  promise: string;
  description: string;
  functions: string[];
  outcomes: string[];
  visual: string;
  icon: LucideIcon;
};

const SERVICES: ServiceChapter[] = [
  {
    id: 'albanileria',
    budgetId: 'albanileria',
    title: 'Albañilería y obra gruesa',
    shortTitle: 'Albañilería',
    eyebrow: 'Muros · pisos · reparaciones',
    promise: 'Construimos y recuperamos las superficies que sostienen el proyecto.',
    description: 'La albañilería reúne trabajos húmedos y de obra base para levantar, corregir o preparar un espacio. El alcance se define según soporte, materialidad, humedad, cargas y terminación requerida.',
    functions: ['Construcción y reparación de muros y cierres.', 'Sobrecimientos, radieres, afinados y preparación de superficies.', 'Cerámicas, porcelanatos y revestimientos adheridos.', 'Corrección de fisuras, desprendimientos y encuentros visibles.'],
    outcomes: ['Base preparada', 'Muros aplomados', 'Superficies niveladas', 'Terminación coordinada'],
    visual: HOME_PREMIUM_VISUALS.foundation,
    icon: Hammer,
  },
  {
    id: 'carpinteria',
    budgetId: 'carpinteria',
    title: 'Carpintería y mobiliario',
    shortTitle: 'Carpintería',
    eyebrow: 'Madera · puertas · muebles',
    promise: 'Convertimos medidas reales en soluciones que aprovechan mejor el espacio.',
    description: 'La carpintería combina fabricación, ajuste e instalación para resolver puertas, divisiones, clósets y mobiliario a medida considerando uso, herrajes, humedad, peso y mantenimiento.',
    functions: ['Puertas, marcos, ventanas y ajustes de elementos existentes.', 'Clósets, repisas, escritorios y almacenamiento a medida.', 'Divisiones y remates interiores.', 'Muebles de baño y cocina coordinados con instalaciones.'],
    outcomes: ['Medición en terreno', 'Diseño funcional', 'Herrajes definidos', 'Montaje y ajustes'],
    visual: HOME_PREMIUM_VISUALS.bedroom,
    icon: PanelsTopLeft,
  },
  {
    id: 'gasfiteria',
    budgetId: 'gasfiteria',
    title: 'Gasfitería y redes sanitarias',
    shortTitle: 'Gasfitería',
    eyebrow: 'Agua · desagüe · artefactos',
    promise: 'Ordenamos el recorrido del agua para evitar pérdidas y daños posteriores.',
    description: 'La gasfitería interviene redes de agua potable, desagües y conexiones sanitarias. Antes de ejecutar se revisan presión, diámetros, pendientes, puntos existentes y compatibilidad con los artefactos.',
    functions: ['Redes de agua fría y caliente.', 'Detección y reparación de filtraciones.', 'Distribución sanitaria, desagües y pendientes.', 'Instalación de lavaplatos, sanitarios, duchas y griferías.'],
    outcomes: ['Red trazada', 'Conexiones probadas', 'Pendientes verificadas', 'Artefactos instalados'],
    visual: HOME_PREMIUM_VISUALS.bathroom,
    icon: Droplets,
  },
  {
    id: 'electricidad',
    budgetId: 'electricidad',
    title: 'Electricidad e iluminación',
    shortTitle: 'Electricidad',
    eyebrow: 'Circuitos · puntos · tableros',
    promise: 'Diseñamos recorridos claros para que cada punto tenga una función conocida.',
    description: 'Los trabajos eléctricos se organizan por circuitos, consumos, protecciones y recorridos. La propuesta distingue instalaciones nuevas, reparaciones, ampliaciones y equipos con alimentación dedicada.',
    functions: ['Instalación o traslado de enchufes, interruptores y luces.', 'Canalización, cableado y distribución de circuitos.', 'Revisión de fallas visibles y puntos sin funcionamiento.', 'Preparación para climatización, cocina, bombas y equipos.'],
    outcomes: ['Circuitos identificados', 'Puntos operativos', 'Protecciones revisadas', 'Carga coordinada'],
    visual: HOME_PREMIUM_VISUALS.kitchen,
    icon: Zap,
  },
  {
    id: 'fundaciones',
    budgetId: 'cimientos',
    title: 'Fundaciones y obra base',
    shortTitle: 'Fundaciones',
    eyebrow: 'Terreno · apoyos · hormigón',
    promise: 'Preparamos la base para que la construcción transmita sus cargas de forma ordenada.',
    description: 'Las fundaciones conectan la estructura con el terreno. La solución depende del proyecto, suelo, desniveles, humedad, cargas y sistema constructivo y se confirma tras revisar las condiciones reales.',
    functions: ['Trazado, excavación y preparación del terreno.', 'Zapatas, vigas, sobrecimientos y apoyos.', 'Radieres, bases, estabilizado, refuerzos y juntas.', 'Coordinación de pasadas, drenajes y niveles.'],
    outcomes: ['Niveles definidos', 'Apoyos dimensionados', 'Base compactada', 'Hormigón coordinado'],
    visual: HOME_PREMIUM_VISUALS.foundation,
    icon: Layers3,
  },
  {
    id: 'estructuras',
    budgetId: 'metalcon',
    title: 'Estructuras Metalcon y ampliaciones',
    shortTitle: 'Metalcon',
    eyebrow: 'Perfiles · refuerzos · aislación',
    promise: 'Damos forma al proyecto con una estructura liviana preparada para recibir sus capas.',
    description: 'La construcción en perfiles galvanizados organiza muros, techumbres y ampliaciones por capas. La propuesta contempla modulación, arriostramiento, vanos, aislación, barreras y terminaciones desde el inicio.',
    functions: ['Muros interiores y perimetrales en perfiles galvanizados.', 'Ampliaciones y recintos anexos.', 'Cerchas, envigados, refuerzos y vanos.', 'Coordinación de aislación, placas, revestimientos y redes.'],
    outcomes: ['Modulación definida', 'Refuerzos ubicados', 'Capas coordinadas', 'Vanos preparados'],
    visual: HOME_PREMIUM_VISUALS.metalcon,
    icon: Building2,
  },
  {
    id: 'techumbre',
    budgetId: 'techumbre',
    title: 'Techumbre, filtraciones y protección',
    shortTitle: 'Techumbre',
    eyebrow: 'Cubierta · canaletas · sellos',
    promise: 'Protegemos el interior atacando el recorrido del agua, no solo la mancha visible.',
    description: 'Una filtración puede originarse lejos del punto donde aparece. La revisión considera cubierta, fijaciones, pendientes, encuentros, cumbreras, canaletas, sellos y condiciones de acceso.',
    functions: ['Diagnóstico de filtraciones y puntos críticos.', 'Cambio parcial o renovación de cubiertas.', 'Canaletas, bajadas, cumbreras y remates.', 'Sellos, fijaciones, membranas y aislación.'],
    outcomes: ['Origen identificado', 'Cubierta asegurada', 'Evacuación ordenada', 'Remates protegidos'],
    visual: HOME_PREMIUM_VISUALS.architecture,
    icon: Home,
  },
  {
    id: 'terminaciones',
    budgetId: 'terminaciones',
    title: 'Terminaciones y renovación interior',
    shortTitle: 'Terminaciones',
    eyebrow: 'Pintura · pisos · revestimientos',
    promise: 'Unificamos superficies y detalles para que el proyecto se vea realmente terminado.',
    description: 'Las terminaciones reúnen las capas visibles y los remates que definen la percepción final. Antes de instalar o pintar se revisan humedad, planeidad, adherencia, encuentros y compatibilidad entre materiales.',
    functions: ['Empaste, reparación y pintura interior o exterior.', 'Pisos vinílicos, flotantes, cerámicos y porcelanatos.', 'Revestimientos, siding, molduras y guardapolvos.', 'Cielos, placas, sellos y correcciones finales.'],
    outcomes: ['Superficie preparada', 'Material compatible', 'Encuentros resueltos', 'Entrega limpia'],
    visual: HOME_PREMIUM_VISUALS.living,
    icon: Paintbrush,
  },
];

export function ServiciosPageContent() {
  return (
    <main className="min-h-screen bg-[#F6F1E8] text-[#111214]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#0E0E10] px-4 pb-14 pt-28 text-[#F6F1E8] sm:px-6 sm:pb-20 sm:pt-32 lg:px-8">
        <div className="mx-auto grid max-w-[1320px] gap-9 lg:min-h-[620px] lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:gap-14">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#D77A2D]">Servicios Soluciones Fabrick</p>
            <h1 className="mt-5 max-w-[11ch] text-[clamp(3rem,8vw,6.6rem)] font-black leading-[.9] tracking-[-.065em]">
              Una solución clara para cada etapa de tu proyecto.
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/58 sm:text-lg sm:leading-8">
              Construcción, ampliaciones, instalaciones y terminaciones organizadas por necesidad. Revisa qué resuelve cada especialidad y pasa directo a una cotización referencial.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/presupuesto" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#D77A2D] px-6 text-xs font-black text-[#111214] transition hover:brightness-110 sm:text-sm">
                Cotizar proyecto <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#especialidades" className="inline-flex min-h-12 items-center rounded-full border border-white/14 px-6 text-xs font-black text-white transition hover:bg-white/[.06] sm:text-sm">
                Explorar servicios
              </a>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-x-5 gap-y-4 border-t border-white/10 pt-5 sm:grid-cols-4">
              {['Obra base', 'Estructuras', 'Instalaciones', 'Terminaciones'].map((item) => (
                <span key={item} className="text-[9px] font-black uppercase tracking-[.12em] text-white/38">{item}</span>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/[.08] bg-white/[.03] shadow-[0_30px_90px_rgba(0,0,0,.34)]">
            <div className="relative aspect-[4/5] min-h-[430px] lg:min-h-[570px]">
              <img src={HOME_PREMIUM_VISUALS.architecture} alt="Arquitectura y construcción residencial Soluciones Fabrick" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/12 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#E6B56F]">Del terreno a la terminación</p>
                <p className="mt-3 max-w-[17ch] text-2xl font-black leading-tight tracking-[-.04em] sm:text-4xl">Un solo criterio visual y constructivo.</p>
                <p className="mt-3 max-w-lg text-xs leading-6 text-white/55 sm:text-sm">La especialidad cambia; la forma de ordenar el proyecto, medir y ejecutar se mantiene.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav id="especialidades" className="sticky top-[64px] z-30 border-b border-black/[.08] bg-[#F6F1E8]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1320px] gap-5 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {SERVICES.map((service, index) => (
            <a key={service.id} href={`#servicio-${service.id}`} className="shrink-0 py-2 text-[9px] font-black uppercase tracking-[.14em] text-black/42 transition hover:text-black">
              {String(index + 1).padStart(2, '0')} · {service.shortTitle}
            </a>
          ))}
        </div>
      </nav>

      <section className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid gap-10 border-b border-black/10 pb-12 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#9A5B22]">Especialidades</p>
            <h2 className="mt-3 max-w-[12ch] text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl">Elige por lo que necesitas resolver.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-black/50 sm:text-base">
            En lugar de mostrar una lista de oficios aislados, cada bloque explica alcance, puntos de revisión y resultado esperado. Así puedes comparar mejor antes de solicitar una visita o armar tu presupuesto.
          </p>
        </div>

        <div className="divide-y divide-black/10">
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            const whatsapp = buildWhatsAppLink(`Hola Soluciones Fabrick, quiero evaluar un trabajo de ${service.title}. Necesito orientación sobre alcance, medidas y próximos pasos.`);
            return (
              <article id={`servicio-${service.id}`} key={service.id} className="scroll-mt-36 py-10 sm:py-14 lg:py-16">
                <div className="grid gap-7 lg:grid-cols-[.82fr_1.18fr] lg:items-stretch lg:gap-10">
                  <div className={`relative overflow-hidden rounded-[1.7rem] bg-[#171719] ${index % 2 ? 'lg:order-2' : ''}`}>
                    <div className="relative aspect-[4/3] min-h-[300px] lg:h-full lg:min-h-[430px]">
                      <img src={service.visual} alt={`${service.title} · Soluciones Fabrick`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-[1.025]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/10 to-transparent" />
                      <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/34 text-[#E6B56F] backdrop-blur-md sm:left-5 sm:top-5">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                        <span className="text-[9px] font-black uppercase tracking-[.16em] text-white/45">{String(index + 1).padStart(2, '0')} · {service.eyebrow}</span>
                        <p className="mt-3 max-w-[18ch] text-2xl font-black leading-tight tracking-[-.04em] text-white sm:text-3xl">{service.promise}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`flex flex-col justify-center ${index % 2 ? 'lg:order-1' : ''}`}>
                    <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#9A5B22]">{service.shortTitle}</p>
                    <h3 className="mt-3 max-w-[15ch] text-3xl font-black leading-[.98] tracking-[-.05em] sm:text-5xl">{service.title}</h3>
                    <p className="mt-5 max-w-2xl text-sm leading-7 text-black/52 sm:text-base">{service.description}</p>

                    <div className="mt-7 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                      {service.functions.map((item) => (
                        <div key={item} className="flex gap-3 border-t border-black/10 pt-3 text-xs leading-6 text-black/58 sm:text-sm">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#9A5B22]" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-7 flex flex-wrap gap-2">
                      {service.outcomes.map((item) => (
                        <span key={item} className="rounded-full border border-black/10 px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-black/45">{item}</span>
                      ))}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-2.5">
                      <Link href={`/presupuesto?servicio=${service.budgetId}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#111214] px-5 text-xs font-black text-[#F6F1E8] transition hover:bg-[#2A2B2E]">
                        Cotizar este trabajo <ArrowRight className="h-4 w-4" />
                      </Link>
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/12 px-5 text-xs font-black transition hover:bg-black/[.04]">
                        <MessageCircle className="h-4 w-4" /> Consultar
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#D9CCBF] px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
        <div className="mx-auto grid max-w-[1320px] gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#7C4A1F]">Varias áreas, un mismo proyecto</p>
            <h2 className="mt-3 max-w-[13ch] text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl">Arma las partidas que necesitas y ordénalas en una sola cotización.</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-black/52 sm:text-base">El presupuesto permite combinar estructura, instalaciones, terminaciones y productos sin perder el detalle de cada partida.</p>
          </div>
          <Link href="/presupuesto" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111214] px-6 text-xs font-black text-[#F6F1E8] sm:text-sm">
            Abrir presupuesto <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-[#0E0E10] px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <FabrickLogo className="pointer-events-none" />
          <p className="max-w-lg text-xs leading-6 text-white/35">Cada alcance y valor debe confirmarse según medidas, condiciones reales del lugar y requerimientos del proyecto.</p>
        </div>
      </footer>
    </main>
  );
}
