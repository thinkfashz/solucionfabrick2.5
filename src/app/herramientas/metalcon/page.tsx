import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Calculator, Eye, Layers3, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { MetalconCalculator } from '@/components/store/MetalconCalculator';
import MetalconBenefits from '@/components/store/MetalconBenefits';
import MetalconGuideSections from '@/components/store/MetalconGuideSections';
import MetalconSpecSheet from '@/components/store/MetalconSpecSheet';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import StructuredData from '@/components/seo/StructuredData';
import TechnicalAuthoritySection from '@/components/seo/TechnicalAuthoritySection';
import ImmersiveLabEntry from '@/components/tools/ImmersiveLabEntry';
import { buildTechnicalToolJsonLd, SITE_URL } from '@/lib/seo';
import a11y from '../../mobile-accessibility.module.css';

const CANONICAL = `${SITE_URL}/herramientas/metalcon`;

const ANCHORS = [
  { href: '#por-que-metalcon', label: 'Por qué Metalcon', icon: Sparkles },
  { href: '#sistema', label: 'El sistema', icon: Layers3 },
  { href: '#medidas', label: 'Medidas', icon: ShieldCheck },
  { href: '#calculadora', label: 'Calculadora', icon: Calculator },
  { href: '#visor', label: 'Visor 4D', icon: Eye },
  { href: '/herramientas/metalcon/lab', label: 'Laboratorio sísmico', icon: Waves },
] as const;

export const metadata: Metadata = {
  title: 'Construye con Metalcon: guía estructural, materiales y calculadora',
  description: 'Guía completa del sistema constructivo Metalcon: beneficios, familias y perfiles, medidas comerciales, calculadora de montantes y materiales, y visor 4D del armado por capas.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Construye con Metalcon: guía estructural completa | Soluciones Fabrick',
    description: 'Sistema, beneficios, medidas comerciales y calculadora de materiales Metalcon, con visor 4D del armado por capas y acceso al laboratorio sísmico.',
    url: CANONICAL,
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Guía estructural Metalcon Soluciones Fabrick' }],
  },
};

export default function MetalconPage() {
  const jsonLd = buildTechnicalToolJsonLd({
    path: '/herramientas/metalcon',
    name: 'Guía estructural Metalcon: sistema, materiales y cálculo',
    description: 'Guía educativa del sistema constructivo Metalcon: beneficios, familias y espesores, perfiles C con peso y largos comerciales, calculadora de montantes y visor 4D del armado por capas.',
    category: 'DesignApplication',
    keywords: ['Metalcon', 'guía Metalcon', 'calculadora montantes Metalcon', 'perfiles Metalcon medidas', 'peso perfil C Metalcon', 'montantes 40 60 cm', 'Steel Frame Chile', 'panel estructural'],
  });

  return (
    <>
      <StructuredData data={jsonLd} />
      <div className={`${a11y.metalconScope} bg-[#05090C] text-white`}>
        <StorefrontHeader />

        {/* 01 · HERO guía */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,230,0,.12),transparent_40%),radial-gradient(circle_at_12%_85%,rgba(87,212,255,.08),transparent_38%)]" aria-hidden />
          <div className="relative mx-auto max-w-[1500px] px-4 py-14 sm:px-8 sm:py-24">
            <p className="text-[11px] font-black uppercase tracking-[.25em] text-[#FFE600]">Guía estructural · Sistema constructivo Metalcon</p>
            <h1 className="mt-4 max-w-4xl text-[clamp(2.6rem,7vw,6rem)] font-black leading-[.94] tracking-[-.05em]">Construye con Metalcon.</h1>
            <p className="mt-4 max-w-3xl text-[clamp(1.05rem,2.4vw,1.6rem)] font-black leading-tight tracking-[-.02em] text-white/75">
              Guía estructural completa: sistema, materiales y cálculo.
            </p>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/55 sm:text-base sm:leading-8">
              Aprende cómo funciona el acero galvanizado conformado en frío: por qué resiste sismos e incendios, qué perfil va en cada parte de la casa, con qué medidas comerciales se trabaja y cuántos montantes necesitas. Todo con datos del fabricante, sin humo.
            </p>

            <nav aria-label="Secciones de la guía" className="mt-7 flex flex-wrap gap-2">
              {ANCHORS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-4 text-[12px] font-black text-white/70 transition hover:border-[#FFE600]/50 hover:text-[#FFE600]"
                >
                  <Icon size={14} aria-hidden />{label}
                </Link>
              ))}
            </nav>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="#calculadora" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#FFE600] px-6 text-[12px] font-black uppercase tracking-[.08em] text-black transition hover:bg-white">
                <Calculator size={15} aria-hidden />Calcular mi casa
              </Link>
              <Link href="/presupuesto?servicio=metalcon" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 px-5 text-[12px] font-black uppercase tracking-[.08em] text-white/75 transition hover:border-white/50">
                Pedir cotización<ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* 02 · Beneficios */}
        <MetalconBenefits />

        {/* 03 · Anatomía + 04 · Medidas comerciales */}
        <MetalconGuideSections />

        {/* 05 · Calculadora + 06 · Visor 4D */}
        <MetalconCalculator />

        {/* Ficha técnica de referencia */}
        <MetalconSpecSheet />

        <ImmersiveLabEntry href="/herramientas/metalcon/lab" label="Lab Metalcon 4D" />
        <StoreBottomNav />
      </div>
      <TechnicalAuthoritySection
        compact
        eyebrow="Metalcon · instalación, perfiles y vida útil"
        title="Cómo se arma el sistema y cómo interpretar su durabilidad"
        answer="El visor mantiene la edificación, sus paneles y el acceso al laboratorio sísmico. Los controles se basan en una cubicación de referencia: para tabiques, Cintac indica solera superior e inferior, montantes dispuestos a 40 o 60 cm según revestimiento, fijación específica en vanos y extremos, y luego aislación y revestimientos. Una vivienda estructural requiere además proyecto, uniones, anclajes y memoria de cálculo."
        method={[
          'Primero se instalan las soleras o canales superior e inferior y se fijan al soporte correspondiente; después se incorporan los montantes.',
          'En tabiques Metalcon, Cintac indica montantes a 40 o 60 cm según el revestimiento. La herramienta conserva esas dos modulaciones en vez de permitir posiciones estructurales arbitrarias.',
          'En vanos y extremos de muro deben fijarse los montantes a las soleras. Puertas y ventanas cambian la modulación y requieren jambas, dinteles y detalles compatibles con las cargas.',
          'Para tabiques no estructurales, el manual citado muestra perfiles de 0,50 mm, largos de 2,40 y 3,00 m, altura de tabique de hasta 3,00 m y desaconseja empalmar pies derechos.',
          'Cintac publica como referencia que el sistema Metalcon puede superar 100 años de vida útil. Es una referencia del fabricante, no una garantía universal: ambiente, corrosión, agua, diseño, ejecución y mantención siguen siendo determinantes.',
        ]}
        limits={[
          'Mover un elemento en el visor no convierte la configuración en diseño estructural. Los montantes deben respetar modulación, cargas, revestimientos y detalles del proyecto.',
          'No dimensiona capacidad resistente, conexiones, anclajes, diafragmas ni fundaciones; segundo piso y estructuras mayores requieren ingeniería.',
          'No existe un número único de años aplicable a todas las casas. En madera, INN regula durabilidad mediante NCh789/1:2023 y cálculo mediante NCh1198:2024; USDA señala que una estructura de madera bien protegida de la humedad puede alcanzar o superar 100 años. Para ladrillo cocido, documentación técnica internacional de mampostería usa referencias superiores a 100 años, pero eso no sustituye diseño sísmico chileno, morteros, refuerzos ni mantención.',
        ]}
        sources={[
          {
            label: 'Cintac · Manual de Instalación Metalcon',
            href: 'https://www.cintac.cl/wp-content/uploads/2022/05/Manual-Instalacion-Metalcon.pdf',
            note: 'Secuencia de montaje, soleras, montantes a 40/60 cm, vanos, alturas y perfiles para tabiques.',
          },
          {
            label: 'Cintac · Manual de Diseño Metalcon',
            href: 'https://www.cintac.cl/wp-content/uploads/2023/08/Manual-de-Diseno-Metalcon.pdf',
            note: 'Criterios de diseño, perfiles y soluciones estructurales del sistema.',
          },
          {
            label: 'Cintac · características y durabilidad Metalcon',
            href: 'https://www.asistente.cintac.cl/las-caracteristicas-del-metalcon/',
            note: 'Referencia del fabricante que indica una vida útil potencial superior a 100 años.',
          },
          {
            label: 'INN · normas chilenas para construcción en madera',
            href: 'https://www.inn.cl/contenedor-de-noticias/calidad-y-sostenibilidad-para-edificaciones-y-construccion-en-material-madera-y-productos-derivados-de-la-madera-a-traves-de-normas-chilenas/',
            note: 'NCh1198:2024 para cálculo y NCh789/1:2023 para durabilidad de la madera.',
          },
          {
            label: 'USDA Forest Products Laboratory · durabilidad de la madera',
            href: 'https://research.fs.usda.gov/treesearch/41469',
            note: 'La humedad y el detalle constructivo gobiernan la durabilidad; construcciones de madera bien protegidas pueden durar más de un siglo.',
          },
          {
            label: 'Referencia internacional · durabilidad de ladrillo cocido',
            href: 'https://brick.com/wp-content/uploads/2025/01/technical_service_digest-216_0.pdf',
            note: 'Referencia técnica internacional que sitúa la reparación del ladrillo cocido de fachada más allá de 100 años cuando está correctamente diseñado, detallado y construido.',
          },
        ]}
        related={[
          { label: 'Abrir laboratorio constructivo 4D', href: '/herramientas/metalcon/lab' },
          { label: 'Abrir simulador sísmico 4D', href: '/herramientas/metalcon/monitoreo' },
          { label: 'Cotizar Metalcon', href: '/presupuesto?servicio=metalcon' },
        ]}
      />
    </>
  );
}
