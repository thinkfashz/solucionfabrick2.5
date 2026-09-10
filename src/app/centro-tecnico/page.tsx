import type { Metadata } from 'next';
import Link from 'next/link';
import StructuredData from '@/components/seo/StructuredData';
import { buildAuthorityHubJsonLd, SITE_URL } from '@/lib/seo';

const CANONICAL = `${SITE_URL}/centro-tecnico`;

export const metadata: Metadata = {
  title: { absolute: 'Centro técnico Fabrick | BTU, radier, Metalcon y simulación sísmica' },
  description: 'Metodología, límites, fuentes y herramientas de Soluciones Fabrick para calcular BTU, cubicación de radier, paneles Metalcon y escenarios sísmicos educativos.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Centro técnico Fabrick | Cómo calculamos antes de construir',
    description: 'Consulta cómo funcionan las calculadoras Fabrick, qué significan sus resultados, cuáles son sus límites y qué fuentes técnicas se usan como referencia.',
    url: CANONICAL,
    type: 'website',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Centro técnico Soluciones Fabrick' }],
  },
};

const tools = [
  {
    title: 'Calculadora BTU',
    href: '/herramientas/aire-acondicionado',
    answer: 'Entrega una recomendación comercial de capacidad para climatización residencial u oficina. Parte de una carga base por superficie y altura y corrige por ocupación, ventanas, uso, exposición solar, aislación y zona climática.',
    details: ['Base Fabrick: 600 BTU/h por m² a 2,5 m de altura.', 'Añade carga por personas sobre dos ocupantes, superficie de ventanas y tipo de ambiente.', 'Nunca recomienda un equipo por debajo de la carga calculada; si supera 24.000 BTU plantea múltiples unidades.'],
  },
  {
    title: 'Calculadora de radier',
    href: '/herramientas/radier',
    answer: 'Calcula superficie, perímetro, volumen de hormigón, base, gravilla, malla, barrera de humedad, moldaje, estacas y referencias comerciales según el alcance elegido.',
    details: ['Volumen de hormigón = área × espesor, con 8% de margen operativo en la herramienta.', 'Las formas L/U/T/H/I usan factores geométricos de aproximación para una estimación rápida.', 'El costo es referencial y no reemplaza visita, suelo, cálculo ni cotización final.'],
  },
  {
    title: 'Configurador Metalcon',
    href: '/herramientas/metalcon',
    answer: 'Modela paneles y vanos para estimar montantes, soleras, metros de perfil, refuerzos y planchas OSB. La modulación disponible de 40/60 cm sigue la lógica habitual descrita en documentación técnica de Metalcon.',
    details: ['Cuenta montantes base según largo y modulación.', 'Añade refuerzos alrededor de vanos y descuenta su superficie al estimar placas.', 'Los presets estructurales muestran advertencias explícitas cuando corresponde memoria de cálculo.'],
  },
  {
    title: 'Simulador sísmico 4D',
    href: '/herramientas/metalcon/monitoreo',
    answer: 'Es un modelo educativo/comercial que permite comparar escenarios de magnitud, intensidad, profundidad, distancia, suelo y dirección para visualizar una demanda relativa por panel.',
    details: ['Distingue magnitud e intensidad y usa MMI como lectura de efectos.', 'Genera proxies visuales de PGA, deriva, soporte y daño para comparar escenarios.', 'No calcula un espectro de diseño, análisis modal/no lineal ni habitabilidad post-sismo.'],
  },
] as const;

const sources = [
  ['Google Search Central — optimización para funciones generativas', 'https://developers.google.com/search/docs/fundamentals/ai-optimization-guide'],
  ['SEC — protocolo de eficiencia energética para acondicionadores de aire', 'https://wlhttp.sec.cl/PublicacionProductos/adjunto?ac=verDocProt&id=462'],
  ['MINVU / LeyChile — requisitos técnicos de radieres en programas habitacionales', 'https://www.bcn.cl/leychile/navegar?idNorma=1095820'],
  ['Cintac — Manual de Diseño Metalcon', 'https://www.cintac.cl/wp-content/uploads/2020/09/Manual-de-Disen%CC%83o-Metalcon-2020.pdf'],
  ['Centro Sismológico Nacional — glosario de magnitud e intensidad', 'https://www.csn.uchile.cl/sismologia/glosario/'],
] as const;

export default function CentroTecnicoPage() {
  const jsonLd = buildAuthorityHubJsonLd();
  return (
    <main className="min-h-screen bg-[#050708] px-4 py-12 text-white sm:px-6 lg:py-20">
      <StructuredData data={jsonLd} />
      <div className="mx-auto max-w-6xl">
        <header className="max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#F6C64A]">Metodología · fuentes · límites</p>
          <h1 className="mt-4 text-[clamp(2.7rem,7vw,6.8rem)] font-black leading-[.9] tracking-[-.06em]">Calculamos antes de recomendar.</h1>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-white/60 sm:text-base">
            Este centro técnico explica qué hace cada herramienta Fabrick, de dónde salen sus variables y dónde termina una estimación comercial y comienza la necesidad de ingeniería, inspección o cotización profesional.
          </p>
        </header>

        <section className="mt-12 grid gap-4 md:grid-cols-2" aria-label="Metodología de herramientas Fabrick">
          {tools.map((tool) => (
            <article key={tool.href} className="rounded-[2rem] border border-white/10 bg-white/[.035] p-6 sm:p-7">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Respuesta directa</p>
              <h2 className="mt-3 text-2xl font-black tracking-[-.035em]">{tool.title}</h2>
              <p className="mt-4 text-sm leading-7 text-white/60">{tool.answer}</p>
              <ul className="mt-5 space-y-2 text-xs leading-6 text-white/45">
                {tool.details.map((detail) => <li key={detail}>• {detail}</li>)}
              </ul>
              <Link href={tool.href} className="mt-6 inline-flex rounded-full bg-[#F6C64A] px-5 py-3 text-xs font-black text-black">Abrir herramienta</Link>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-[2rem] border border-white/10 bg-[#0a0d0f] p-6 sm:p-8">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#F6C64A]">Criterio de autoridad</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-.04em]">Qué publicamos y qué no afirmamos.</h2>
          <div className="mt-6 grid gap-5 text-sm leading-7 text-white/55 md:grid-cols-2">
            <p>Publicamos metodología visible, fórmulas o reglas usadas por la herramienta, límites de interpretación y enlaces a referencias externas. Cuando el cálculo es una heurística propia de Fabrick, se identifica como estimación y no se presenta como una exigencia normativa.</p>
            <p>No usamos el simulador sísmico para declarar seguridad estructural, habitabilidad o cumplimiento normativo. Tampoco convertimos precios referenciales en una cotización definitiva sin revisar condiciones reales del proyecto.</p>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="fuentes-tecnicas">
          <h2 id="fuentes-tecnicas" className="text-2xl font-black">Fuentes técnicas consultables</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {sources.map(([label, href]) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-white/10 bg-white/[.025] p-4 text-xs font-bold leading-6 text-white/65 hover:border-[#F6C64A]/40 hover:text-white">
                {label}
              </a>
            ))}
          </div>
        </section>

        <section className="mt-12 flex flex-wrap gap-3">
          <Link href="/blog" className="rounded-full border border-white/15 px-5 py-3 text-xs font-black text-white/70">Guías y artículos</Link>
          <Link href="/casos" className="rounded-full border border-white/15 px-5 py-3 text-xs font-black text-white/70">Casos y aplicaciones</Link>
          <Link href="/tienda" className="rounded-full border border-white/15 px-5 py-3 text-xs font-black text-white/70">Productos relacionados</Link>
          <Link href="/presupuesto" className="rounded-full bg-[#F6C64A] px-5 py-3 text-xs font-black text-black">Pasar a presupuesto</Link>
        </section>
      </div>
    </main>
  );
}
