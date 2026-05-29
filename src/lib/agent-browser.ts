/**
 * agent-browser.ts
 * Persistent Playwright browser session for the AI agent.
 * The session lives for the duration of one agent request and is shared
 * across all tool calls — navigation state is preserved between actions.
 */

import type { Browser, Page } from 'playwright';

export type EmitFn = (event: Record<string, unknown>) => void;

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--single-process',
  '--ignore-certificate-errors',
];

const BLOCK_TYPES = new Set(['image', 'stylesheet', 'font', 'media', 'websocket']);

/** Max characters extracted from page body */
const MAX_TEXT = 8_000;

function cleanText(raw: string): string {
  return raw.replace(/\s{3,}/g, '\n\n').replace(/\n{4,}/g, '\n\n').trim().slice(0, MAX_TEXT);
}

export class BrowserSession {
  private _browser!: Browser;
  private _page!: Page;
  private _lastAction = '';
  private _frameActive = false;

  static async create(): Promise<BrowserSession> {
    const session = new BrowserSession();
    const { chromium } = await import('playwright');
    session._browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });
    const ctx = await session._browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });
    session._page = await ctx.newPage();

    // Block heavy resources for faster page loads
    await session._page.route('**/*', (route) => {
      if (BLOCK_TYPES.has(route.request().resourceType())) {
        route.abort().catch(() => null);
      } else {
        route.continue().catch(() => null);
      }
    });

    return session;
  }

  get page(): Page { return this._page; }
  get url(): string { return this._page.url(); }
  get lastAction(): string { return this._lastAction; }

  async screenshot(): Promise<string> {
    const buf = await this._page.screenshot({ type: 'jpeg', quality: 55, fullPage: false });
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  }

  async navigate(url: string): Promise<{ title: string; text: string }> {
    this._lastAction = `Navegando a ${url}`;
    await this._page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this._page.waitForTimeout(700);
    const title = await this._page.title().catch(() => '');
    const text = await this._extractText();
    return { title, text };
  }

  async click(target: string): Promise<string> {
    this._lastAction = `Haciendo clic en "${target}"`;
    try {
      await this._page.getByText(target, { exact: false }).first().click({ timeout: 5_000 });
    } catch {
      try {
        await this._page.locator(target).first().click({ timeout: 5_000 });
      } catch (e) {
        return `No se pudo hacer clic en "${target}": ${e instanceof Error ? e.message : String(e)}`;
      }
    }
    await this._page.waitForTimeout(500);
    return `Clic en "${target}" realizado. URL actual: ${this._page.url()}`;
  }

  async fill(selector: string, text: string): Promise<string> {
    this._lastAction = `Escribiendo "${text}" en ${selector}`;
    try {
      await this._page.locator(selector).first().fill(text, { timeout: 5_000 });
    } catch {
      try {
        // fallback: focus + type
        await this._page.focus(selector);
        await this._page.keyboard.type(text, { delay: 30 });
      } catch (e) {
        return `No se pudo escribir en "${selector}": ${e instanceof Error ? e.message : String(e)}`;
      }
    }
    return `Texto "${text}" escrito en ${selector}`;
  }

  async pressKey(key: string): Promise<string> {
    this._lastAction = `Presionando tecla ${key}`;
    await this._page.keyboard.press(key);
    await this._page.waitForTimeout(400);
    return `Tecla "${key}" presionada`;
  }

  async scroll(direction: 'arriba' | 'abajo', px = 600): Promise<string> {
    this._lastAction = `Desplazando ${direction}`;
    await this._page.mouse.wheel(0, direction === 'abajo' ? px : -px);
    await this._page.waitForTimeout(200);
    return `Página desplazada ${direction} ${px}px`;
  }

  async getContent(): Promise<string> {
    return this._extractText();
  }

  async waitForElement(selector: string, timeout = 8_000): Promise<string> {
    this._lastAction = `Esperando elemento ${selector}`;
    try {
      await this._page.waitForSelector(selector, { timeout });
      return `Elemento "${selector}" encontrado`;
    } catch {
      return `Tiempo agotado esperando "${selector}"`;
    }
  }

  /** Stream frames at ~3fps while an async action runs, then emit a final frame. */
  async withFrames(emit: EmitFn, actionLabel: string, action: () => Promise<void>): Promise<void> {
    this._lastAction = actionLabel;
    this._frameActive = true;
    let isCapturing = false;

    const interval = setInterval(() => {
      if (isCapturing || !this._frameActive) return;
      isCapturing = true;
      void this._page.screenshot({ type: 'jpeg', quality: 42 })
        .then((buf) => {
          emit({
            type: 'frame',
            url: this._page.url(),
            data: `data:image/jpeg;base64,${buf.toString('base64')}`,
            action: actionLabel,
          });
        })
        .catch(() => null)
        .finally(() => { isCapturing = false; });
    }, 350);

    try {
      await action();
    } finally {
      this._frameActive = false;
      clearInterval(interval);
      // Final crisp frame
      try {
        const buf = await this._page.screenshot({ type: 'jpeg', quality: 65 });
        emit({
          type: 'frame',
          url: this._page.url(),
          data: `data:image/jpeg;base64,${buf.toString('base64')}`,
          action: actionLabel,
          final: true,
        });
      } catch { /* ignore */ }
    }
  }

  async close(): Promise<void> {
    this._frameActive = false;
    await this._browser.close().catch(() => null);
  }

  private async _extractText(): Promise<string> {
    try {
      const raw = await this._page.evaluate(() => {
        const rm = (sel: string) => document.querySelectorAll(sel).forEach((el) => el.remove());
        rm('script'); rm('style'); rm('nav'); rm('footer');
        rm('header'); rm('noscript'); rm('[aria-hidden="true"]');
        return document.body?.innerText ?? '';
      });
      return cleanText(raw);
    } catch {
      return '';
    }
  }
}
