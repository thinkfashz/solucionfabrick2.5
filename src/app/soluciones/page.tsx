import type { Metadata } from 'next';
import SectionPageShell from '@/components/SectionPageShell';
import Link from 'next/link';
import { ArrowRight, Layers, Home, Package, Sparkles, Truck, Hammer } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Soluciones | Fabrick',
  description:
    'Paquetes llave en mano: piso industrializado, paneles Metalcon 60/90, estructura, revestimientos y suministro de materiales.',
};

interface SolutionItem {
  name: string;
  spec: string;
  description: string;
  price?: string;
}

interface SolutionGroup {
  id: string;
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  intro: string;
  items: SolutionItem[];
  ctaLabel: string;
  ctaHref: string;
}

const GROUPS: SolutionGroup[] = [
  {
    id: 'piso',
    icon: Layers,
    eyebrow: 'Piso industrializado',
    title: 'Piso técnico con espesor según uso',
    intro:
      'Sistema de piso elevado o sobre radier, seleccionable por espesor según la carga, el tránsito y el tipo de recubrimiento final.',
    items: [
      { name: 'Piso 12 mm', spec: 'Uso doméstico · Dormitorios y pasillos', description: 'Placa OSB 12 mm sobre entramado Metalcon 60. Ideal para carga liviana y segundos pisos.' },
      { name: 'Piso 15 mm', spec: 'Uso residencial intensivo', description: 'Placa OSB 15 mm, mayor rigidez y menor vibración. Recomendado para living, cocina y zonas húmedas con membrana.' },
      { name: 'Piso 18 mm', spec: 'Comercial y alta carga', description: 'Placa OSB 18 mm o contrachapado estructural. Soporta tránsito comercial y permite revestimientos pesados (porcelanato gran formato).' },
      { name: 'Piso 22 mm', spec: 'Industrial / entrepiso', description: 'Placa OSB 22 mm machihembrada. Usado en entrepisos Metalcon y zonas técnicas.' },
    ],
    ctaLabel: 'Cotizar piso',
    ctaHref: '/contacto?asunto=piso',
  },
  {
    id: 'metalcon',
    icon: Home,
    eyebrow: 'Estructura Metalcon',
    title: 'Paneles Metalcon 60 y 90',
    intro:
      'Paneles prearmados en maestranza, listos para montaje en obra. Acero galvanizado G90, perfiles certificados y paso estándar de 40 cm.',
    items: [
      { name: 'Metalcon 60 mm', spec: 'Tabiques interiores · Ampliaciones livianas', description: 'Perfil C 60 x 38 x 0,85 mm. Divisiones internas, cielos técnicos y ampliaciones sobre losa existente.' },
      { name: 'Metalcon 90 mm', spec: 'Muros estructurales · Vivienda nueva', description: 'Perfil C 90 x 38 x 0,85 mm. Muros portantes para vivienda de 1-2 pisos con envolvente térmica zona 3.' },
      { name: 'Metalcon 100 reforzado', spec: 'Vivienda de 3 pisos · Comercial', description: 'Perfil C 100 x 50 x 1,0 mm. Usado en proyectos con mayor carga o grandes luces.' },
      { name: 'Kits panelizados', spec: 'Obra rápida · 95 días llave en mano', description: 'Paneles cortados, numerados y rotulados. Reducen tiempo de obra hasta en 40%.' },
    ],
    ctaLabel: 'Cotizar estructura',
    ctaHref: '/contacto?asunto=metalcon',
  },
  {
    id: 'revestimiento',
    icon: Sparkles,
    eyebrow: 'Revestimientos premium',
    title: 'Wall Panels, PVC Mármol y acústicos',
    intro:
      'Terminaciones que transforman el espacio sin rehacer muros: paneles decorativos listos para instalar con adhesivo o clips.',
    items: [
      { name: 'Wall Panel PVC Mármol 8 mm', spec: 'Baño · Cocina · Salas de estar', description: 'Panel rígido, resistente a humedad y fácil de limpiar. Imitación mármol con varios formatos.' },
      { name: 'Panel acústico roble', spec: 'Dormitorios · Estudios · Salas de reunión', description: 'Madera natural con fieltro acústico, reduce reverberación y aporta calidez visual.' },
      { name: 'Placa fibrocemento siding', spec: 'Fachadas · Zonas expuestas', description: 'Siding 8 mm tratado para intemperie, ideal en zonas con exposición a lluvia o salitre.' },
      { name: 'Volcanita RH 12,5 mm', spec: 'Baños · Lavanderías', description: 'Placa resistente a humedad para revestir tabiques en zonas con vapor.' },
    ],
    ctaLabel: 'Ver en tienda',
    ctaHref: '/tienda',
  },
  {
    id: 'estructura',
    icon: Hammer,
    eyebrow: 'Obra gruesa',
    title: 'Fundaciones y reforzamiento',
    intro:
      'Desde la nivelación del terreno hasta el refuerzo de losas existentes. Cálculo estructural, certificación y ejecución en terreno.',
    items: [
      { name: 'Radier armado', spec: 'Espesor 10 a 15 cm', description: 'Radier H25 con malla electrosoldada, terminación afinada o pulida.' },
      { name: 'Fundaciones corridas', spec: 'Vivienda 1-2 pisos', description: 'Excavación, enfierradura y hormigonado con estudio de mecánica de suelos.' },
      { name: 'Refuerzo estructural', spec: 'Ampliaciones sobre losa', description: 'Refuerzo con perfiles metálicos anclados a losa existente, certificado por ingeniero.' },
      { name: 'Anclajes químicos', spec: 'Fijaciones a hormigón existente', description: 'Anclajes Hilti HIT-RE 500 para cargas elevadas en estructuras existentes.' },
    ],
    ctaLabel: 'Agendar visita técnica',
    ctaHref: '/contacto?asunto=estructura',
  },
  {
    id: 'suministro',
    icon: Truck,
    eyebrow: 'Suministro',
    title: 'Despacho de materiales',
    intro:
      'Compra con precio de mayorista y despacho directo a obra. Catálogo completo sincronizado con la tienda Fabrick.',
    items: [
      { name: 'Materiales gruesos', spec: 'Cemento, fierro, áridos', description: 'Despacho en camión, mínimo 1 saco / 1 barra 12 mm.' },
      { name: 'Perfiles Metalcon', spec: '60, 90, 100 mm · C y U', description: 'Tiras de 6 m, perfiles galvanizados G90 certificados.' },
      { name: 'Placas y revestimientos', spec: 'OSB, volcanita, fibrocemento, PVC', description: 'Corte opcional a medida según plano de obra.' },
      { name: 'Gasfitería y eléctrico', spec: 'PPR, cable LH, automáticos', description: 'Certificación SEC incluida en obras ejecutadas por Fabrick.' },
    ],
    ctaLabel: 'Abrir tienda',
    ctaHref: '/tienda',
  },
];

export default function SolucionesPage() {
  return (
    <SectionPageShell
      eyebrow="Catálogo de soluciones"
      title="Cinco bloques para armar tu obra completa"
      description="Cada bloque se puede comprar por separado o combinar en un paquete llave en mano. Un solo equipo ejecuta todo."
      primaryAction={{ href: '/tienda', label: 'Ver productos en tienda' }}
      secondaryAction={{ href: '/contacto', label: 'Hablar con un asesor' }}
    >
      {/* Quick jump nav */}
      <nav className="mb-10 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400"
          >
            <g.icon size={12} /> {g.eyebrow}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {GROUPS.map((group) => (
          <section
            key={group.id}
            id={group.id}
            className="overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8 md:p-10 scroll-mt-28"
          >
            <header className="flex flex-col gap-5 border-b border-white/5 pb-6 md:flex-row md:items-end md:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-400">
                  <group.icon size={20} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">{group.eyebrow}</p>
                  <h2 className="mt-1 text-2xl font-black uppercase leading-tight tracking-tight text-white md:text-3xl">
                    {group.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{group.intro}</p>
                </div>
              </div>
              <Link
                href={group.ctaHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-black hover:bg-yellow-300"
              >
                {group.ctaLabel} <ArrowRight size={12} />
              </Link>
            </header>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {group.items.map((item) => (
                <div
                  key={item.name}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition hover:border-yellow-400/25 hover:bg-yellow-400/[0.02]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{item.name}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-400/70">
                        {item.spec}
                      </p>
                    </div>
                    <Package size={14} className="flex-shrink-0 text-zinc-600 group-hover:text-yellow-400" />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-zinc-400">{item.description}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Final CTA */}
      <div className="mt-12 rounded-[2rem] border border-yellow-400/20 bg-[linear-gradient(135deg,rgba(250,204,21,0.08),rgba(250,204,21,0.02))] p-10 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Paquete integral</p>
        <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
          ¿Necesitas varios bloques a la vez?
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Coordinamos todo en un solo cronograma: diseño, materiales, estructura, instalaciones y terminaciones. Un solo equipo, un solo estándar.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/contacto?asunto=integral"
            className="rounded-full bg-yellow-400 px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-black hover:bg-yellow-300"
          >
            Solicitar presupuesto integral
          </Link>
          <Link
            href="/proyectos"
            className="rounded-full border border-white/10 px-8 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400"
          >
            Ver proyectos ejecutados
          </Link>
        </div>
      </div>
    </SectionPageShell>
  );
}

