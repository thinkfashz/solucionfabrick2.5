/**
 * playwright-agent.ts
 * Helpers for headless browser automation used by the AI Agent page.
 * Each call launches a fresh Chromium instance (stateless / serverless-safe).
 */

export interface BrowseResult {
  url: string;
  title: string;
  text: string;          // cleaned page text (max 6 000 chars)
  screenshot: string;    // base64 PNG data URI
  error?: string;
}

export interface SearchResult {
  ok: boolean;
  results: Array<{ title: string; url: string; snippet: string }>;
  answerBox?: string;
  error?: string;
}

/** Max characters to return from a page — keeps tokens in check */
const MAX_TEXT = 6_000;

/** List of resource types to block for faster loading */
const BLOCK_TYPES = new Set(['image', 'stylesheet', 'font', 'media', 'websocket']);

function cleanText(raw: string): string {
  return raw
    .replace(/\s{3,}/g, '\n\n')
    .replace(/\n{4,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT);
}

/**
 * Navigate to a URL with a headless Chromium browser.
 * Returns page title, cleaned text content, and a base64 screenshot.
 */
export async function browsePage(url: string): Promise<BrowseResult> {
  let browser: import('playwright').Browser | null = null;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
      ],
    });
    const ctx = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });
    const page = await ctx.newPage();

    // Block heavy resources for speed
    await page.route('**/*', (route) => {
      if (BLOCK_TYPES.has(route.request().resourceType())) {
        route.abort().catch(() => null);
      } else {
        route.continue().catch(() => null);
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800); // allow JS to settle

    const title = await page.title().catch(() => '');

    // Extract visible text only (no scripts, styles, nav noise)
    const rawText = await page.evaluate(() => {
      const remove = (sel: string) => document.querySelectorAll(sel).forEach((el) => el.remove());
      remove('script'); remove('style'); remove('nav'); remove('footer');
      remove('header'); remove('noscript'); remove('[aria-hidden="true"]');
      return document.body?.innerText ?? '';
    });

    const text = cleanText(rawText);

    // Screenshot at reduced quality
    const screenshotBuf = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: false });
    const screenshot = `data:image/jpeg;base64,${screenshotBuf.toString('base64')}`;

    return { url, title, text, screenshot };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { url, title: '', text: '', screenshot: '', error: msg };
  } finally {
    if (browser) await browser.close().catch(() => null);
  }
}

/**
 * Search the web using Serper.dev (if API key configured) or
 * a simple DuckDuckGo HTML scrape via Playwright as fallback.
 */
export async function searchWeb(
  query: string,
  serperApiKey?: string,
  gl = 'cl',
): Promise<SearchResult> {
  // Primary: Serper
  if (serperApiKey) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: 8, gl, hl: 'es' }),
        signal: AbortSignal.timeout(12_000),
      });
      if (res.ok) {
        const data = await res.json() as {
          organic?: Array<{ title?: string; link?: string; snippet?: string }>;
          answerBox?: { answer?: string; snippet?: string };
          knowledgeGraph?: { description?: string };
        };
        const results = (data.organic ?? []).map((r) => ({
          title: r.title ?? '',
          url: r.link ?? '',
          snippet: r.snippet ?? '',
        }));
        const answerBox =
          data.answerBox?.answer ??
          data.answerBox?.snippet ??
          data.knowledgeGraph?.description;
        return { ok: true, results, answerBox };
      }
    } catch { /* fall through */ }
  }

  // Fallback: DuckDuckGo HTML scrape via Playwright
  return searchViaDDG(query);
}

async function searchViaDDG(query: string): Promise<SearchResult> {
  let browser: import('playwright').Browser | null = null;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process', '--ignore-certificate-errors'],
    });
    const page = await (await browser.newContext()).newPage();
    const encoded = encodeURIComponent(query);
    await page.goto(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });

    const results = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.result')).slice(0, 6).map((el) => ({
        title: (el.querySelector('.result__a') as HTMLElement)?.innerText ?? '',
        url: (el.querySelector('.result__url') as HTMLElement)?.innerText ?? '',
        snippet: (el.querySelector('.result__snippet') as HTMLElement)?.innerText ?? '',
      }));
    });

    return { ok: true, results };
  } catch (err) {
    return { ok: false, results: [], error: err instanceof Error ? err.message : String(err) };
  } finally {
    if (browser) await browser.close().catch(() => null);
  }
}
