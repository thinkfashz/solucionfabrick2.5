/* Starter catalog for Soluciones Fabrick.
 * Idempotent by SKU/source_id and intentionally INSERT-ONLY: admin edits are never overwritten.
 *
 * IMPORTANT: production uses products.category_id as a UUID/FK. Human category labels therefore
 * live in category_name; never write labels such as "Cemento" into category_id.
 */
const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.warn('[store-seed] InsForge env not present; skipping.');
  process.exit(0);
}

const endpoint = `${baseUrl.replace(/\/$/, '')}/api/database/advance/rawsql/unrestricted`;
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const CONSTRUCTION = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1000&auto=format&fit=crop';
const LIGHTING = 'https://images.unsplash.com/photo-1565814329452-e1efa11c5e8a?q=80&w=1000&auto=format&fit=crop';

const products = [
  { sku: 'FAB-CEM-025', name: 'Cemento Especial 25 kg', category: 'Cemento', price: 5600, stock: 120, featured: true, image: CONSTRUCTION, tagline: 'Base sólida para grandes ideas.', description: 'Cemento de uso general para hormigones, morteros y trabajos de radier. Valor inicial referencial editable desde administración.', specs: { peso: '25 kg', uso: 'Radier, hormigón y mortero', pricing: 'referencial', merchandising: { placement: 'best_seller', order: 1 } } },
  { sku: 'FAB-ACMA-C92', name: 'Malla ACMA C-92 2,4 × 6 m', category: 'Radier', price: 24990, stock: 28, featured: true, image: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788934498/malla-acma.png`, tagline: 'Refuerzo para radier y losas.', description: 'Malla electrosoldada para reforzar radieres y soluciones de hormigón.', specs: { medidas: '2,4 × 6 m', uso: 'Refuerzo de losas y radier', pricing: 'referencial', merchandising: { placement: 'best_seller', order: 2 } } },
  { sku: 'FAB-GRAV-025', name: 'Gravilla 3/4 · saco 25 kg', category: 'Radier', price: 4990, stock: 80, featured: true, image: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788934539/gravilla.png`, tagline: 'Drenaje y base para hormigón.', description: 'Árido para capas drenantes y preparación de mezclas.', specs: { peso: '25 kg', uso: 'Radier y hormigón', pricing: 'referencial', merchandising: { placement: 'featured', order: 3 } } },
  { sku: 'FAB-BASE-025', name: 'Base estabilizada · saco 25 kg', category: 'Radier', price: 4490, stock: 70, image: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788934560/base-compactada.png`, tagline: 'Soporte firme antes del hormigón.', description: 'Material de base para nivelación y compactación previa al radier.', specs: { peso: '25 kg', uso: 'Base compactada', pricing: 'referencial' } },
  { sku: 'FAB-BARR-200', name: 'Barrera de humedad 200 micras', category: 'Radier', price: 18990, stock: 35, featured: true, image: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788934517/barrera-humedad.png`, tagline: 'Protección entre terreno y losa.', description: 'Polietileno para controlar el paso de humedad bajo la losa.', specs: { espesor: '200 micras', uso: 'Barrera bajo radier', pricing: 'referencial', merchandising: { placement: 'featured', order: 4 } } },
  { sku: 'FAB-MOLD-14', name: 'Tabla pino para moldaje 1 × 4 · 3,2 m', category: 'Radier', price: 6290, stock: 65, image: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788934828/moldaje-madera.png`, tagline: 'Define el perímetro del radier.', description: 'Tabla referencial para confección de moldajes en obras menores.', specs: { medidas: '1 × 4 · 3,2 m', uso: 'Moldaje', pricing: 'referencial' } },
  { sku: 'FAB-EST-043', name: 'Estacas de madera 43 cm · pack 10', category: 'Radier', price: 5990, stock: 55, image: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788934828/moldaje-madera.png`, tagline: 'Sujeción para moldaje y nivel.', description: 'Pack de estacas de 43 cm para fijación de moldajes y líneas de referencia.', specs: { largo: '43 cm', contenido: '10 unidades', pricing: 'referencial' } },
  { sku: 'FAB-ADIT-1L', name: 'Aditivo impermeabilizante para hormigón 1 L', category: 'Radier', price: 10990, stock: 32, image: CONSTRUCTION, tagline: 'Apoyo para mezclas expuestas a humedad.', description: 'Aditivo líquido de referencia para hormigón y mortero según dosificación del fabricante.', specs: { contenido: '1 L', uso: 'Hormigón y mortero', pricing: 'referencial' } },
  { sku: 'FAB-LLANA-01', name: 'Llana metálica para terminación de hormigón', category: 'Herramientas', price: 14990, stock: 18, image: CONSTRUCTION, tagline: 'Terminación pareja en obra.', description: 'Herramienta manual para afinado y terminación superficial.', specs: { uso: 'Terminación de radier', pricing: 'referencial' } },
  { sku: 'FAB-LASER-01', name: 'Nivel láser cruzado compacto', category: 'Herramientas', price: 59990, stock: 10, image: CONSTRUCTION, tagline: 'Nivela antes de hormigonar.', description: 'Nivel láser compacto para trazado y control de cotas en obra.', specs: { uso: 'Trazado y nivelación', pricing: 'referencial' } },
  { sku: 'FAB-AIR-09K', name: 'Aire Acondicionado Inverter 9.000 BTU', category: 'Climatización', price: 299990, stock: 8, featured: true, image: `${CLOUD}/f_png/q_auto:best/v1788676759/air-9k-universal-v8.png`, tagline: 'Confort eficiente para espacios compactos.', description: 'Equipo inverter de 9.000 BTU. Confirma compatibilidad con la calculadora antes de comprar.', specs: { btu: 9000, tecnologia: 'Inverter', pricing: 'referencial', merchandising: { placement: 'featured', order: 5 } } },
  { sku: 'FAB-AIR-12K', name: 'Aire Acondicionado Inverter 12.000 BTU', category: 'Climatización', price: 349990, stock: 12, featured: true, image: `${CLOUD}/f_png/q_auto:best/v1788676769/air-12k-universal-v8.png`, tagline: 'Equilibrio entre capacidad y consumo.', description: 'Equipo inverter de 12.000 BTU para espacios de carga térmica media.', specs: { btu: 12000, tecnologia: 'Inverter', pricing: 'referencial', merchandising: { placement: 'best_seller', order: 6 } } },
  { sku: 'FAB-AIR-18K', name: 'Aire Acondicionado Inverter 18.000 BTU', category: 'Climatización', price: 449990, stock: 7, image: `${CLOUD}/f_auto/q_auto:best/v1788674152/air-18k-v7.png`, tagline: 'Mayor capacidad para espacios amplios.', description: 'Equipo inverter de 18.000 BTU. Usa la calculadora BTU para validar capacidad.', specs: { btu: 18000, tecnologia: 'Inverter', pricing: 'referencial' } },
  { sku: 'FAB-AIR-24K', name: 'Aire Acondicionado Inverter 24.000 BTU', category: 'Climatización', price: 559990, stock: 5, image: `${CLOUD}/f_auto/q_auto:best/v1788674161/air-24k-v7.png`, tagline: 'Potencia para grandes ambientes.', description: 'Equipo inverter de 24.000 BTU para proyectos de mayor demanda térmica.', specs: { btu: 24000, tecnologia: 'Inverter', pricing: 'referencial' } },
  { sku: 'FAB-INST-5M', name: 'Kit de instalación Split · hasta 5 m', category: 'Climatización', price: 74990, stock: 20, image: CONSTRUCTION, tagline: 'Complementa la instalación del equipo.', description: 'Kit referencial de tuberías, aislación, cableado y drenaje para instalación estándar.', specs: { alcance: 'Hasta 5 m', pricing: 'referencial' } },
  { sku: 'FAB-SOP-AIR', name: 'Soporte mural para unidad exterior', category: 'Climatización', price: 24990, stock: 26, image: CONSTRUCTION, tagline: 'Base firme para la condensadora.', description: 'Par de soportes metálicos para montaje mural de unidad exterior.', specs: { uso: 'Unidad exterior', pricing: 'referencial' } },
  { sku: 'FAB-THHN-25', name: 'Cable eléctrico THHN 2,5 mm · 100 m', category: 'Electricidad', price: 39990, stock: 16, image: CONSTRUCTION, tagline: 'Conductor para instalaciones domiciliarias.', description: 'Rollo de cable THHN 2,5 mm para canalizaciones y circuitos compatibles con su sección.', specs: { seccion: '2,5 mm²', largo: '100 m', pricing: 'referencial' } },
  { sku: 'FAB-LED-IP65', name: 'Foco LED exterior 50 W IP65', category: 'Iluminación', price: 22990, stock: 24, featured: true, image: LIGHTING, tagline: 'Ilumina exteriores con bajo consumo.', description: 'Foco LED para patios, fachadas y áreas exteriores protegidas.', specs: { potencia: '50 W', proteccion: 'IP65', pricing: 'referencial', merchandising: { placement: 'featured', order: 7 } } },
  { sku: 'FAB-LUX-PEND', name: 'Lámpara colgante LED premium', category: 'Iluminación', price: 129990, stock: 8, featured: true, image: LIGHTING, tagline: 'Una pieza de luz para living y comedor.', description: 'Lámpara decorativa colgante de estilo contemporáneo para proyectos residenciales.', specs: { uso: 'Living / comedor', tecnologia: 'LED', pricing: 'referencial', merchandising: { placement: 'best_seller', order: 8 } } },
  { sku: 'FAB-LUX-PLAF', name: 'Plafón LED slim premium', category: 'Iluminación', price: 69990, stock: 14, image: LIGHTING, tagline: 'Luz limpia para espacios modernos.', description: 'Plafón LED de perfil delgado para dormitorios, pasillos y espacios contemporáneos.', specs: { uso: 'Interior', tecnologia: 'LED', pricing: 'referencial' } },
];

function sqlText(value) { return `'${String(value).replace(/'/g, "''")}'`; }
function sqlJson(value) { return `${sqlText(JSON.stringify(value))}::jsonb`; }
function sqlBool(value) { return value ? 'true' : 'false'; }

const statements = products.map((product, index) => {
  const sourceId = `store-seed-v1-${String(index + 1).padStart(2, '0')}`;
  const specifications = {
    ...product.specs,
    category: product.category,
    seed: { origin: 'fabrick_store_seed_v1', editable: true, initialPriceOnly: true },
  };
  return `
INSERT INTO public.products (
  name, description, tagline, price, stock, image_url, category_name, featured, activo,
  rating, discount_percentage, specifications, shipping_mode, source, source_id, sku, tenant_id, created_at, updated_at
)
SELECT
  ${sqlText(product.name)}, ${sqlText(product.description)}, ${sqlText(product.tagline)}, ${product.price}, ${product.stock},
  ${sqlText(product.image)}, ${sqlText(product.category)}, ${sqlBool(product.featured)}, true,
  4.8, 0, ${sqlJson(specifications)}, 'inherit', 'fabrick_seed', ${sqlText(sourceId)},
  ${sqlText(product.sku)}, '${DEFAULT_TENANT}'::uuid, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.products p
  WHERE p.tenant_id = '${DEFAULT_TENANT}'::uuid
    AND (lower(trim(COALESCE(p.sku, ''))) = lower(${sqlText(product.sku)}) OR p.source_id = ${sqlText(sourceId)})
);`;
});

async function runSql(query) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`[store-seed] HTTP ${response.status}: ${body.slice(0, 1500)}`);
}

try {
  await runSql(`
DO $$ BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION 'products table is missing';
  END IF;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_name text;
END $$;
${statements.join('\n')}`);
  console.log(`[store-seed] ${products.length} starter products checked; existing/admin-edited rows were preserved.`);
} catch (error) {
  console.error('[store-seed] failed:', error);
  process.exit(1);
}
