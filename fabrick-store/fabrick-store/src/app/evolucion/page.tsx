import type { Metadata } from 'next';
import {
  Hammer,
  TrendingUp,
  Users,
  Building2,
  Award,
  Star,
  Briefcase,
  Globe,
} from 'lucide-react';
import SectionPageShell from '@/components/SectionPageShell';

const TIMELINE = [
  {
    year: '2016',
    phase: 'Fase 01',
    title: 'Ayudante General',
    icon: Hammer,
    achievement: 'Inicio en terreno',
    description:
      'Aprendizaje duro y disciplina en terreno. Cargando materiales, preparando mezclas y observando cómo se construyen las bases de todo proyecto. Aquí nació el respeto por el oficio.',
  },
  {
    year: '2017',
    phase: 'Fase 02',
    title: 'Maestro de Segunda',
    icon: TrendingUp,
    achievement: 'Dominio de herramientas',
    description:
      'Control progresivo de herramientas y técnicas de ejecución. Instalaciones sanitarias, albañilería fina y trabajo de terminaciones bajo la supervisión de maestros de primera clase.',
  },
  {
    year: '2018',
    phase: 'Fase 03',
    title: 'Maestro de Primera',
    icon: Award,
    achievement: 'Precisión técnica certificada',
    description:
      'Alcanzada la precisión técnica en estructuras y acabados. Coordinación autónoma de partidas completas. Primer proyecto ejecutado de forma independiente: remodelación residencial en Ñuñoa.',
  },
  {
    year: '2019',
    phase: 'Fase 04',
    title: 'Líder de Proyectos',
    icon: Users,
    achievement: 'Primer equipo propio',
    description:
      'Coordinación de equipos multidisciplinarios y seguimiento de calidad. Gestión de 3 a 5 proyectos simultáneos, con foco en cronograma y satisfacción del cliente. Primer equipo propio de 4 personas.',
  },
  {
    year: '2020',
    phase: 'Fase 05',
    title: 'Contratista independiente',
    icon: Briefcase,
    achievement: '50 proyectos completados',
    description:
      'Dirección completa de obras residenciales. Año de consolidación a pesar del contexto pandémico. 50 proyectos completados, todos con evaluación positiva. Primeras referencias corporativas.',
  },
  {
    year: '2021',
    phase: 'Fase 06',
    title: 'Formalización empresarial',
    icon: Building2,
    achievement: 'Constitución de la empresa',
    description:
      'Constitución formal de Soluciones Fabrick como empresa. Contratos escritos, garantías documentadas y equipo de 8 profesionales certificados. Primera facturación a empresas.',
  },
  {
    year: '2022',
    phase: 'Fase 07',
    title: 'Expansión de servicios',
    icon: Star,
    achievement: '200 proyectos · primer cliente enterprise',
    description:
      'Expansión hacia domótica, paisajismo e inspecciones técnicas. Primer cliente corporativo de gran escala: habilitación de 5 oficinas comerciales para empresa del retail. 200 proyectos acumulados.',
  },
  {
    year: '2023',
    phase: 'Fase 08',
    title: 'Plataforma digital',
    icon: Globe,
    achievement: 'Lanzamiento de fabrick.cl',
    description:
      'Lanzamiento de plataforma digital fabrick.cl con tienda de materiales, catálogo de proyectos y sistema de presupuesto en línea. Equipo de 12 profesionales. 400 proyectos completados.',
  },
  {
    year: '2024',
    phase: 'Fase 09',
    title: 'Ecosistema Fabrick',
    icon: TrendingUp,
    achievement: '500+ proyectos · 15 especialistas',
    description:
      'Una propuesta integral para construir con confianza. 500+ proyectos, 15 especialistas certificados, catálogo digital de materiales y la mayor red de clientes satisfechos de la historia de la empresa.',
  },
];

const MILESTONES = [
  { label: 'Primer proyecto independiente', year: '2018', detail: 'Remodelación residencial, Ñuñoa' },
  { label: '100° proyecto completado', year: '2021', detail: 'Ampliación estructural, Las Condes' },
  { label: 'Primer cliente corporativo', year: '2022', detail: 'Habilitación de oficinas, Santiago Centro' },
  { label: 'Lanzamiento de fabrick.cl', year: '2023', detail: 'Plataforma digital propia' },
  { label: '500° proyecto entregado', year: '2024', detail: 'Remodelación integral, Providencia' },
];

export const metadata: Metadata = {
  title: 'Evolución | Fabrick',
  description: 'La historia de crecimiento técnico y operativo de Soluciones Fabrick desde 2016 hasta hoy.',
};

export default function EvolucionPage() {
  return (
    <SectionPageShell
      eyebrow="Evolución"
      title="Experiencia construida en terreno"
      description="Nuestra autoridad nace del trabajo real, de la mejora continua y de la capacidad de responder con orden, detalle y respaldo."
      primaryAction={{ href: '/contacto', label: 'Hablar con Fabrick' }}
      secondaryAction={{ href: '/proyectos', label: 'Ver proyectos' }}
    >
      {/* Founder story */}
      <div className="mb-10 rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/5 to-zinc-950 p-8 md:p-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Historia del fundador</p>
        <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
          De las manos al ecosistema
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <p className="text-sm leading-relaxed text-zinc-300">
            Fabrick no nació en una oficina ni en un escritorio. Nació en terreno, con guantes puestos y materiales
            en las manos. Desde los 20 años, el fundador recorrió cada etapa del oficio de construcción: empezó como
            ayudante general, aprendió cada técnica, cada herramienta, cada error posible.
          </p>
          <p className="text-sm leading-relaxed text-zinc-300">
            Esa experiencia acumulada se convirtió en el ADN de la empresa: una organización que entiende la construcción
            desde adentro, que sabe exactamente qué puede fallar y cómo prevenirlo. Hoy, Fabrick es el resultado de
            9 años de mejora continua, 500+ proyectos y la convicción de que construir bien es construir con respaldo.
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-10 rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8 md:p-12">
        <p className="mb-8 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Trayectoria · 2016–2024</p>
        <div className="space-y-8 border-l border-yellow-400/30 pl-6 md:pl-12">
          {TIMELINE.map(({ year, phase, title, icon: Icon, achievement, description }) => (
            <div key={year} className="group relative">
              <div className="absolute -left-[2.6rem] top-1 flex h-8 w-8 items-center justify-center rounded-full border border-yellow-400/40 bg-black transition group-hover:border-yellow-400 group-hover:bg-yellow-400/10 md:-left-[3.1rem]">
                <Icon className="h-3.5 w-3.5 text-yellow-400" />
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                <span className="text-xl font-black text-yellow-400">{year}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">{phase}</span>
              </div>
              <h3 className="mt-1 text-base font-bold uppercase tracking-[0.15em] text-white">{title}</h3>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-400/70">{achievement}</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8 md:p-12">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Hitos</p>
        <h2 className="mb-8 text-2xl font-black uppercase tracking-tight text-white">Momentos que marcaron la historia</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MILESTONES.map(({ label, year, detail }) => (
            <div key={label} className="rounded-2xl border border-white/5 bg-black/60 p-6">
              <span className="text-2xl font-black text-yellow-400">{year}</span>
              <h3 className="mt-2 text-sm font-bold uppercase tracking-[0.15em] text-white">{label}</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionPageShell>
  );
}
