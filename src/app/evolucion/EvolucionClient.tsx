'use client';

import { useEffect, useRef, useState } from 'react';
import SectionPageShell from '@/components/SectionPageShell';
import { CheckCircle2, Hammer, Wrench, Building2, Users, Network } from 'lucide-react';

interface Stage {
  roman: string;
  phase: string;
  title: string;
  years: string;
  summary: string;
  body: string[];
  lessons: string[];
  icon: React.ElementType;
}

const STAGES: Stage[] = [
  {
    roman: 'I',
    phase: 'Fase 01',
    title: 'Ayudante General',
    years: '2015 — 2016',
    summary: 'La escuela dura del terreno: barrer, cargar, observar, preguntar.',
    body: [
      'Comenzamos moviendo sacos de cemento, limpiando radieres y cargando materiales escaleras arriba. Parece simple — pero ahí se aprende a leer la obra.',
      'Cada maestro al que acompañamos nos dejó una pieza: cómo se arma un andamio, cómo se lee un plano, por qué una mezcla queda mejor a cierta hora del día.',
    ],
    lessons: [
      'Escuchar antes de proponer',
      'Respetar el orden del terreno',
      'La disciplina física es la base de todo lo técnico',
    ],
    icon: Hammer,
  },
  {
    roman: 'II',
    phase: 'Fase 02',
    title: 'Maestro de Segunda',
    years: '2016 — 2018',
    summary: 'La herramienta deja de ser ajena. Empezamos a ejecutar partidas completas.',
    body: [
      'Instalación de cerámicos, tabiquería de Volcanita, pintura técnica. Las correcciones del maestro de primera empezaron a bajar mes a mes.',
      'Aprendimos que una buena ejecución no sólo se ve: se siente al tacto, se escucha al golpe, y resiste el paso del tiempo.',
    ],
    lessons: [
      'Control de tolerancias (± 1 mm hace la diferencia)',
      'Orden del puesto de trabajo = velocidad sostenible',
      'Las terminaciones se ganan en el replanteo',
    ],
    icon: Wrench,
  },
  {
    roman: 'III',
    phase: 'Fase 03',
    title: 'Maestro de Primera',
    years: '2018 — 2020',
    summary: 'Precisión técnica en estructuras, carpintería fina y terminaciones que exhiben el trabajo.',
    body: [
      'Entramos al mundo del Metalcon, la carpintería estructural y las instalaciones certificadas. Dejamos de ejecutar partidas para empezar a coordinarlas.',
      'El cliente empezó a pedirnos por nombre. El boca a boca hizo su trabajo silencioso.',
    ],
    lessons: [
      'El ingeniero firma el plano; el maestro firma la obra con sus manos',
      'Todo lo que se puede medir, se mide',
      'La confianza del cliente nace en el primer día',
    ],
    icon: Building2,
  },
  {
    roman: 'IV',
    phase: 'Fase 04',
    title: 'Líder de Proyectos',
    years: '2020 — 2022',
    summary: 'Coordinación de equipos, cronogramas y control de calidad en obras simultáneas.',
    body: [
      'Armamos el primer equipo estable: dos carpinteros, un gasfíter, un eléctrico, tres jornales. Aprender a delegar sin perder el estándar fue el mayor desafío.',
      'Definimos checklists, protocolos de entrega y reuniones semanales de obra. Lo artesanal se volvió metódico.',
    ],
    lessons: [
      'Un cronograma vale más que una promesa',
      'Los equipos se cuidan igual que los materiales',
      'El líder no es el que sabe más, es el que deja que otros brillen',
    ],
    icon: Users,
  },
  {
    roman: 'V',
    phase: 'Fase 05',
    title: 'Contratista Integral',
    years: '2022 — 2024',
    summary: 'Dirección completa de obras residenciales: desde el terreno en bruto hasta la entrega con llaves.',
    body: [
      'Nos transformamos en contratistas. Asumimos la responsabilidad total: permisos, cálculo, materiales, ejecución, recepción. El cliente firma un contrato y descansa.',
      'Este fue el año en que nació el nombre Fabrick. El nombre vino después del método.',
    ],
    lessons: [
      'Un solo interlocutor es el mayor regalo para el cliente',
      'Los problemas se resuelven antes de que lleguen al cliente',
      'La postventa es parte de la obra, no un extra',
    ],
    icon: Building2,
  },
  {
    roman: 'VI',
    phase: 'Fase 06',
    title: 'Ecosistema Fabrick',
    years: '2024 — Presente',
    summary: 'Tienda online, plataforma de proyectos, soluciones llave en mano y soporte postventa digital.',
    body: [
      'Conectamos la obra real con la web: precios sincronizados, proyectos visibles, compra directa de materiales y asesoría técnica en línea.',
      'Hoy Fabrick es un ecosistema: cada cliente ve dónde va su obra, qué materiales se usaron y cuánto queda por entregar.',
    ],
    lessons: [
      'La tecnología amplifica el oficio, no lo reemplaza',
      'La transparencia construye relaciones largas',
      'Cada obra entregada es una nueva puerta abierta',
    ],
    icon: Network,
  },
];

export default function EvolucionClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight;
      // Progress: 0 when section top enters bottom of viewport, 1 when section bottom leaves top
      const total = rect.height + viewportH;
      const travelled = Math.min(Math.max(viewportH - rect.top, 0), total);
      setProgress(Math.min(1, travelled / total));
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <SectionPageShell
      eyebrow="Evolución"
      title="Del ayudante general al ecosistema Fabrick"
      description="Nueve años de oficio resumidos en seis etapas. Cada una cerrada con su sello de aprobación en terreno, antes de avanzar a la siguiente."
      primaryAction={{ href: '/contacto', label: 'Conversar con el equipo' }}
      secondaryAction={{ href: '/proyectos', label: 'Ver obras ejecutadas' }}
    >
      <div ref={containerRef} className="relative">
        {/* Vertical progress rail */}
        <div className="pointer-events-none absolute left-6 top-0 h-full w-[2px] bg-white/5 md:left-1/2 md:-translate-x-1/2">
          <div
            className="absolute left-0 top-0 w-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 shadow-[0_0_18px_rgba(250,204,21,0.45)] transition-[height] duration-150"
            style={{ height: `${progress * 100}%` }}
          />
        </div>

        {/* Sticky progress indicator */}
        <div className="sticky top-24 z-10 -mt-4 mb-10 mx-auto w-max rounded-full border border-yellow-400/20 bg-black/70 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400 backdrop-blur-md">
          Progreso · {Math.round(progress * 100)}%
        </div>

        <div className="space-y-12 md:space-y-16">
          {STAGES.map((stage, idx) => {
            const side = idx % 2 === 0 ? 'md:pr-[52%] md:text-right' : 'md:pl-[52%]';
            return (
              <StageCard key={stage.roman} stage={stage} sideClass={side} index={idx} />
            );
          })}
        </div>

        {/* Final seal */}
        <div className="mt-20 flex justify-center">
          <div
            className="relative flex h-44 w-44 items-center justify-center rounded-full border-4 border-yellow-400 bg-gradient-to-br from-yellow-500/20 via-yellow-400/5 to-transparent text-center motion-safe:animate-[seal-pulse_3s_ease-in-out_infinite]"
            style={{ boxShadow: '0 0 60px rgba(250,204,21,0.35), inset 0 0 30px rgba(250,204,21,0.15)' }}
          >
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-yellow-400">Aprobado</p>
              <p className="mt-1 font-playfair text-3xl font-bold text-white">Fabrick</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.3em] text-yellow-400/70">9 años · 100% obras</p>
            </div>
            <CheckCircle2
              className="absolute -right-3 -bottom-3 h-10 w-10 rounded-full bg-black text-yellow-400"
              strokeWidth={2.5}
            />
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-md text-center text-xs leading-relaxed text-zinc-500">
          Cada etapa cerró con clientes satisfechos y el equipo listo para el siguiente nivel. El sello no es un logro —
          es un compromiso que sigue vigente.
        </p>
      </div>

      <style jsx>{`
        @keyframes seal-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.025); }
        }
      `}</style>
    </SectionPageShell>
  );
}

function StageCard({
  stage,
  sideClass,
  index,
}: {
  stage: Stage;
  sideClass: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Icon = stage.icon;

  return (
    <div
      ref={ref}
      className={`relative pl-16 md:pl-0 ${sideClass} transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      {/* Marker */}
      <div
        className={`absolute top-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-yellow-400 bg-black font-black text-yellow-400 left-1 md:left-1/2 md:-translate-x-1/2 ${
          visible ? 'shadow-[0_0_28px_rgba(250,204,21,0.55)]' : ''
        }`}
      >
        <Icon size={16} />
      </div>

      <article className="rounded-[2rem] border border-white/5 bg-zinc-950/85 p-7 md:p-8">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-yellow-400">
            {stage.phase} · {stage.roman}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{stage.years}</span>
        </div>
        <h3 className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-white md:text-3xl">
          {stage.title}
        </h3>
        <p className="mt-2 text-sm font-medium italic leading-relaxed text-yellow-400/90">{stage.summary}</p>

        <div className="mt-5 space-y-3 text-sm leading-relaxed text-zinc-300">
          {stage.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-5 border-t border-white/5 pt-5">
          <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-yellow-400/70">Aprendizajes clave</p>
          <ul className="space-y-2">
            {stage.lessons.map((lesson) => (
              <li key={lesson} className="flex items-start gap-2 text-sm text-zinc-300">
                <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0 text-yellow-400/70" />
                <span>{lesson}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}
