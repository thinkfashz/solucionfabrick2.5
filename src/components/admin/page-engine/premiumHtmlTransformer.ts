type VisualPreset = 'fabrick-lava' | 'glass-rose' | 'luxury-soft' | 'mobile-app-premium' | 'booking-beauty' | 'neo-minimal' | 'editorial-dark';
type BlockType = 'hero' | 'cards' | 'split' | 'cta' | 'calculator' | 'custom';

type Block = {
  id?: string;
  type: BlockType;
  title: string;
  text: string;
  background?: string;
  textColor?: string;
  accent?: string;
  html?: string;
  image?: string;
  buttonText?: string;
  buttonHref?: string;
};

type PremiumPageJson = {
  title: string;
  visualPreset: VisualPreset;
  device: 'desktop';
  blocks: Block[];
};

type Colors = ReturnType<typeof presetColors>;

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').replace(/&nbsp;/gi, ' ').trim();
}

function stripTags(value: string) {
  return cleanText(value.replace(/<[^>]+>/g, ' '));
}

function safeHtml(value: string) {
  let html = value || '';
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  html = html.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
  html = html.replace(/<embed\b[^>]*>/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  html = html.replace(/javascript:/gi, '');
  return html;
}

function matchFirst(html: string, re: RegExp) {
  return cleanText((html.match(re)?.[1] || '').replace(/<[^>]+>/g, ' '));
}

function matchAll(html: string, re: RegExp, limit = 12) {
  return [...html.matchAll(re)].map((m) => stripTags(m[1] || '')).filter(Boolean).slice(0, limit);
}

function extractLinks(html: string) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ href: cleanText(m[1] || ''), label: stripTags(m[2] || '') }))
    .filter((item) => item.href && item.label && !/^javascript:/i.test(item.href))
    .slice(0, 4);
}

function extractFirstImage(html: string) {
  const src = html.match(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/i)?.[1];
  return src && !/^javascript:/i.test(src) ? src : '';
}

function inferPreset(text: string): VisualPreset {
  const lower = text.toLowerCase();
  if (/beauty|nail|spa|sal[oó]n|reserva|booking|agenda|maquillaje|est[eé]tica|peluquer/i.test(lower)) return 'booking-beauty';
  if (/app|mobile|dashboard|saas|fintech|software|plataforma|wallet|crypto|control/i.test(lower)) return 'mobile-app-premium';
  if (/rose|pink|rosa|glass|cristal|delicado|femenino/i.test(lower)) return 'glass-rose';
  if (/luxury|premium|hotel|boutique|elegante|lujo|ivory|beige/i.test(lower)) return 'luxury-soft';
  if (/editorial|magazine|portfolio|autor|historia|ensayo/i.test(lower)) return 'editorial-dark';
  if (/minimal|simple|limpio|clean|studio/i.test(lower)) return 'neo-minimal';
  return 'fabrick-lava';
}

function presetColors(preset: VisualPreset) {
  if (preset === 'booking-beauty') return { bg: '#28171d', text: '#fff8fb', accent: '#ff7db2', surface: '#fff4f7', dark: '#29141c' };
  if (preset === 'glass-rose') return { bg: '#1a1117', text: '#fff7fb', accent: '#f48fb1', surface: '#fff1f7', dark: '#241219' };
  if (preset === 'mobile-app-premium') return { bg: '#0d2443', text: '#f5f9ff', accent: '#6db4ff', surface: '#eff5ff', dark: '#091726' };
  if (preset === 'luxury-soft') return { bg: '#1b1510', text: '#fff8ef', accent: '#d6a85f', surface: '#f8f1e8', dark: '#1e1409' };
  if (preset === 'neo-minimal') return { bg: '#111214', text: '#ffffff', accent: '#cfd4dc', surface: '#f6f7f8', dark: '#151719' };
  if (preset === 'editorial-dark') return { bg: '#070707', text: '#f7f4ef', accent: '#c9a46a', surface: '#f4f1eb', dark: '#17120a' };
  return { bg: '#0d0a06', text: '#fff7e8', accent: '#f59e0b', surface: '#fff7e9', dark: '#17120a' };
}

function needsShowcase(text: string, preset: VisualPreset) {
  return preset === 'booking-beauty' || preset === 'mobile-app-premium' || /app|reserva|booking|agenda|dashboard|software|plataforma|premium|demo|panel|m[oó]vil/i.test(text);
}

function extractPrices(text: string) {
  const matches = text.match(/(?:\$|CLP\s*)\s?[0-9]{1,3}(?:[\.,][0-9]{3})*(?:\s?CLP)?|[0-9]{1,3}(?:[\.,][0-9]{3})+\s?(?:pesos|clp)/gi) || [];
  return [...new Set(matches.map(cleanText))].slice(0, 4);
}

function extractStats(text: string) {
  const matches = text.match(/(?:\+?\d{1,4}%|\+?\d{1,5}\s?(?:clientes|ventas|leads|reservas|proyectos|horas|d[ií]as|años|usuarios))/gi) || [];
  return [...new Set(matches.map(cleanText))].slice(0, 4);
}

function extractTestimonials(html: string) {
  const quotes = [...html.matchAll(/[“"]([^“”"]{28,180})[”"]/g)].map((m) => cleanText(m[1] || '')).filter(Boolean);
  const blockquotes = matchAll(html, /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, 4);
  return [...new Set([...blockquotes, ...quotes])].slice(0, 3);
}

function inferPlanNames(text: string) {
  const names = ['Básico', 'Starter', 'Inicial', 'Pro', 'Profesional', 'Premium', 'Empresa', 'Full', 'Avanzado'];
  const found = names.filter((name) => new RegExp(`\\b${name}\\b`, 'i').test(text));
  return found.length ? found.slice(0, 3) : ['Base', 'Pro', 'Premium'];
}

function hasGuarantee(text: string) {
  return /garant[ií]a|garantizado|devoluci[oó]n|soporte|acompañamiento|postventa|seguridad|confianza/i.test(text);
}

function commercialCss(colors: Colors) {
  return `<style>
.fab-commercial{font-family:Inter,system-ui,sans-serif;color:${colors.text};padding:12px}.fab-commercial h2{font-size:clamp(34px,5vw,70px);line-height:.92;letter-spacing:-.07em;margin:0 0 16px}.fab-commercial p{line-height:1.7;color:rgba(255,255,255,.76)}.fab-section-head{display:grid;gap:10px;margin-bottom:26px}.fab-badge{display:inline-flex;width:max-content;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.10);border-radius:999px;padding:8px 12px;font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.fab-pricing-grid,.fab-proof-grid,.fab-stats-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.fab-price-card,.fab-proof-card,.fab-stat-card,.fab-guarantee{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.06));backdrop-filter:blur(18px);border-radius:32px;padding:26px;box-shadow:0 24px 80px rgba(0,0,0,.20)}.fab-price-card.featured{background:${colors.surface};color:${colors.dark};transform:translateY(-8px)}.fab-price{font-size:38px;font-weight:1000;letter-spacing:-.06em;margin:14px 0}.fab-features{display:grid;gap:10px;margin-top:18px;padding:0;list-style:none}.fab-features li{border-top:1px solid rgba(0,0,0,.08);padding-top:10px}.fab-action{display:inline-flex;margin-top:22px;border-radius:999px;background:${colors.accent};color:${colors.dark};padding:14px 18px;font-weight:1000;text-decoration:none}.fab-stat-card strong{display:block;font-size:44px;letter-spacing:-.07em}.fab-proof-card q{font-size:18px;line-height:1.65}.fab-guarantee{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start}.fab-shield{width:58px;height:58px;border-radius:22px;background:${colors.accent};color:${colors.dark};display:grid;place-items:center;font-size:28px;font-weight:1000}@media(max-width:820px){.fab-pricing-grid,.fab-proof-grid,.fab-stats-grid{grid-template-columns:1fr}.fab-price-card.featured{transform:none}.fab-guarantee{grid-template-columns:1fr}}
</style>`;
}

function buildPricingHtml(args: { prices: string[]; planNames: string[]; benefits: string[]; ctaLabel: string; colors: Colors }) {
  const prices = args.prices.length ? args.prices : ['Desde $99.000', '$199.000', '$399.000'];
  const cards = prices.slice(0, 3).map((price, index) => {
    const name = args.planNames[index] || ['Base', 'Pro', 'Premium'][index];
    const features = (args.benefits.length ? args.benefits : ['Diseño premium', 'Publicación privada', 'Soporte comercial']).slice(0, 3).map((b) => `<li>${b}</li>`).join('');
    return `<article class="fab-price-card ${index === 1 ? 'featured' : ''}"><span class="fab-badge">${index === 1 ? 'Más vendido' : 'Plan'}</span><h3>${name}</h3><div class="fab-price">${price}</div><p>Paquete preparado para vender con claridad y aumentar conversión.</p><ul class="fab-features">${features}</ul><a class="fab-action" href="/contacto">${args.ctaLabel}</a></article>`;
  }).join('');
  return `${commercialCss(args.colors)}<section class="fab-commercial"><div class="fab-section-head"><span class="fab-badge">Paquetes comerciales</span><h2>Elige una opción clara y fácil de comprar</h2><p>Planes presentados con jerarquía visual, beneficio directo y llamado a la acción.</p></div><div class="fab-pricing-grid">${cards}</div></section>`;
}

function buildStatsHtml(args: { stats: string[]; colors: Colors }) {
  const stats = (args.stats.length ? args.stats : ['+30% conversión', '+100 leads', '7 días']).slice(0, 4);
  const cards = stats.map((stat) => `<article class="fab-stat-card"><strong>${stat}</strong><p>Indicador comercial destacado para reforzar decisión y confianza.</p></article>`).join('');
  return `${commercialCss(args.colors)}<section class="fab-commercial"><div class="fab-section-head"><span class="fab-badge">Métricas</span><h2>Resultados que hacen más fácil decidir</h2></div><div class="fab-stats-grid">${cards}</div></section>`;
}

function buildTestimonialsHtml(args: { testimonials: string[]; colors: Colors }) {
  const testimonials = (args.testimonials.length ? args.testimonials : ['Excelente experiencia, presentación clara y respuesta rápida.', 'La propuesta se entiende mejor y se ve mucho más profesional.']).slice(0, 3);
  const cards = testimonials.map((quote, index) => `<article class="fab-proof-card"><q>${quote}</q><p><strong>Cliente ${index + 1}</strong><br/>Validación comercial</p></article>`).join('');
  return `${commercialCss(args.colors)}<section class="fab-commercial"><div class="fab-section-head"><span class="fab-badge">Prueba social</span><h2>Confianza antes de comprar</h2></div><div class="fab-proof-grid">${cards}</div></section>`;
}

function buildGuaranteeHtml(args: { colors: Colors }) {
  return `${commercialCss(args.colors)}<section class="fab-commercial"><div class="fab-guarantee"><div class="fab-shield">✓</div><div><span class="fab-badge">Garantía</span><h2>Compra con seguridad y respaldo</h2><p>Incluye acompañamiento, revisión de detalles y soporte posterior para que la propuesta no quede solo como una página bonita, sino como una herramienta comercial funcional.</p><a class="fab-action" href="/contacto">Solicitar respaldo</a></div></div></section>`;
}

function buildShowcaseHtml(args: { preset: VisualPreset; title: string; subtitle: string; benefits: string[]; ctaLabel: string; image: string; colors: Colors }) {
  const isBeauty = args.preset === 'booking-beauty' || args.preset === 'glass-rose';
  const isApp = args.preset === 'mobile-app-premium';
  const label = isBeauty ? 'Booking experience' : isApp ? 'App showcase' : 'Premium system';
  const screenTitle = isBeauty ? 'Reserva premium' : isApp ? 'Panel inteligente' : 'Propuesta visual';
  const imageTag = args.image ? `<div class="fab-img" style="background-image:url('${args.image}')"></div>` : '';
  const chips = args.benefits.slice(0, 4).map((b) => `<span>${b}</span>`).join('');
  return `<style>
.fab-showcase{font-family:Inter,system-ui,sans-serif;color:${args.colors.text};padding:12px}.fab-showcase-grid{display:grid;grid-template-columns:1fr .86fr;gap:28px;align-items:center}.fab-glass{border:1px solid rgba(255,255,255,.18);background:linear-gradient(180deg,rgba(255,255,255,.17),rgba(255,255,255,.06));backdrop-filter:blur(22px);border-radius:36px;padding:34px;box-shadow:0 30px 100px rgba(0,0,0,.22)}.fab-eyebrow{display:inline-flex;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.18em}.fab-showcase h2{font-size:clamp(36px,5vw,72px);letter-spacing:-.07em;line-height:.92;margin:18px 0}.fab-showcase p{line-height:1.7;color:rgba(255,255,255,.76)}.fab-chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:20px}.fab-chips span{border-radius:999px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.13);padding:10px 13px;font-size:12px}.fab-phone{width:min(330px,100%);margin:auto;border-radius:42px;padding:14px;background:linear-gradient(135deg,rgba(255,255,255,.32),rgba(255,255,255,.08));border:1px solid rgba(255,255,255,.22);box-shadow:0 38px 100px rgba(0,0,0,.34);transform:rotate(2deg)}.fab-screen{min-height:520px;border-radius:32px;background:${args.colors.surface};color:${args.colors.dark};padding:18px;overflow:hidden}.fab-top{display:flex;justify-content:space-between;align-items:center}.fab-pill{width:74px;height:8px;border-radius:999px;background:rgba(0,0,0,.18)}.fab-avatar{width:38px;height:38px;border-radius:16px;background:${args.colors.accent}}.fab-img{height:190px;border-radius:28px;background-size:cover;background-position:center;margin:18px 0;box-shadow:0 20px 50px rgba(0,0,0,.16)}.fab-card{border-radius:24px;background:rgba(255,255,255,.72);padding:16px;margin-top:12px;box-shadow:0 18px 44px rgba(0,0,0,.08)}.fab-card strong{display:block;font-size:22px;letter-spacing:-.04em}.fab-action{display:block;margin-top:18px;text-align:center;border-radius:20px;background:${args.colors.accent};color:${args.colors.dark};padding:14px;font-weight:900}@media(max-width:820px){.fab-showcase-grid{grid-template-columns:1fr}.fab-phone{transform:none}.fab-screen{min-height:420px}.fab-glass{padding:24px}}
</style><section class="fab-showcase"><div class="fab-showcase-grid"><div class="fab-glass"><span class="fab-eyebrow">${label}</span><h2>${args.title}</h2><p>${args.subtitle}</p><div class="fab-chips">${chips}</div></div><div class="fab-phone"><div class="fab-screen"><div class="fab-top"><div class="fab-pill"></div><div class="fab-avatar"></div></div>${imageTag}<div class="fab-card"><small>${label}</small><strong>${screenTitle}</strong><p>${args.subtitle}</p></div><div class="fab-card"><strong>${args.benefits[0] || 'Experiencia clara'}</strong><p>${args.benefits[1] || 'Flujo pensado para vender mejor.'}</p></div><a class="fab-action" href="/contacto">${args.ctaLabel}</a></div></div></div></section>`;
}

export function transformHtmlToPremiumPage(rawHtml: string): PremiumPageJson {
  const clean = safeHtml(rawHtml || '');
  const body = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || clean;
  const textContent = stripTags(body);
  const title = matchFirst(clean, /<title[^>]*>([\s\S]*?)<\/title>/i) || matchFirst(body, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || 'Landing premium importada';
  const h1 = matchFirst(body, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || title;
  const h2s = matchAll(body, /<h2[^>]*>([\s\S]*?)<\/h2>/gi, 8);
  const h3s = matchAll(body, /<h3[^>]*>([\s\S]*?)<\/h3>/gi, 10);
  const paragraphs = matchAll(body, /<p[^>]*>([\s\S]*?)<\/p>/gi, 12).filter((p) => p.length > 12);
  const listItems = matchAll(body, /<li[^>]*>([\s\S]*?)<\/li>/gi, 8);
  const links = extractLinks(body);
  const image = extractFirstImage(body);
  const preset = inferPreset(`${title} ${textContent}`);
  const colors = presetColors(preset);
  const heroText = paragraphs[0] || h2s[0] || 'Convierte tu contenido en una experiencia visual premium, lista para vender y compartir.';
  const cta = links[0] || { label: preset === 'booking-beauty' ? 'Reservar ahora' : 'Solicitar demo', href: '/contacto' };
  const benefits = (listItems.length ? listItems : [...h3s, ...paragraphs.slice(1, 4)]).slice(0, 6);
  const safeBenefits = benefits.length ? benefits : ['Diseño premium', 'Experiencia clara', 'Mayor conversión'];
  const prices = extractPrices(textContent);
  const stats = extractStats(textContent);
  const testimonials = extractTestimonials(body);
  const planNames = inferPlanNames(textContent);
  const blocks: Block[] = [
    { type: 'hero', title: h1, text: heroText, image, buttonText: cta.label, buttonHref: cta.href, background: colors.bg, textColor: colors.text, accent: colors.accent },
  ];
  if (needsShowcase(`${title} ${textContent}`, preset)) {
    blocks.push({ type: 'custom', title: 'Showcase premium', text: '', html: buildShowcaseHtml({ preset, title: h2s[0] || h1, subtitle: paragraphs[1] || heroText, benefits: safeBenefits, ctaLabel: cta.label, image, colors }), background: colors.bg, textColor: colors.text, accent: colors.accent });
  }
  if (prices.length || /plan|paquete|precio|cotiza|cotizar|valor|mensual|propuesta/i.test(textContent)) {
    blocks.push({ type: 'custom', title: 'Paquetes comerciales', text: '', html: buildPricingHtml({ prices, planNames, benefits: safeBenefits, ctaLabel: cta.label, colors }), background: colors.bg, textColor: colors.text, accent: colors.accent });
  }
  if (stats.length) {
    blocks.push({ type: 'custom', title: 'Métricas comerciales', text: '', html: buildStatsHtml({ stats, colors }), background: colors.bg, textColor: colors.text, accent: colors.accent });
  }
  if (safeBenefits.length) {
    blocks.push({ type: 'cards', title: h2s[0] || 'Beneficios principales', text: safeBenefits.join(' | '), background: colors.surface, textColor: colors.dark, accent: colors.accent });
  }
  if (testimonials.length) {
    blocks.push({ type: 'custom', title: 'Testimonios', text: '', html: buildTestimonialsHtml({ testimonials, colors }), background: colors.bg, textColor: colors.text, accent: colors.accent });
  }
  if (paragraphs[1] || h2s[1] || image) {
    blocks.push({ type: 'split', title: h2s[1] || 'Una experiencia diseñada para convertir', text: paragraphs[1] || paragraphs[0] || 'Diseño limpio, visual premium y estructura comercial clara.', image, buttonText: cta.label, buttonHref: cta.href, background: colors.bg, textColor: colors.text, accent: colors.accent });
  }
  if (hasGuarantee(textContent)) {
    blocks.push({ type: 'custom', title: 'Garantía', text: '', html: buildGuaranteeHtml({ colors }), background: colors.bg, textColor: colors.text, accent: colors.accent });
  }
  blocks.push({ type: 'cta', title: h2s[h2s.length - 1] || 'Haz que tu marca se vea vendible', text: paragraphs[2] || 'Publica una experiencia elegante, minimalista y lista para captar clientes.', buttonText: cta.label, buttonHref: cta.href, background: colors.accent, textColor: colors.dark, accent: colors.accent });
  return { title, visualPreset: preset, device: 'desktop', blocks };
}
