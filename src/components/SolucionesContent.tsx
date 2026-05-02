'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Layers,
  Home,
  Package,
  Sparkles,
  Truck,
  Hammer,
  ChevronDown,
  ChevronUp,
  Calculator,
  X,
  CheckCircle2,
  Droplet,
  PaintRoller,
  ShieldCheck,
  Zap,
  Wrench,
  Trees,
  Building2,
  ScanLine,
  type LucideIcon,
} from 'lucide-react';
import SectionPageShell from '@/components/SectionPageShell';
import AddServiceQuoteButton from '@/components/AddServiceQuoteButton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SolutionItem {
  name: string;
  spec: string;
  description: string;
  detalle: string;
  materiales: string[];
  rendimiento: string;
  precioMin: number;
  precioMax: number;
  precioUnit: string; // 'm²' | 'm lineal' | 'punto'
  precioNota: string;
}

interface SolutionGroup {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  intro: string;
  items: SolutionItem[];
  ctaLabel: string;
  ctaHref: string;
}

// ─── Real data with detailed specs and market prices (Región del Maule, 2025) ─

const GROUPS: SolutionGroup[] = [
  {
    id: 'piso',
    icon: Layers,
    eyebrow: 'Piso industrializado',
    title: 'Piso técnico con espesor según uso',
    intro:
      'Sistema de piso elevado o sobre radier, seleccionable por espesor según la carga, el tránsito y el tipo de recubrimiento final.',
    items: [
      {
        name: 'Piso 12 mm',
        spec: 'Uso doméstico · Dormitorios y pasillos',
        description:
          'Placa OSB 12 mm sobre entramado Metalcon 60. Ideal para carga liviana y segundos pisos.',
        detalle:
          'La placa OSB (Oriented Strand Board) de 12 mm es la opción más liviana para entrepisos con carga baja. Compuesta de astillas de madera orientadas en capas cruzadas y prensadas con resina fenólica, ofrece resistencia mínima de 12 kN/m² bajo uso doméstico. Se instala sobre entramado de perfiles Metalcon C 60×38×0,85 mm con separación de 40 cm entre ejes. Cumple NCh 1198 para construcción en madera.',
        materiales: [
          'Placa OSB 12 mm – 2,44 × 1,22 m (= 2,98 m² c/u) · Arauco o Masisa',
          'Perfil Metalcon C 60×38×0,85 mm (barrotes a 40 cm c/e)',
          'Canal U 60×36×0,85 mm (soleras perimetrales)',
          'Tornillos autoperforantes 6×50 mm',
          'Sellante perimetral de EPDM',
        ],
        rendimiento:
          '1 placa OSB 12 mm cubre 2,98 m². Con merma del 8–10 % se necesitan aprox. 1,1 placas por m² efectivo de piso. El entramado a 40 cm c/e consume ≈ 2,5 barrotes de 3 m por m lineal de ancho.',
        precioMin: 25000,
        precioMax: 38000,
        precioUnit: 'm²',
        precioNota:
          'Material + mano de obra de instalación. No incluye terminación (cerámico, parqué, alfombra, etc.).',
      },
      {
        name: 'Piso 15 mm',
        spec: 'Uso residencial intensivo',
        description:
          'Placa OSB 15 mm, mayor rigidez y menor vibración. Recomendado para living, cocina y zonas húmedas con membrana.',
        detalle:
          'OSB de 15 mm es el estándar para zonas de alto tránsito residencial. La mayor sección transversal reduce la deflexión entre apoyos y elimina el efecto "trampolín". En zonas húmedas (cocina, baño) se agrega membrana hidrófuga obligatoria bajo el revestimiento final. Compatible con entramado Metalcon 60 a 40 cm y también sobre viguetas de madera 2×6".',
        materiales: [
          'Placa OSB 15 mm – 2,44 × 1,22 m · Arauco o Masisa',
          'Perfil Metalcon C 60×38×0,85 mm (viguetas a 40 cm c/e)',
          'Canal U 60×36×0,85 mm (soleras)',
          'Membrana hidrófuga (zonas húmedas, polietileno 200 μm)',
          'Tornillos autoperforantes 6×55 mm',
          'Cinta de juntas impermeabilizante',
        ],
        rendimiento:
          '1 placa = 2,98 m². Merma estimada 10 %. Se requieren ≈ 2,6 perfiles de 3 m por m² de entramado a 40 cm c/e.',
        precioMin: 32000,
        precioMax: 45000,
        precioUnit: 'm²',
        precioNota:
          'Incluye entramado soporte y placa lista para revestir. Membrana en zonas húmedas incluida.',
      },
      {
        name: 'Piso 18 mm',
        spec: 'Comercial y alta carga',
        description:
          'Placa OSB 18 mm o contrachapado estructural. Soporta tránsito comercial y permite revestimientos pesados (porcelanato gran formato).',
        detalle:
          'El piso de 18 mm está diseñado para locales comerciales y entrepisos con cargas superiores a 2 kN/m². Se puede usar placa OSB 18 mm o contrachapado fenólico 18 mm. Admite porcelanato de gran formato (hasta 120×60 cm) y revestimientos de piedra natural. En aplicaciones comerciales se recomienda separar el entramado a no más de 30 cm para minimizar deflexión.',
        materiales: [
          'Placa OSB 18 mm o contrachapado fenólico 18 mm',
          'Perfil Metalcon C 90×38×0,85 mm o vigueta madera 2×8"',
          'Malla electrosoldada ACMA bajo revestimiento pétreo',
          'Tornillos autoperforantes 6×65 mm',
          'Adhesivo epóxi estructural (juntas)',
        ],
        rendimiento:
          '1 placa = 2,98 m². Merma 10–12 % en cortes con esquinas. Para entramado a 30 cm se necesitan ≈ 3,3 perfiles/m².',
        precioMin: 40000,
        precioMax: 58000,
        precioUnit: 'm²',
        precioNota:
          'Incluye estructura soporte reforzada y placa estructural. Sin terminación final.',
      },
      {
        name: 'Piso 22 mm',
        spec: 'Industrial / entrepiso estructural',
        description:
          'Placa OSB 22 mm machihembrada (T&G). Usado en entrepisos Metalcon de 2 pisos y zonas técnicas de carga puntual.',
        detalle:
          'OSB 22 mm machihembrada (Tongue & Groove) es la opción para entrepisos estructurales y suelos industriales livianos. Los bordes machihembrados eliminan el "efecto tijera" entre placas adyacentes y mejoran la distribución de carga. Certificado para entrepiso Metalcon de 2 pisos. Requiere adhesivo en las juntas T&G además de tornillería.',
        materiales: [
          'Placa OSB 22 mm T&G machihembrada – 2,44 × 1,22 m · Arauco',
          'Perfil Metalcon C 100×50×1,0 mm (viguetas reforzadas)',
          'Canal U 100×48×1,0 mm (soleras)',
          'Adhesivo estructural tipo PU (juntas T&G)',
          'Tornillos autoperforantes 6×70 mm',
        ],
        rendimiento:
          '1 placa machihembrada = aprox. 2,85 m² neto (descontando lengüeta). Merma total ≈ 12–15 %. Entramado reforzado a 40 cm.',
        precioMin: 48000,
        precioMax: 70000,
        precioUnit: 'm²',
        precioNota:
          'Incluye sistema de entramado reforzado. Precio varía según separación de viguetas requerida.',
      },
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
      {
        name: 'Metalcon 60 mm',
        spec: 'Tabiques interiores · Ampliaciones livianas',
        description:
          'Perfil C 60 × 38 × 0,85 mm. Divisiones internas, cielos técnicos y ampliaciones sobre losa existente.',
        detalle:
          'El perfil C 60×38×0,85 mm en acero galvanizado G90 es el estándar para tabiques interiores no estructurales. El sistema completo incluye montante C y canal U de 60 mm, revestido con Volcanita 10 mm por ambas caras. Puede incorporar lana de vidrio 50 mm para aislación acústica (Rw ≈ 40 dB). Sistema liviano: peso propio ≈ 25 kg/m². Cumple NCh 1998 y NCh 2369.',
        materiales: [
          'Perfil C 60×38×0,85 mm (montante) · Metalcon G90',
          'Canal U 60×36×0,85 mm (soleras superior e inferior)',
          'Volcanita Standard 10 mm – 2,44 × 1,22 m (doble cara)',
          'Lana de vidrio 50 mm, densidad 14 kg/m³ (aislación acústica)',
          'Tornillos placa-perfil 3,5×25 mm + pasta de empaste',
        ],
        rendimiento:
          'Un panel de 3 m × 1,2 m usa 4 montantes y cubre 3,6 m² de tabique. Por m² terminado se consumen ≈ 1,1 m² de placa por cara (2,2 m² total en doble cara).',
        precioMin: 45000,
        precioMax: 65000,
        precioUnit: 'm²',
        precioNota:
          'Tabique terminado doble cara, sin pintura. Incluye soleras, montantes, placas y mano de obra.',
      },
      {
        name: 'Metalcon 90 mm',
        spec: 'Muros estructurales · Vivienda nueva',
        description:
          'Perfil C 90 × 38 × 0,85 mm. Muros portantes para vivienda de 1–2 pisos con envolvente térmica Zona 3.',
        detalle:
          'El perfil C 90×38×0,85 mm es el mínimo para muros portantes de vivienda en zona sísmica según NCh 2369. La alma de 90 mm aloja 80 mm de lana de vidrio (λ = 0,035 W/m·K) logrando transmitancia U ≈ 0,44 W/m²K, que cumple OGUC Zona Térmica 3 (Maule). Combinado con OSB 11 mm estructural exterior + Volcanita 12,5 mm interior.',
        materiales: [
          'Perfil C 90×38×0,85 mm (montante) · Metalcon G90',
          'Canal U 90×36×0,85 mm (soleras)',
          'Lana de vidrio 80 mm, densidad 14 kg/m³ (térmica + acústica)',
          'Placa OSB 11 mm estructural (exterior, barrera de viento)',
          'Volcanita 12,5 mm (interior)',
          'Barrera de vapor polietileno 200 μm',
        ],
        rendimiento:
          'Por m² de muro portante terminado: ≈ 1,15 m² OSB exterior + 1,15 m² Volcanita interior. Montantes a 40 cm c/e → 2,5 perfiles de 3 m por m lineal de muro.',
        precioMin: 65000,
        precioMax: 95000,
        precioUnit: 'm²',
        precioNota:
          'Muro estructural con aislación y doble revestimiento. Sin terminación final (estuco, pintura).',
      },
      {
        name: 'Metalcon 100 reforzado',
        spec: 'Vivienda 3 pisos · Comercial',
        description:
          'Perfil C 100 × 50 × 1,0 mm. Proyectos con mayor carga o grandes luces de hasta 4,5 m.',
        detalle:
          'El perfil C 100×50×1,0 mm es el más robusto de la línea estándar Metalcon. Permite luces de hasta 4,5 m sin refuerzo intermedio y resiste cargas de viento ≥ 1 kPa. Se usa en edificios de 3 pisos, galpones ligeros y estructuras comerciales. Siempre va acompañado de cálculo estructural firmado por ingeniero civil.',
        materiales: [
          'Perfil C 100×50×1,0 mm (montante reforzado) · Metalcon G90',
          'Canal U 100×48×1,0 mm (soleras)',
          'Placa OSB 15 mm estructural exterior',
          'Lana de vidrio 100 mm',
          'Volcanita 15 mm doble capa interior',
          'Anclajes mecánicos Hilti (fijación a fundación)',
        ],
        rendimiento:
          'Por m lineal de muro portante: ≈ 2,6 montantes reforzados a 40 cm c/e. Consumo de placa equivalente a Metalcon 90 mm.',
        precioMin: 85000,
        precioMax: 120000,
        precioUnit: 'm²',
        precioNota:
          'Incluye materiales, mano de obra y memoria de cálculo básica. Cálculo estructural formal cotizado por separado.',
      },
      {
        name: 'Kits panelizados',
        spec: 'Obra rápida · 95 días llave en mano',
        description:
          'Paneles cortados, numerados y rotulados. Reducen tiempo de obra hasta en 40 %.',
        detalle:
          'El kit panelizado Fabrick incluye todos los paneles del proyecto cortados a medida en maestranza, numerados con código de plano y empaquetados por zona de montaje. Cada panel llega listo para pararse con cuadrilla de 2 personas. Incluye planos de montaje A3, manual de ensamble y soporte técnico en obra. Reduce residuos de material en ≈ 15 % vs. corte en obra.',
        materiales: [
          'Todos los perfiles C y U según proyecto (60/90/100 mm)',
          'Planos de montaje numerados (formato A3)',
          'Tornillería y taquetes de fijación incluidos',
          'Empaque protegido por panel (stretch film)',
        ],
        rendimiento:
          'Un kit estándar de 60 m² de vivienda se monta en 5–7 días con cuadrilla de 3 personas. Merma de material ≈ 15 % menor que corte en obra.',
        precioMin: 65000,
        precioMax: 95000,
        precioUnit: 'm²',
        precioNota:
          'Precio por m² de superficie habitable, incluye todos los paneles del proyecto. No incluye fundaciones ni terminaciones.',
      },
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
      {
        name: 'Wall Panel PVC Mármol 8 mm',
        spec: 'Baño · Cocina · Salas de estar',
        description:
          'Panel rígido, resistente a humedad y fácil de limpiar. Imitación mármol con varios formatos.',
        detalle:
          'Los paneles PVC Mármol de 8 mm son placas rígidas de PVC espumado de alta densidad con impresión digital UV en efecto mármol. 100 % impermeables, libres de VOC y con clasificación de fuego B-s1,d0 (autoextinguible). Se instalan directamente sobre Volcanita, cerámico o yeso con adhesivo de contacto o clips ocultos, sin necesidad de fragüe ni tiempo de curado. Fáciles de cortar con sierra de carbonuro. Disponibles en formatos 2,44×1,22 m y 2,80×1,22 m.',
        materiales: [
          'Panel PVC Mármol 8 mm – 2,44 × 1,22 m (= 2,98 m²)',
          'Adhesivo de contacto tipo Pattex o Cemento de contacto',
          'Perfil de arranque y remate en aluminio anodizado',
          'Sellante siliconado neutro para juntas',
        ],
        rendimiento:
          '1 panel = 2,98 m². Con merma del 10 % por cortes, se necesitan ≈ 1,1 paneles por m² efectivo.',
        precioMin: 18000,
        precioMax: 28000,
        precioUnit: 'm²',
        precioNota:
          'Incluye panel, adhesivo y mano de obra. Perfiles de remate de aluminio se cotizan aparte.',
      },
      {
        name: 'Panel acústico roble',
        spec: 'Dormitorios · Estudios · Salas de reunión',
        description:
          'Madera natural con fieltro acústico, reduce reverberación y aporta calidez visual.',
        detalle:
          'Los paneles acústicos de roble son lamas de chapa de roble natural de 3 mm sobre MDF 15 mm, con fieltro acústico de 9 mm en la cara posterior. Absorción acústica αw = 0,50 (Clase D, ISO 11654). Disponibles en acabados natural, humo y carbón. Se instalan mediante rieles de aluminio ocultos o adhesivo estructural. Se recomienda cubrir al menos el 20–25 % del área de paredes o techo para notar efecto acústico notable.',
        materiales: [
          'Panel lama roble sobre MDF 15 mm (240 × 60 cm = 1,44 m²)',
          'Fieltro acústico 9 mm adherido en cara posterior',
          'Sistema de rieles ocultos de aluminio',
          'Tornillos de cabeza plana para MDF',
        ],
        rendimiento:
          '1 panel = 1,44 m². Merma ≈ 8 % en instalación lineal; hasta 15 % en esquinas o cortes especiales.',
        precioMin: 32000,
        precioMax: 52000,
        precioUnit: 'm²',
        precioNota:
          'Incluye panel, rieles de montaje y mano de obra. Iluminación integrada y perfiles de borde se cotizan aparte.',
      },
      {
        name: 'Placa fibrocemento siding',
        spec: 'Fachadas · Zonas expuestas',
        description:
          'Siding 8 mm tratado para intemperie, ideal en zonas con exposición a lluvia o salitre.',
        detalle:
          'Las placas de fibrocemento Siding 8 mm están compuestas de cemento Portland, arena de cuarzo y fibras de celulosa prensadas en autoclave. Resistentes a intemperie, hongos e insectos. Reacción al fuego clase A2 (EN 13501). Se instalan sobre estructura Metalcon o madera con espacio ventilado mínimo de 20 mm. Se pintan con 2 manos de sellador + terminación acrílica exterior.',
        materiales: [
          'Placa fibrocemento siding 8 mm · Shera o Plycem (3,0 × 0,20 m)',
          'Tornillos galvanizados autoperforantes 4,2×45 mm',
          'Sellante siliconado neutro (juntas de expansión)',
          'Banda de apriete anti-capilaridad (ventilación)',
          'Pintura exterior acrílica imprimante + terminación',
        ],
        rendimiento:
          'Cobertura efectiva con solapo: 190 mm por tabla. Para 1 m² de fachada se necesitan ≈ 5,3 tablas de 3,0 m.',
        precioMin: 22000,
        precioMax: 38000,
        precioUnit: 'm²',
        precioNota:
          'Incluye placa, tornillería y mano de obra. Pintura de terminación incluida en tramos completos.',
      },
      {
        name: 'Volcanita RH 12,5 mm',
        spec: 'Baños · Lavanderías',
        description:
          'Placa resistente a humedad para revestir tabiques en zonas con vapor continuo.',
        detalle:
          'La Volcanita RH (Resistente a Humedad) de 12,5 mm es una placa de yeso-cartón con núcleo hidrofugado y cartón verde tratado. Absorción de agua < 5 % (ASTM C1396). Se instala igual que Volcanita estándar pero en zonas con vapor continuo. En baños, debe impermeabilizarse con membrana líquida (2 capas Sika o similar) antes de cualquier revestimiento cerámico. No reemplaza cerámica en zona de inmersión directa (ducha o tina).',
        materiales: [
          'Placa Volcanita RH 12,5 mm – 2,44 × 1,22 m (= 2,98 m²) · Volcán',
          'Tornillos placa-yeso 3,5×32 mm',
          'Cinta de papel o malla para juntas',
          'Pasta de empaste para yeso (Covintec o Knauf)',
          'Membrana líquida impermeabilizante (2 capas en baños)',
        ],
        rendimiento:
          '1 placa = 2,98 m². Merma ≈ 8 %. En tabique doble cara se usan 2 placas/m² de tabique.',
        precioMin: 12000,
        precioMax: 20000,
        precioUnit: 'm²',
        precioNota:
          'Precio por cara instalada. Impermeabilización y cerámica se cotizan aparte.',
      },
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
      {
        name: 'Radier armado',
        spec: 'Espesor 10 a 15 cm · H25',
        description:
          'Radier H25 con malla electrosoldada, terminación afinada o pulida.',
        detalle:
          'El radier armado es una losa de hormigón H25 (f\'c = 25 MPa) con malla electrosoldada ACMA 15-15-6 que distribuye la carga uniformemente sobre el terreno. Incluye preparación del terreno, compactación de subbase de ripio (e = 15 cm), barrera capilar de polietileno 200 μm, hormigonado, vibrado con aguja y terminación afinada helicóptero. Opcionalmente endurecedor de cuarzo o corindón para aplicaciones industriales.',
        materiales: [
          'Hormigón H25 (árido máx. 20 mm, resistencia 250 kg/cm²)',
          'Malla electrosoldada ACMA 15-15-6 (4,8 × 2,4 m)',
          'Ripio compactado de subbase (espesor 15 cm)',
          'Polietileno 200 μm (barrera capilar)',
          'Aditivo impermeabilizante Sika-1 o equivalente',
        ],
        rendimiento:
          '1 m³ de hormigón rinde aprox. 8 m² de radier a 12 cm de espesor. Por m² se necesitan ≈ 0,125 m³ hormigón + 3 kg malla electrosoldada.',
        precioMin: 45000,
        precioMax: 72000,
        precioUnit: 'm²',
        precioNota:
          'Incluye preparación de terreno, subbase, hormigón H25, malla y terminación afinada. Sin baldosa ni pintura.',
      },
      {
        name: 'Fundaciones corridas',
        spec: 'Vivienda 1–2 pisos',
        description:
          'Excavación, enfierradura y hormigonado con estudio de mecánica de suelos.',
        detalle:
          'Las fundaciones corridas son riostras de hormigón armado H25 que distribuyen la carga de los muros al terreno. En Región del Maule la profundidad mínima es 60–80 cm (libre de helada y basura orgánica). Incluye: excavación con retroexcavadora, moldaje de madera, enfierradura con 2Ø12 longitudinal + estribos Ø8/20 cm según NCh 430 y NCh 433. Requiere estudio de mecánica de suelos (SPT mínimo 2 sondajes). Incluye memorias de cálculo y planos de fundación.',
        materiales: [
          'Hormigón H25 (árido 20 mm)',
          'Fierro A630-420H Ø12 mm (barras longitudinales × 2)',
          'Fierro A630-420H Ø8 mm (estribos cada 20 cm)',
          'Moldaje de costaneras de madera',
          'Arena lavada (relleno lateral compactado)',
        ],
        rendimiento:
          'Por m lineal de fundación corrida (sección 40×40 cm): ≈ 0,064 m³ hormigón + 7 kg fierro longitudinal + 3 kg estribos.',
        precioMin: 85000,
        precioMax: 140000,
        precioUnit: 'm lineal',
        precioNota:
          'Por metro lineal de zanja terminada. Incluye excavación, moldaje, enfierradura y hormigonado. No incluye relleno de sobre-excavación.',
      },
      {
        name: 'Refuerzo estructural',
        spec: 'Ampliaciones sobre losa existente',
        description:
          'Refuerzo con perfiles metálicos anclados a losa existente, certificado por ingeniero.',
        detalle:
          'El refuerzo estructural permite ampliar sin demoler. Consiste en anclar perfiles HEB o C de acero A36/A572 a losa o muros existentes mediante anclajes químicos Hilti o Sika AnchorFix. El ingeniero calcula el refuerzo requerido. Incluye: levantamiento de la estructura existente, propuesta de refuerzo, aprobación DOM si corresponde, ejecución e informe final. Compatible con hormigón, albañilería y madera.',
        materiales: [
          'Perfiles HEB o C de acero A36/A572 (según cálculo)',
          'Anclajes químicos Hilti HIT-RE 500 V3',
          'Placa base de acero 10 mm + soldadura E70XX',
          'Pintura anticorrosiva epóxi bicapa',
        ],
        rendimiento:
          'Un refuerzo típico de viga carguera para ampliación de 30 m² usa ≈ 120–180 kg de acero estructural según luz libre.',
        precioMin: 65000,
        precioMax: 105000,
        precioUnit: 'm²',
        precioNota:
          'Por m² de superficie a reforzar/ampliar. Incluye ingeniería básica y ejecución. DOM y permisos se cotizan aparte.',
      },
      {
        name: 'Anclajes químicos',
        spec: 'Fijaciones a hormigón existente',
        description:
          'Anclajes Hilti HIT-RE 500 para cargas elevadas en estructuras existentes.',
        detalle:
          'El sistema Hilti HIT-RE 500 V3 utiliza resina epóxi bicomponente para transferir cargas a hormigón existente. Proceso: perforación con broca widia o diamante, limpieza con compresor + cepillo metálico, inyección de resina + inserción de varilla roscada. Tiempo de fraguado: 1–12 h según temperatura. Certificado ETA-11/0493 para zonas sísmicas. Carga de diseño: 20–150 kN por punto según diámetro y profundidad.',
        materiales: [
          'Cápsula Hilti HIT-RE 500 V3 (cartuchos 330 ml / 500 ml)',
          'Varilla roscada galvanizada M12/M16/M20',
          'Broca SDS-Plus de Ø12–20 mm',
          'Compresor + cepillo metálico (limpieza de perforación)',
        ],
        rendimiento:
          '1 cartucho 330 ml rinde ≈ 25 anclajes de Ø12×110 mm. 1 cartucho 500 ml rinde ≈ 38 anclajes del mismo tipo.',
        precioMin: 15000,
        precioMax: 35000,
        precioUnit: 'punto',
        precioNota:
          'Por punto de anclaje instalado (material + mano de obra). Varía según diámetro y profundidad requerida.',
      },
    ],
    ctaLabel: 'Agendar visita técnica',
    ctaHref: '/contacto?asunto=estructura',
  },
  {
    id: 'suministro',
    icon: Truck,
    eyebrow: 'Materiales seleccionados',
    title: 'Materiales elegidos por nuestros especialistas',
    intro:
      'Nuestros materiales son seleccionados, adquiridos e instalados por el equipo Fabrick directamente en tu obra. No vendemos suelto — ejecutamos completo.',
    items: [
      {
        name: 'Materiales gruesos',
        spec: 'Cemento, fierro, áridos',
        description:
          'Cada material llega a la obra en la cantidad exacta que el proyecto necesita. Sin excedentes ni mermas innecesarias.',
        detalle:
          'Los materiales gruesos son la base de cualquier obra. En Fabrick adquirimos directamente con proveedores certificados de la Región del Maule: Cemento Melón o Polpaico en sacos 25 kg, fierro corrugado A630-420H de Ø8 a Ø25 mm en barras de 6 y 12 m, árido grueso (grava chancada 20 mm) y árido fino (arena lavada) de canteras con certificación DICTUC, y agua de calidad. Cada entrega incluye guía de remisión y certificado de calidad.',
        materiales: [
          'Cemento Portland IP Melón o Polpaico (sacos 25 kg)',
          'Fierro corrugado A630-420H Ø8–25 mm (barras 6 y 12 m)',
          'Árido grueso chancado 20 mm (certificado DICTUC)',
          'Arena lavada de río (certificado granulométrico)',
          'Aditivos: plastificante, impermeabilizante Sika-1',
        ],
        rendimiento:
          'Para 1 m³ de hormigón H25: ≈ 380 kg cemento + 700 kg árido grueso + 560 kg arena + 190 L agua. Para 1 m² de mortero de pega 2 cm: ≈ 6 kg cemento + 24 kg arena.',
        precioMin: 12000,
        precioMax: 28000,
        precioUnit: 'm²',
        precioNota:
          'Precio referencial por m² de obra equivalente. Para volúmenes exactos solicite presupuesto con planos.',
      },
      {
        name: 'Perfiles Metalcon',
        spec: '60, 90, 100 mm · C y U',
        description:
          'Perfiles galvanizados G90 certificados, seleccionados para la carga estructural de tu vivienda.',
        detalle:
          'Los perfiles Metalcon (Volcán – Acería del Pacífico) son fabricados en acero galvanizado G90 (recubrimiento de zinc 90 g/m²) bajo norma ASTM A653. Perfil C para montantes y canal U para soleras. Disponibles en 60, 70, 90, 100 y 150 mm de alma. Espesor de pared: 0,85 mm (tabiques) y 1,0 mm (estructurales). Se venden en barras de 3 m empaquetadas de 30 unidades con stretch film.',
        materiales: [
          'Perfil C Metalcon G90 (60/70/90/100 mm × 0,85–1,0 mm × 3 m)',
          'Canal U Metalcon G90 (60/70/90/100 mm × 0,85–1,0 mm × 3 m)',
          'Tornillos autoperforantes (caja × 100 u., diámetros 4,2–6 mm)',
        ],
        rendimiento:
          '1 barra de 3 m pesa 1,8–4,2 kg según perfil. Para tabique de 3 m altura a 40 cm c/e: ≈ 3,2 barrotes + 0,7 soleras por m lineal de muro.',
        precioMin: 8000,
        precioMax: 18000,
        precioUnit: 'm²',
        precioNota:
          'Precio de material puesto en obra. Incluye flete a obra dentro de la Región del Maule. Instalación cotizada aparte.',
      },
      {
        name: 'Placas y revestimientos',
        spec: 'OSB, Volcanita, fibrocemento, PVC',
        description:
          'Cortes y terminaciones definidas directamente con plano de obra y equipo instalador.',
        detalle:
          'Suministramos las principales placas de revestimiento y estructura: Placa OSB 12/15/18/22 mm (Arauco o Masisa), Volcanita Standard y RH 10/12,5/15 mm (Volcán), Fibrocemento Siding 8 mm (Shera o Plycem) y Panel PVC Mármol 8 mm. Materiales adquiridos directamente al distribuidor y entregados en obra con guía de despacho. Corte a medida en maestranza cuando el proyecto incluye panelización.',
        materiales: [
          'Placa OSB (12/15/18/22 mm, 2,44 × 1,22 m) · Arauco o Masisa',
          'Volcanita Standard / RH (10–15 mm) · Volcán',
          'Siding fibrocemento 8 mm · Shera o Plycem',
          'Panel PVC Mármol 8 mm (2,44 × 1,22 m)',
        ],
        rendimiento:
          'Todas las placas en formato estándar 2,44×1,22 m = 2,98 m² por unidad. Merma media de obra: 8–12 % según complejidad de cortes.',
        precioMin: 6000,
        precioMax: 16000,
        precioUnit: 'm²',
        precioNota:
          'Precio de material puesto en obra. Instalación se cotiza por separado según tipo de placa.',
      },
      {
        name: 'Gasfitería y eléctrico',
        spec: 'PPR, cable LH, automáticos SEC',
        description:
          'Instalación certificada SEC incluida en obras ejecutadas por Fabrick.',
        detalle:
          'Instalaciones sanitarias con tuberías termofusionadas PPR PN-20 (fría) y PN-25 (caliente) de Tigre o Aquatherm, cumpliendo NCh 2485. Instalaciones eléctricas con cable LH 90°C en canalización EMT o ducto PVC, tablero automático Schneider o Legrand, y certificación eléctrica SEC Revisión 3. El equipo incluye gasfiter-eléctrico con licencia vigente. Proyecto eléctrico y sanitario disponible para ampliaciones > 50 m².',
        materiales: [
          'Tuberías PPR PN-20/25 (Ø 20–63 mm) · Tigre o Aquatherm',
          'Cable LH 90°C 2,5 y 4 mm² (circuitos normales y fuerza)',
          'Tablero automático Schneider Easy 9 o Legrand',
          'Ducto conduit PVC con accesorios',
          'Grifería y artefactos sanitarios (según proyecto)',
        ],
        rendimiento:
          'Por m² habitable se estiman ≈ 3–5 m de instalación eléctrica y ≈ 2–3 m de cañería sanitaria en plantas típicas de vivienda.',
        precioMin: 20000,
        precioMax: 45000,
        precioUnit: 'm²',
        precioNota:
          'Total instalaciones (eléctrica + sanitaria) por m² de superficie habitable. Incluye materiales y mano de obra certificada SEC.',
      },
    ],
    ctaLabel: 'Ver catálogo',
    ctaHref: '/tienda',
  },
];

// ─── Services catalog (unified with /servicios) ──────────────────────────────

interface ServiceItem {
  title: string;
  description: string;
  features: string[];
  refPrice?: number;
  unit: string;
  icon: LucideIcon;
  href: string | null;
}

const SERVICES: ServiceItem[] = [
  {
    title: 'Cimientos y bases',
    description:
      'Ejecución precisa para dar estabilidad real desde el primer día de obra. Trabajamos con topografía verificada y hormigón certificado.',
    features: ['Estudio de suelo previo', 'Hormigón H-30 certificado', 'Supervisión estructural continua'],
    refPrice: 850000,
    unit: 'obra',
    icon: Hammer,
    href: null,
  },
  {
    title: 'Estructuras Metalcon',
    description:
      'Montaje técnico y controlado para proyectos residenciales modernos y seguros. Ideal para ampliaciones y obras nuevas de baja altura.',
    features: ['Perfiles galvanizados de 1ª calidad', 'Plano estructural incluido', 'Garantía de 5 años en estructura'],
    refPrice: 1200000,
    unit: 'obra',
    icon: Home,
    href: '/servicios/metalcon',
  },
  {
    title: 'Gasfitería certificada',
    description:
      'Instalaciones limpias, confiables y pensadas para durar. Certificación ESSBIO y SEC según normativa vigente.',
    features: ['Certificación SEC incluida', 'Materiales de primera marca', 'Prueba de presión post-instalación'],
    refPrice: 320000,
    unit: 'obra',
    icon: Droplet,
    href: '/servicios/gasfiteria',
  },
  {
    title: 'Revestimientos y aislación',
    description:
      'Confort térmico y acústico con terminaciones cuidadas. Reducimos el ruido exterior y optimizamos la temperatura interior.',
    features: ['Aislación lana de vidrio o roca', 'Placa Volcanita certificada', 'Reducción sonora de hasta 42 dB'],
    refPrice: 480000,
    unit: 'obra',
    icon: Layers,
    href: null,
  },
  {
    title: 'Pintura y acabados',
    description:
      'Terminaciones finas para espacios elegantes y funcionales. Trabajamos con pinturas premium de larga durabilidad.',
    features: ['Preparación de superficie incluida', 'Pinturas Sipa o Sherwin-Williams', 'Mínimo 2 manos de aplicación'],
    refPrice: 180000,
    unit: 'obra',
    icon: PaintRoller,
    href: null,
  },
  {
    title: 'Seguridad y domótica',
    description:
      'Control de accesos, automatización y protección para el hogar moderno. Tu casa inteligente y segura desde el día uno.',
    features: ['Cámaras IP 4K con almacenamiento', 'Cerradura digital con huella', 'App de control remoto incluida'],
    refPrice: 650000,
    unit: 'obra',
    icon: ShieldCheck,
    href: null,
  },
  {
    title: 'Instalaciones eléctricas',
    description:
      'Circuitos dimensionados correctamente, tablero termomagnético y certificación SEC. Seguridad eléctrica sin compromiso.',
    features: ['Plano eléctrico actualizado', 'Certificación SEC obligatoria', 'Tablero modular con diferencial'],
    refPrice: 290000,
    unit: 'obra',
    icon: Zap,
    href: '/servicios/electricidad',
  },
  {
    title: 'Mantención y reparaciones',
    description:
      'Servicio de mantención preventiva y correctiva para proteger tu inversión. Evita problemas mayores con revisiones periódicas.',
    features: ['Visita de diagnóstico incluida', 'Informe técnico escrito', 'Plan de mantención anual'],
    refPrice: 95000,
    unit: 'visita',
    icon: Wrench,
    href: null,
  },
  {
    title: 'Paisajismo y exteriores',
    description:
      'Diseño y ejecución de espacios exteriores que complementan la arquitectura. Terrazas, jardines y áreas de descanso premium.',
    features: ['Diseño de terraza o jardín', 'Iluminación exterior LED', 'Materiales resistentes a la intemperie'],
    refPrice: 420000,
    unit: 'obra',
    icon: Trees,
    href: null,
  },
  {
    title: 'Ampliaciones y remodelación integral',
    description:
      'Transformamos espacios completos coordinando todos los oficios. Un solo contrato, un solo equipo, cero dolores de cabeza.',
    features: ['Coordinación total del proyecto', 'Cronograma con hitos semanales', 'Garantía de entrega a tiempo'],
    refPrice: undefined,
    unit: 'obra',
    icon: Building2,
    href: '/servicios/ampliaciones',
  },
  {
    title: 'Inspección técnica',
    description:
      'Evaluación profesional de obra nueva o usada antes de comprar o remodelar. Detectamos fallas ocultas antes de que sean problemas.',
    features: ['Informe fotográfico completo', 'Estimación de costos de reparación', 'Entrega en 48 horas'],
    refPrice: 150000,
    unit: 'inspección',
    icon: ScanLine,
    href: null,
  },
  {
    title: 'Diseño de interiores',
    description:
      'Propuestas de diseño que integran estética, funcionalidad y el presupuesto real del cliente. Del concepto al resultado final.',
    features: ['Renders 3D del espacio', 'Selección de materiales premium', 'Coordinación con obra incluida'],
    refPrice: 380000,
    unit: 'proyecto',
    icon: Sparkles,
    href: null,
  },
];

const STATS = [
  { value: '500+', label: 'Proyectos completados' },
  { value: '8', label: 'Años de experiencia' },
  { value: '100%', label: 'Clientes satisfechos' },
  { value: '15', label: 'Especialistas certificados' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCLP(n: number): string {
  return n.toLocaleString('es-CL');
}

// ─── Service Calculator Modal ─────────────────────────────────────────────────

function ServiceCalculatorModal({
  service,
  onClose,
}: {
  service: ServiceItem;
  onClose: () => void;
}) {
  const [qty, setQty] = useState('1');
  const [area, setArea] = useState('');

  const isAreaUnit = service.unit === 'm²';
  const q = parseFloat(qty);
  const a = parseFloat(area);

  const validQty = !isNaN(q) && q > 0;
  const validArea = !isNaN(a) && a > 0;

  // Estimate range: ±15 % around the reference price.
  const baseTotal = useMemo(() => {
    if (!service.refPrice) return null;
    if (isAreaUnit) return validArea ? service.refPrice * a : null;
    return validQty ? service.refPrice * q : null;
  }, [service.refPrice, isAreaUnit, validArea, validQty, a, q]);

  const estMin = baseTotal != null ? Math.round(baseTotal * 0.85) : null;
  const estMax = baseTotal != null ? Math.round(baseTotal * 1.15) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-[2rem] border border-yellow-400/20 bg-zinc-950 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar calculadora"
          className="absolute right-6 top-6 rounded-full p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-400">
            <Calculator size={18} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
              Calculadora de servicio
            </p>
            <h3 className="text-lg font-black uppercase text-white">
              {service.title}
            </h3>
          </div>
        </div>

        <p className="mb-5 text-xs leading-relaxed text-zinc-400">
          {service.description}
        </p>

        {service.refPrice ? (
          <>
            {isAreaUnit ? (
              <div className="mb-5">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
                  Superficie a intervenir (m²)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Ej: 25"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400/50 focus:outline-none"
                />
              </div>
            ) : (
              <div className="mb-5">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
                  Cantidad ({service.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="1"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400/50 focus:outline-none"
                />
              </div>
            )}

            {estMin != null && estMax != null ? (
              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                  Estimación referencial
                </p>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-xl font-black text-white">
                    ${formatCLP(estMin)}
                  </span>
                  <span className="text-zinc-500">–</span>
                  <span className="text-xl font-black text-white">
                    ${formatCLP(estMax)}
                  </span>
                  <span className="text-xs text-zinc-500">CLP</span>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                  Rango ±15 % sobre precio base de referencia (${formatCLP(service.refPrice)} / {service.unit}).
                  No constituye oferta formal.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center text-xs text-zinc-500">
                Ingresa {isAreaUnit ? 'la superficie' : 'una cantidad'} para ver el cálculo
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center text-xs text-zinc-400">
            Este servicio se cotiza siempre a medida. Solicita una visita para
            recibir un presupuesto exacto.
          </div>
        )}

        <p className="mt-4 text-[10px] leading-relaxed text-zinc-600">
          * Precios referenciales de mercado en la Región del Maule, Chile (2025).
          El presupuesto definitivo se entrega tras visita técnica.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/cotizaciones"
            onClick={onClose}
            className="flex-1 rounded-full border border-yellow-400/35 px-5 py-3 text-center text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400 transition hover:bg-yellow-400/10"
          >
            Ver mi cotización
          </Link>
          <Link
            href="/contacto"
            onClick={onClose}
            className="flex-1 rounded-full bg-yellow-400 px-5 py-3 text-center text-[10px] font-black uppercase tracking-[0.25em] text-black transition hover:bg-yellow-300"
          >
            Solicitar visita
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Calculator Modal ─────────────────────────────────────────────────────────

function CalculatorModal({
  group,
  onClose,
}: {
  group: SolutionGroup;
  onClose: () => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');

  const item = group.items[selectedIdx];
  const w = parseFloat(width);
  const l = parseFloat(length);
  const m2 = !isNaN(w) && !isNaN(l) && w > 0 && l > 0 ? w * l : null;

  const isM2Unit = item.precioUnit === 'm²';
  const priceMin = m2 && isM2Unit ? Math.round(m2 * item.precioMin) : null;
  const priceMax = m2 && isM2Unit ? Math.round(m2 * item.precioMax) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-[2rem] border border-yellow-400/20 bg-zinc-950 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Cerrar calculadora"
          className="absolute right-6 top-6 rounded-full p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-400">
            <Calculator size={18} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
              Calculadora m²
            </p>
            <h3 className="text-lg font-black uppercase text-white">
              {group.eyebrow}
            </h3>
          </div>
        </div>

        {/* Item selector */}
        <div className="mb-5">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
            Tipo de solución
          </label>
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-yellow-400/50 focus:outline-none"
          >
            {group.items.map((it, i) => (
              <option key={i} value={i} className="bg-zinc-900">
                {it.name} — {it.spec}
              </option>
            ))}
          </select>
        </div>

        {/* Dimension inputs */}
        <div className="mb-5 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
              Ancho (metros)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="Ej: 5.50"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
              Largo (metros)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="Ej: 8.00"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-400/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Results */}
        {m2 !== null ? (
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-5">
            <div className="mb-4 flex items-center justify-between border-b border-yellow-400/10 pb-4">
              <span className="text-xs text-zinc-400">Superficie calculada</span>
              <span className="text-2xl font-black text-yellow-400">
                {m2.toFixed(2)} m²
              </span>
            </div>

            {isM2Unit && priceMin && priceMax ? (
              <>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                  Precio referencial estimado
                </p>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-xl font-black text-white">
                    ${formatCLP(priceMin)}
                  </span>
                  <span className="text-zinc-500">–</span>
                  <span className="text-xl font-black text-white">
                    ${formatCLP(priceMax)}
                  </span>
                  <span className="text-xs text-zinc-500">CLP</span>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                  {item.precioNota}
                </p>
              </>
            ) : (
              <p className="text-xs text-zinc-400">
                Este ítem se cotiza por{' '}
                <span className="font-bold text-yellow-400">{item.precioUnit}</span>.
                Contacta a un asesor para un precio exacto de tu proyecto.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center text-xs text-zinc-500">
            Ingresa el ancho y largo para ver el cálculo
          </div>
        )}

        <p className="mt-4 text-[10px] leading-relaxed text-zinc-600">
          * Precios referenciales de mercado en la Región del Maule, Chile (2025).
          No constituyen oferta formal. Solicite cotización personalizada para
          valores exactos.
        </p>

        <Link
          href={group.ctaHref}
          onClick={onClose}
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-black transition hover:bg-yellow-300"
        >
          {group.ctaLabel} <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ─── Solution Item Card (accordion) ──────────────────────────────────────────

function SolutionItemCard({
  item,
  itemKey,
  isOpen,
  onToggle,
}: {
  item: SolutionItem;
  itemKey: string;
  isOpen: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <div
      className={`rounded-2xl border transition-colors ${
        isOpen
          ? 'border-yellow-400/30 bg-yellow-400/[0.03]'
          : 'border-white/5 bg-white/[0.02] hover:border-yellow-400/20 hover:bg-yellow-400/[0.02]'
      }`}
    >
      {/* Card header — always visible */}
      <button
        className="group flex w-full items-start justify-between gap-3 p-5 text-left"
        onClick={() => onToggle(itemKey)}
        aria-expanded={isOpen}
      >
        <div className="flex-1">
          <p className="text-sm font-black text-white">{item.name}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-400/70">
            {item.spec}
          </p>
          {!isOpen && (
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {item.description}
            </p>
          )}
        </div>
        <span className="mt-0.5 flex-shrink-0 text-zinc-500 transition group-hover:text-yellow-400">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Expanded detail */}
      {isOpen && (
        <div className="border-t border-yellow-400/10 px-5 pb-6 pt-4">
          {/* Detailed description */}
          <p className="mb-5 text-sm leading-relaxed text-zinc-300">
            {item.detalle}
          </p>

          {/* Materials */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
              Materiales principales
            </p>
            <ul className="space-y-1.5">
              {item.materiales.map((mat) => (
                <li key={mat} className="flex items-start gap-2 text-xs text-zinc-300">
                  <CheckCircle2
                    size={13}
                    className="mt-0.5 flex-shrink-0 text-yellow-400/70"
                  />
                  {mat}
                </li>
              ))}
            </ul>
          </div>

          {/* Rendimiento */}
          <div className="mb-5 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400/70">
              Rendimiento por unidad
            </p>
            <p className="text-xs leading-relaxed text-zinc-300">
              {item.rendimiento}
            </p>
          </div>

          {/* Price range */}
          <div className="rounded-xl border border-yellow-400/15 bg-yellow-400/[0.04] px-4 py-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400/70">
              Precio referencial de mercado
            </p>
            <p className="text-base font-black text-white">
              ${formatCLP(item.precioMin)} – ${formatCLP(item.precioMax)}{' '}
              <span className="text-xs font-normal text-zinc-400">
                CLP / {item.precioUnit}
              </span>
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">{item.precioNota}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

type TabId = 'servicios' | 'soluciones';

interface UnifiedProps {
  /** Which tab to highlight initially (defaults to 'servicios'). */
  initialTab?: TabId;
  /** Hero copy override per route. */
  hero?: {
    eyebrow?: string;
    title?: string;
    description?: string;
  };
}

export default function SolucionesContent({
  initialTab = 'servicios',
  hero,
}: UnifiedProps = {}) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [calcGroup, setCalcGroup] = useState<SolutionGroup | null>(null);
  const [calcService, setCalcService] = useState<ServiceItem | null>(null);

  function toggleItem(key: string) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <>
      <SectionPageShell
        eyebrow={hero?.eyebrow ?? 'Servicios y soluciones'}
        title={hero?.title ?? 'Un solo equipo para toda tu obra'}
        description={
          hero?.description ??
          'Servicios profesionales y bloques técnicos por m² en una sola plataforma. Calcula tu obra, agrega lo que necesitas a la cotización y recibe respuesta en menos de 24 horas — sin precios sorpresa.'
        }
        primaryAction={{ href: '/cotizaciones', label: 'Ver mi cotización' }}
        secondaryAction={{ href: '/juego', label: 'Diseñar mi casa' }}
      >
        {/* Stats strip */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:mb-10 md:grid-cols-4 md:gap-4">
          {STATS.map(({ value, label }) => (
            <div
              key={label}
              className="rounded-[1.5rem] border border-yellow-400/20 bg-black/60 p-5 text-center md:p-6"
            >
              <p className="text-2xl font-black text-yellow-400 md:text-4xl">{value}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label="Servicios y soluciones"
          className="mb-8 inline-flex w-full max-w-xl rounded-full border border-white/10 bg-white/[0.03] p-1 text-[10px] font-black uppercase tracking-[0.22em] md:mb-10"
        >
          <button
            role="tab"
            aria-selected={tab === 'servicios'}
            onClick={() => setTab('servicios')}
            className={`flex-1 rounded-full px-4 py-3 transition ${
              tab === 'servicios'
                ? 'bg-yellow-400 text-black'
                : 'text-zinc-400 hover:text-yellow-400'
            }`}
          >
            Servicios profesionales
          </button>
          <button
            role="tab"
            aria-selected={tab === 'soluciones'}
            onClick={() => setTab('soluciones')}
            className={`flex-1 rounded-full px-4 py-3 transition ${
              tab === 'soluciones'
                ? 'bg-yellow-400 text-black'
                : 'text-zinc-400 hover:text-yellow-400'
            }`}
          >
            Soluciones técnicas por m²
          </button>
        </div>

        {/* ─── TAB: Servicios ─────────────────────────────────────────── */}
        {tab === 'servicios' && (
          <div role="tabpanel">
            <p className="mb-6 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Servicios completos ejecutados por nuestro equipo: cimientos, estructura
              Metalcon, instalaciones certificadas, terminaciones y mantención. Toca
              <span className="mx-1 inline-flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-bold text-yellow-400">
                <Calculator size={10} /> Calcular
              </span>
              en cualquier tarjeta para estimar el costo de tu obra.
            </p>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {SERVICES.map((service) => {
                const { title, description, features, refPrice, unit, icon: Icon, href } = service;
                return (
                  <article
                    key={title}
                    className="group flex flex-col rounded-[2rem] border border-white/5 bg-zinc-950/85 p-7 transition hover:border-yellow-400/30"
                  >
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-400/20 bg-black transition group-hover:border-yellow-400/50 group-hover:bg-yellow-400/5">
                      <Icon className="h-6 w-6 text-yellow-400" />
                    </div>
                    <h2 className="text-lg font-bold uppercase tracking-[0.15em] text-white">
                      {title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                      {description}
                    </p>
                    <ul className="mt-5 space-y-2">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto flex flex-col gap-3 border-t border-white/5 pt-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                          {refPrice
                            ? `Desde $${formatCLP(refPrice)} / ${unit}`
                            : 'Cotización a medida'}
                        </span>
                        <AddServiceQuoteButton
                          serviceTitle={title}
                          description={description}
                          refPrice={refPrice}
                          unit={unit}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setCalcService(service)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/35 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400 transition hover:bg-yellow-400/10"
                        >
                          <Calculator className="h-3 w-3" /> Calcular
                        </button>

                        {href ? (
                          <Link
                            href={href}
                            className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-400/80 transition-colors hover:text-yellow-400"
                          >
                            Ver detalle →
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB: Soluciones ────────────────────────────────────────── */}
        {tab === 'soluciones' && (
          <div role="tabpanel">
            <p className="mb-6 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Bloques técnicos cotizados por m², m lineal o punto. Cada uno se
              puede comprar por separado o combinarse en un paquete llave en mano.
              Toca cualquier solución para ver materiales, rendimiento y precios.
            </p>

            {/* Quick jump nav */}
            <nav className="mb-8 flex flex-wrap gap-2">
              {GROUPS.map((g) => (
                <a
                  key={g.id}
                  href={`#${g.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-400"
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
                  className="scroll-mt-28 overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-950/80 p-6 md:p-10"
                >
                  <header className="flex flex-col gap-5 border-b border-white/5 pb-6 md:flex-row md:items-end md:justify-between">
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-400">
                        <group.icon size={20} />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">
                          {group.eyebrow}
                        </p>
                        <h2 className="mt-1 text-2xl font-black uppercase leading-tight tracking-tight text-white md:text-3xl">
                          {group.title}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                          {group.intro}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => setCalcGroup(group)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-yellow-400/35 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400 transition hover:bg-yellow-400/10"
                      >
                        <Calculator size={12} /> Calcular m²
                      </button>
                      <Link
                        href={group.ctaHref}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-black transition hover:bg-yellow-300"
                      >
                        {group.ctaLabel} <ArrowRight size={12} />
                      </Link>
                    </div>
                  </header>

                  <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                    Toca cualquier solución para ver materiales, rendimiento y precios
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {group.items.map((item, idx) => {
                      const key = `${group.id}-${idx}`;
                      return (
                        <SolutionItemCard
                          key={key}
                          item={item}
                          itemKey={key}
                          isOpen={openItems.has(key)}
                          onToggle={toggleItem}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}

        {/* Final CTA — shared between both tabs */}
        <div className="mt-12 rounded-[2rem] border border-yellow-400/20 bg-[linear-gradient(135deg,rgba(250,204,21,0.08),rgba(250,204,21,0.02))] p-8 text-center md:p-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">
            Paquete integral
          </p>
          <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white md:text-4xl">
            Arma tu casa con la lista completa
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
            Coordinamos todo en un solo cronograma: diseño, materiales, estructura,
            instalaciones y terminaciones. Un solo equipo, un solo estándar.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/cotizaciones"
              className="rounded-full bg-yellow-400 px-8 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-black transition hover:bg-white"
            >
              Ver mi cotización
            </Link>
            <Link
              href="/contacto?asunto=integral"
              className="rounded-full border border-yellow-400/35 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.25em] text-yellow-400 transition hover:bg-yellow-400/10"
            >
              Solicitar presupuesto integral
            </Link>
            <Link
              href="/proyectos"
              className="rounded-full border border-white/10 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-400"
            >
              Ver proyectos ejecutados
            </Link>
          </div>
        </div>
      </SectionPageShell>

      {/* Calculator modals */}
      {calcGroup && (
        <CalculatorModal group={calcGroup} onClose={() => setCalcGroup(null)} />
      )}
      {calcService && (
        <ServiceCalculatorModal
          service={calcService}
          onClose={() => setCalcService(null)}
        />
      )}
    </>
  );
}
