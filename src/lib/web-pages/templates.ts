export type WebPageTemplate = {
  niche: string;
  label: string;
  html: string;
  css: string;
  js?: string;
};

export const nicheOptions = [
  { value: 'general', label: 'General / Landing' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'radier', label: 'Radier' },
  { value: 'aire-acondicionado', label: 'Aire acondicionado' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'servicios', label: 'Servicios locales' },
];

export function slugify(value: string) {
  return String(value || 'pagina-fabrick')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'pagina-fabrick';
}

const baseCss = `
*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:#070707;color:#fff;overflow-x:hidden}a{color:inherit;text-decoration:none}.wrap{max-width:1120px;margin:0 auto;padding:0 20px}.hero{padding:92px 0;background:radial-gradient(circle at 20% 0%,rgba(245,158,11,.24),transparent 32rem),linear-gradient(135deg,#080808,#14100a)}.badge{display:inline-flex;border:1px solid rgba(245,158,11,.35);background:rgba(245,158,11,.12);color:#fbbf24;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.hero h1{font-size:clamp(38px,8vw,82px);line-height:.94;margin:20px 0 16px;letter-spacing:-.06em}.hero p{max-width:720px;color:#d6d3d1;font-size:clamp(17px,2.4vw,22px);line-height:1.7}.btns{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.btn{border-radius:18px;padding:15px 20px;font-weight:900}.btn.primary{background:#f59e0b;color:#111}.btn.dark{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06)}.section{padding:70px 0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card{border:1px solid rgba(255,255,255,.11);background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border-radius:26px;padding:24px}.card span{color:#fbbf24;font-size:12px;font-weight:900}.card h2{font-size:24px;margin:10px 0}.card p{color:#c8c3bb;line-height:1.7}.contact{border-top:1px solid rgba(255,255,255,.1);background:#0c0a07;padding:60px 0}.contact .box{border:1px solid rgba(245,158,11,.25);background:rgba(245,158,11,.08);border-radius:30px;padding:30px}@media(max-width:800px){.grid{grid-template-columns:1fr}.hero{padding:62px 0}.section{padding:46px 0}.btns{flex-direction:column}.btn{text-align:center;width:100%}}
`;

function landing(title: string, subtitle: string, niche: string): WebPageTemplate {
  return {
    niche,
    label: title,
    css: baseCss,
    js: '',
    html: `<main><section class="hero"><div class="wrap"><div class="badge">Soluciones Fabrick · ${niche}</div><h1>${title}</h1><p>${subtitle}</p><div class="btns"><a class="btn primary" href="#contacto">Pedir evaluación</a><a class="btn dark" href="#beneficios">Ver beneficios</a></div></div></section><section class="section" id="beneficios"><div class="wrap grid"><article class="card"><span>01</span><h2>Diagnóstico rápido</h2><p>Levantamos la necesidad, medidas, fotos y prioridad comercial para preparar una propuesta clara.</p></article><article class="card"><span>02</span><h2>Propuesta visual</h2><p>Presentamos alternativas, beneficios y orden de implementación con un enlace profesional compartible.</p></article><article class="card"><span>03</span><h2>Cierre asistido</h2><p>Incluye contacto directo, seguimiento y registro de solicitudes para convertir visitas en clientes reales.</p></article></div></section><section class="contact" id="contacto"><div class="wrap"><div class="box"><h2>Agenda una revisión</h2><p>Comparte esta página con el cliente o úsala como landing de captación.</p><div class="btns"><a class="btn primary" href="https://wa.me/56900000000">Contactar por WhatsApp</a></div></div></div></section></main>`,
  };
}

export const WEB_PAGE_TEMPLATES: WebPageTemplate[] = [
  landing('Landing comercial lista para vender', 'Página editable para validar una oferta, captar clientes y compartir un enlace profesional.', 'general'),
  landing('Presupuesto de construcción con propuesta visual', 'Ideal para radieres, ampliaciones, muebles, servicios técnicos y obras rápidas.', 'construccion'),
  landing('Calculadora y propuesta de radier', 'Muestra medidas, cubicación, proceso, garantías y llamada directa a cotizar.', 'radier'),
  landing('Página para aire acondicionado', 'Landing para evaluar espacio, comunicar beneficios y tomar solicitudes por WhatsApp.', 'aire-acondicionado'),
  landing('Carta y reservas para restaurante', 'Página rápida para menú, promociones, reservas y captación local.', 'restaurante'),
  landing('Hotel y experiencia turística', 'Página para destacar habitaciones, servicios, ubicación y eventos especiales.', 'hotel'),
  landing('Servicios profesionales locales', 'Página de captación para negocios que necesitan presencia online inmediata.', 'servicios'),
];

export function getTemplateByNiche(niche?: string) {
  return WEB_PAGE_TEMPLATES.find((tpl) => tpl.niche === niche) ?? WEB_PAGE_TEMPLATES[0];
}

export function createStarterTemplate(niche: string, title: string, clientName?: string) {
  const template = getTemplateByNiche(niche);
  const client = clientName ? ` para ${clientName}` : '';
  return {
    html: template.html.replace(template.label, title).replace('Agenda una revisión', `Agenda una revisión${client}`),
    css: template.css,
    js: template.js || '',
  };
}
