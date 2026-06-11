import { buildNicheTemplate } from './premiumNicheTemplates';

type VisualPreset = 'fabrick-lava' | 'glass-rose' | 'luxury-soft' | 'mobile-app-premium' | 'booking-beauty' | 'neo-minimal' | 'editorial-dark';

type RawBlock = {
  type: 'custom';
  title: string;
  text: string;
  html: string;
  background: string;
  textColor: string;
  accent: string;
};

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function esc(value: unknown) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function arr(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value) && value.length) return value;
  }
  return [];
}

function presetType(value: unknown): VisualPreset {
  const preset = text(value, 'fabrick-lava') as VisualPreset;
  return ['fabrick-lava', 'glass-rose', 'luxury-soft', 'mobile-app-premium', 'booking-beauty', 'neo-minimal', 'editorial-dark'].includes(preset) ? preset : 'fabrick-lava';
}

function colors(preset: VisualPreset) {
  if (preset === 'booking-beauty') return { bg: '#28171d', text: '#fff8fb', accent: '#ff7db2', surface: '#fff4f7', dark: '#29141c' };
  if (preset === 'glass-rose') return { bg: '#1a1117', text: '#fff7fb', accent: '#f48fb1', surface: '#fff1f7', dark: '#241219' };
  if (preset === 'mobile-app-premium') return { bg: '#0d2443', text: '#f5f9ff', accent: '#6db4ff', surface: '#eff5ff', dark: '#091726' };
  if (preset === 'luxury-soft') return { bg: '#1b1510', text: '#fff8ef', accent: '#d6a85f', surface: '#f8f1e8', dark: '#1e1409' };
  if (preset === 'neo-minimal') return { bg: '#111214', text: '#ffffff', accent: '#cfd4dc', surface: '#f6f7f8', dark: '#151719' };
  if (preset === 'editorial-dark') return { bg: '#070707', text: '#f7f4ef', accent: '#c9a46a', surface: '#f4f1eb', dark: '#17120a' };
  return { bg: '#0d0a06', text: '#fff7e8', accent: '#f59e0b', surface: '#fff7e9', dark: '#17120a' };
}

type ColorSet = ReturnType<typeof colors>;

function css(c: ColorSet) {
  return `<style>.fab-json-commerce{font-family:Inter,system-ui,sans-serif;color:${c.text};padding:12px}.fab-json-commerce h1,.fab-json-commerce h2{font-size:clamp(34px,5vw,72px);line-height:.92;letter-spacing:-.07em;margin:0 0 16px}.fab-json-commerce p{line-height:1.7;color:rgba(255,255,255,.76)}.fab-json-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.fab-json-card{border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.06));backdrop-filter:blur(18px);border-radius:32px;padding:26px;box-shadow:0 24px 80px rgba(0,0,0,.20)}.fab-json-card.featured{background:${c.surface};color:${c.dark};transform:translateY(-8px)}.fab-json-badge{display:inline-flex;width:max-content;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.10);border-radius:999px;padding:8px 12px;font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.fab-json-price{font-size:38px;font-weight:1000;letter-spacing:-.06em;margin:14px 0}.fab-json-list{display:grid;gap:10px;margin-top:18px;padding:0;list-style:none}.fab-json-action{display:inline-flex;margin-top:22px;border-radius:999px;background:${c.accent};color:${c.dark};padding:14px 18px;font-weight:1000;text-decoration:none}.fab-json-stat strong{display:block;font-size:44px;letter-spacing:-.07em}.fab-json-hero{display:grid;grid-template-columns:1.1fr .9fr;gap:28px;align-items:center}.fab-json-panel,.fab-json-guarantee{border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.06));border-radius:34px;padding:34px;backdrop-filter:blur(18px)}.fab-json-orb{min-height:360px;border-radius:36px;background:radial-gradient(circle at 25% 20%,${c.accent},transparent 18rem),linear-gradient(135deg,rgba(255,255,255,.22),rgba(255,255,255,.04));box-shadow:0 30px 100px rgba(0,0,0,.25)}.fab-json-guarantee{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start}.fab-json-shield{width:58px;height:58px;border-radius:22px;background:${c.accent};color:${c.dark};display:grid;place-items:center;font-size:28px;font-weight:1000}@media(max-width:820px){.fab-json-grid,.fab-json-hero{grid-template-columns:1fr}.fab-json-card.featured{transform:none}.fab-json-guarantee{grid-template-columns:1fr}}</style>`;
}

function normalizeFeatureList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean).slice(0, 5);
  if (typeof value === 'string') return value.split(/[|,;]/).map((item) => item.trim()).filter(Boolean).slice(0, 5);
  return [];
}

function block(title: string, html: string, c: ColorSet): RawBlock {
  return { type: 'custom', title, text: '', html, background: c.bg, textColor: c.text, accent: c.accent };
}

function buildHero(source: Record<string, unknown>, c: ColorSet) {
  const hero = obj(source.hero);
  const headline = text(hero.headline ?? hero.title ?? source.headline ?? source.title, 'Landing premium por nicho');
  const subtitle = text(hero.subtitle ?? hero.text ?? source.description, 'Página comercial lista para vender con estructura profesional.');
  const cta = text(hero.cta ?? hero.buttonText, 'Solicitar propuesta');
  const href = text(hero.href, '/contacto');
  return `${css(c)}<section class="fab-json-commerce"><div class="fab-json-hero"><div class="fab-json-panel"><span class="fab-json-badge">Plantilla por nicho</span><h1>${esc(headline)}</h1><p>${esc(subtitle)}</p><a class="fab-json-action" href="${esc(href)}">${esc(cta)}</a></div><div class="fab-json-orb"></div></div></section>`;
}

function buildBenefits(source: Record<string, unknown>, c: ColorSet) {
  const benefits = arr(source, ['benefits', 'features', 'items']).map((item) => text(item)).filter(Boolean).slice(0, 6);
  if (!benefits.length) return '';
  const cards = benefits.map((benefit, index) => `<article class="fab-json-card"><span class="fab-json-badge">0${index + 1}</span><h3>${esc(benefit)}</h3><p>Beneficio clave preparado para explicar valor y aumentar intención de compra.</p></article>`).join('');
  return `${css(c)}<section class="fab-json-commerce"><span class="fab-json-badge">Beneficios</span><h2>Razones claras para elegirte</h2><div class="fab-json-grid">${cards}</div></section>`;
}

function buildPricing(source: Record<string, unknown>, c: ColorSet) {
  const rawPlans = arr(source, ['pricing', 'plans', 'packages', 'paquetes', 'planes']);
  if (!rawPlans.length) return '';
  const cards = rawPlans.slice(0, 4).map((item, index) => {
    const plan = obj(item);
    const name = text(plan.name ?? plan.title ?? plan.plan, ['Base', 'Pro', 'Premium', 'Empresa'][index]);
    const price = text(plan.price ?? plan.valor ?? plan.amount ?? plan.cost, index === 0 ? 'Desde $99.000' : 'A cotizar');
    const desc = text(plan.description ?? plan.text ?? plan.subtitle, 'Paquete diseñado para presentar valor con claridad y vender mejor.');
    const features = normalizeFeatureList(plan.features ?? plan.items ?? plan.benefits).map((feature) => `<li>${esc(feature)}</li>`).join('');
    return `<article class="fab-json-card ${index === 1 ? 'featured' : ''}"><span class="fab-json-badge">${index === 1 ? 'Más vendido' : 'Plan'}</span><h3>${esc(name)}</h3><div class="fab-json-price">${esc(price)}</div><p>${esc(desc)}</p><ul class="fab-json-list">${features}</ul><a class="fab-json-action" href="/contacto">Solicitar ${esc(name)}</a></article>`;
  }).join('');
  return `${css(c)}<section class="fab-json-commerce"><span class="fab-json-badge">Paquetes</span><h2>Opciones claras para comprar más rápido</h2><div class="fab-json-grid">${cards}</div></section>`;
}

function buildStats(source: Record<string, unknown>, c: ColorSet) {
  const rawStats = arr(source, ['stats', 'metrics', 'kpis', 'estadisticas', 'resultados']);
  if (!rawStats.length) return '';
  const cards = rawStats.slice(0, 4).map((item) => {
    const stat = obj(item);
    const value = text(stat.value ?? stat.number ?? stat.metric ?? stat.label ?? item, '+30%');
    const label = text(stat.label ?? stat.title ?? stat.text ?? stat.description, 'Indicador comercial');
    return `<article class="fab-json-card fab-json-stat"><strong>${esc(value)}</strong><p>${esc(label)}</p></article>`;
  }).join('');
  return `${css(c)}<section class="fab-json-commerce"><span class="fab-json-badge">Métricas</span><h2>Resultados que refuerzan la decisión</h2><div class="fab-json-grid">${cards}</div></section>`;
}

function buildTestimonials(source: Record<string, unknown>, c: ColorSet) {
  const rawTestimonials = arr(source, ['testimonials', 'reviews', 'opiniones', 'clientes', 'proof']);
  if (!rawTestimonials.length) return '';
  const cards = rawTestimonials.slice(0, 3).map((item, index) => {
    const review = obj(item);
    const quote = text(review.quote ?? review.text ?? review.comment ?? item, 'Excelente experiencia y presentación muy profesional.');
    const name = text(review.name ?? review.author ?? review.client, `Cliente ${index + 1}`);
    return `<article class="fab-json-card"><q>${esc(quote)}</q><p><strong>${esc(name)}</strong><br/>Validación comercial</p></article>`;
  }).join('');
  return `${css(c)}<section class="fab-json-commerce"><span class="fab-json-badge">Prueba social</span><h2>Confianza antes de comprar</h2><div class="fab-json-grid">${cards}</div></section>`;
}

function buildGuarantee(source: Record<string, unknown>, c: ColorSet) {
  const guarantee = source.guarantee ?? source.garantia ?? source.warranty ?? source.support;
  if (!guarantee) return '';
  const guaranteeObj = obj(guarantee);
  const title = text(guaranteeObj.title ?? guaranteeObj.name, 'Compra con seguridad y respaldo');
  const description = text(guaranteeObj.description ?? guaranteeObj.text ?? guarantee, 'Incluye acompañamiento, revisión de detalles y soporte posterior para que la propuesta funcione como herramienta comercial.');
  return `${css(c)}<section class="fab-json-commerce"><div class="fab-json-guarantee"><div class="fab-json-shield">✓</div><div><span class="fab-json-badge">Garantía</span><h2>${esc(title)}</h2><p>${esc(description)}</p><a class="fab-json-action" href="/contacto">Solicitar respaldo</a></div></div></section>`;
}

function sourceWithNiche(raw: unknown) {
  const source = obj(raw);
  const niche = source.niche ?? source.industry ?? source.rubro ?? source.tipo;
  const template = buildNicheTemplate(niche, source);
  return obj(template || source);
}

export function buildCommercialBlocksFromJson(raw: unknown): RawBlock[] {
  const source = sourceWithNiche(raw);
  const hasNiche = Boolean(source.niche || source.industry || source.rubro || source.tipo) || Boolean(buildNicheTemplate(obj(raw).niche ?? obj(raw).industry ?? obj(raw).rubro ?? obj(raw).tipo, obj(raw)));
  const preset = presetType(source.visualPreset ?? source.preset ?? source.template);
  const c = colors(preset);
  const htmlBlocks = [
    hasNiche ? { title: 'Hero por nicho', html: buildHero(source, c) } : null,
    hasNiche ? { title: 'Beneficios por nicho', html: buildBenefits(source, c) } : null,
    { title: 'Paquetes comerciales', html: buildPricing(source, c) },
    { title: 'Métricas comerciales', html: buildStats(source, c) },
    { title: 'Testimonios', html: buildTestimonials(source, c) },
    { title: 'Garantía', html: buildGuarantee(source, c) },
  ].filter((item): item is { title: string; html: string } => Boolean(item && item.html));
  return htmlBlocks.map((item) => block(item.title, item.html, c));
}
