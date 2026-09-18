export type MaterialInfo = {
  id: string;
  name: string;
  category: string;
  locations: string[];
  dimensions?: string;
  thickness?: string;
  use: string;
  reason: string;
  stage: string;
  source?: string;
};

export const materialCatalog: MaterialInfo[] = [
  {
    id: "cesped-pbr",
    name: "Césped natural PBR · Grass001",
    category: "Paisajismo / terreno",
    locations: ["Jardín", "Perímetro exterior", "Entorno de terraza"],
    dimensions: "Textura de referencia ≈ 1,4 × 1,4 m por tile",
    use: "Representación visual del césped y lectura de escala del entorno.",
    reason: "La escala física y los mapas BaseColor, Normal GL y Roughness reducen repetición artificial y evitan el aspecto plano del terreno.",
    stage: "Paisajismo",
    source: "https://ambientcg.com/view?id=Grass001"
  },
  {
    id: "gaea-terrain",
    name: "Terreno digital Gaea",
    category: "Topografía visual",
    locations: ["Implantación", "Jardín", "Accesos"],
    dimensions: "Extensión y altura según heightfield exportado",
    use: "Representar desniveles, pendientes y máscaras de superficie en el recorrido.",
    reason: "Permite separar forma del terreno de sus materiales y exportar height, normal, AO y splat maps hacia Blender/Three.js.",
    stage: "Terreno / implantación"
  },
  {
    id: "volcanita-st",
    name: "Yeso cartón ST",
    category: "Terminación interior",
    locations: ["Living", "Comedor", "Dormitorio principal", "Dormitorio 2", "Pasillos"],
    dimensions: "1,20 × 2,40 m (formato comercial de referencia)",
    thickness: "10–15 mm según solución",
    use: "Muros interiores y cielos secos.",
    reason: "Entrega una superficie lisa, liviana y rápida de terminar en tabiquería seca.",
    stage: "Cerramientos interiores",
    source: "https://volcan.cl/volcanita/"
  },
  {
    id: "volcanita-rh",
    name: "Yeso cartón RH",
    category: "Terminación interior húmeda",
    locations: ["Baño principal", "Baño dormitorio 2", "Baño de visitas", "Logia"],
    dimensions: "1,20 × 2,40 m (referencial)",
    thickness: "12,5–15 mm según solución",
    use: "Revestimiento interior en recintos con exposición a humedad.",
    reason: "La variante RH está concebida para zonas donde una placa estándar no es la elección adecuada.",
    stage: "Cerramientos interiores",
    source: "https://volcan.cl/volcanita/"
  },
  {
    id: "siding-fibrocemento",
    name: "Siding fibrocemento",
    category: "Revestimiento exterior",
    locations: ["Fachadas", "Accesos", "Terraza"],
    dimensions: "190 × 3660 mm (referencia comercial)",
    thickness: "6 mm",
    use: "Terminación exterior traslapada.",
    reason: "Aporta una piel exterior durable y de bajo mantenimiento con lectura tipo madera.",
    stage: "Revestimiento exterior",
    source: "https://www.dimaco.cl/siding_cedral_natural_190x3660x6mm/p"
  },
  {
    id: "osb-estructural",
    name: "OSB estructural",
    category: "Placa estructural",
    locations: ["Muros exteriores", "Techumbre"],
    dimensions: "Panel modular; confirmar formato del proveedor seleccionado",
    thickness: "Según cálculo y especificación",
    use: "Arriostramiento y soporte de capas exteriores.",
    reason: "Forma un diafragma continuo sobre el entramado y sirve de base a membranas y revestimientos.",
    stage: "Estructura / envolvente"
  },
  {
    id: "metalcon",
    name: "Perfil galvanizado Metalcon",
    category: "Estructura liviana",
    locations: ["Muros", "Dinteles", "Techumbre"],
    dimensions: "Sección y largo según cálculo",
    thickness: "Según ingeniería",
    use: "Montantes, canales, dinteles y cerchas.",
    reason: "Permite construir un entramado liviano, repetible y compatible con placas y aislación.",
    stage: "Estructura"
  },
  {
    id: "pvc-110",
    name: "PVC sanitario Ø110",
    category: "Sanitaria",
    locations: ["Descarga WC", "Colector principal", "Salida sanitaria"],
    dimensions: "Ø110 mm; largos comerciales variables",
    use: "Colector y descargas sanitarias principales donde corresponda al proyecto.",
    reason: "Diámetro comercial habitual para trazados sanitarios principales representados en el visor.",
    stage: "Instalaciones",
    source: "https://www.sodimac.cl/sodimac-cl/articulo/133385865/Tubo-PVC-U-ALC-gris-110mm-1-mt/133385867"
  },
  {
    id: "porcelanato",
    name: "Porcelanato / cerámica",
    category: "Terminación",
    locations: ["Cocina", "Baños", "Acceso"],
    dimensions: "Formato variable según terminación",
    use: "Pisos y muros de zonas de uso intenso o húmedas.",
    reason: "Entrega una superficie lavable, resistente y visualmente continua.",
    stage: "Terminaciones"
  },
  {
    id: "cubierta-metalica",
    name: "Cubierta metálica",
    category: "Techumbre",
    locations: ["Cubierta"],
    dimensions: "Módulo y espesor según fabricante",
    use: "Protección superior de la vivienda.",
    reason: "Evacúa lluvia y conforma la terminación exterior de la techumbre.",
    stage: "Techumbre"
  },
  {
    id: "hormigon",
    name: "Hormigón",
    category: "Base",
    locations: ["Radier", "Accesos", "Terraza"],
    dimensions: "Espesor según cálculo/proyecto",
    use: "Base rígida de apoyo y pavimento.",
    reason: "Distribuye cargas y entrega una plataforma durable para la vivienda.",
    stage: "Fundación / radier"
  }
];

export const materialById = Object.fromEntries(materialCatalog.map((item) => [item.id, item])) as Record<string, MaterialInfo>;
