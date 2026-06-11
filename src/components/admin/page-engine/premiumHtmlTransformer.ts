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
  const blocks: Block[] = [
    { type: 'hero', title: h1, text: heroText, image, buttonText: cta.label, buttonHref: cta.href, background: colors.bg, textColor: colors.text, accent: colors.accent },
  ];
  if (benefits.length) {
    blocks.push({ type: 'cards', title: h2s[0] || 'Beneficios principales', text: benefits.join(' | '), background: colors.surface, textColor: colors.dark, accent: colors.accent });
  }
  if (paragraphs[1] || h2s[1] || image) {
    blocks.push({ type: 'split', title: h2s[1] || 'Una experiencia diseñada para convertir', text: paragraphs[1] || paragraphs[0] || 'Diseño limpio, visual premium y estructura comercial clara.', image, buttonText: cta.label, buttonHref: cta.href, background: colors.bg, textColor: colors.text, accent: colors.accent });
  }
  blocks.push({ type: 'cta', title: h2s[h2s.length - 1] || 'Haz que tu marca se vea vendible', text: paragraphs[2] || 'Publica una experiencia elegante, minimalista y lista para captar clientes.', buttonText: cta.label, buttonHref: cta.href, background: colors.accent, textColor: colors.dark, accent: colors.accent });
  return { title, visualPreset: preset, device: 'desktop', blocks };
}
