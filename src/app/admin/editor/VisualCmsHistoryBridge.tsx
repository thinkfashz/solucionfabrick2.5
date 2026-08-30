'use client';

import { useEffect } from 'react';
import { normalizeVisualCmsOverrides } from '@/lib/visualCmsOverrides';

const DRAFT_KEY = 'sf-visual-cms-universal-draft-v1';
const PAST_KEY = 'sf-visual-cms-history-past-v1';
const FUTURE_KEY = 'sf-visual-cms-history-future-v1';
const BASE_KEY = 'sf-visual-cms-history-base-v1';
const APPLYING_KEY = 'sf-visual-cms-history-applying-v1';
const ROUTE_KEY = 'sf-visual-cms-history-route-v1';
const MAX_HISTORY = 20;

type SiteStructureResponse = { content?: unknown };

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function canonical(value: string | null): string | null {
  if (!value) return null;
  try {
    return JSON.stringify(normalizeVisualCmsOverrides(JSON.parse(value)));
  } catch {
    return null;
  }
}

function readStack(key: string): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function saveStack(key: string, stack: string[]) {
  const trimmed = stack.slice(-MAX_HISTORY);
  try {
    sessionStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    try {
      sessionStorage.setItem(key, JSON.stringify(trimmed.slice(-8)));
    } catch {
      // History remains optional if storage quota is exhausted.
    }
  }
}

function findCurrentRoute() {
  const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h1')).find((node) => node.textContent?.includes('Editor universal'));
  return heading?.querySelector('span')?.textContent?.trim() || '/';
}

function restoreRouteAfterReload() {
  const desired = sessionStorage.getItem(ROUTE_KEY);
  if (!desired) return;
  sessionStorage.removeItem(ROUTE_KEY);
  if (desired === '/') return;

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label'));
    const routeLabel = labels.find((label) => label.querySelector('span')?.textContent?.trim() === 'Abrir cualquier ruta');
    const input = routeLabel?.querySelector<HTMLInputElement>('input');
    const container = routeLabel?.parentElement;
    const openButton = container ? Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === 'Abrir ruta') : null;
    if (input && openButton) {
      setNativeInputValue(input, desired);
      openButton.click();
      window.clearInterval(timer);
      return;
    }
    if (attempts >= 30) window.clearInterval(timer);
  }, 150);
}

export default function VisualCmsHistoryBridge() {
  useEffect(() => {
    let disposed = false;
    let publishedSnapshot = '';
    let currentSnapshot = '';
    let candidateSnapshot = '';
    let candidateSince = 0;
    let toolbarObserver: MutationObserver | null = null;
    let pollTimer = 0;
    let undoButton: HTMLButtonElement | null = null;
    let redoButton: HTMLButtonElement | null = null;

    const past = () => readStack(PAST_KEY);
    const future = () => readStack(FUTURE_KEY);

    const refreshButtons = () => {
      if (undoButton) {
        const enabled = past().length > 0 || Boolean(candidateSnapshot && candidateSnapshot !== currentSnapshot);
        undoButton.disabled = !enabled;
        undoButton.classList.toggle('opacity-25', !enabled);
      }
      if (redoButton) {
        const enabled = future().length > 0;
        redoButton.disabled = !enabled;
        redoButton.classList.toggle('opacity-25', !enabled);
      }
    };

    const clearHistory = () => {
      saveStack(PAST_KEY, []);
      saveStack(FUTURE_KEY, []);
      candidateSnapshot = '';
      candidateSince = 0;
      refreshButtons();
    };

    const observedSnapshot = () => canonical(localStorage.getItem(DRAFT_KEY)) || publishedSnapshot;

    const commitCandidate = () => {
      if (!candidateSnapshot || candidateSnapshot === currentSnapshot) {
        candidateSnapshot = '';
        candidateSince = 0;
        return;
      }
      const stack = past();
      if (!stack.length || stack[stack.length - 1] !== currentSnapshot) stack.push(currentSnapshot);
      saveStack(PAST_KEY, stack);
      saveStack(FUTURE_KEY, []);
      currentSnapshot = candidateSnapshot;
      candidateSnapshot = '';
      candidateSince = 0;
      refreshButtons();
    };

    const applySnapshot = (snapshot: string) => {
      sessionStorage.setItem(APPLYING_KEY, '1');
      sessionStorage.setItem(ROUTE_KEY, findCurrentRoute());
      localStorage.setItem(DRAFT_KEY, snapshot);
      window.location.reload();
    };

    const undo = () => {
      commitCandidate();
      const stack = past();
      if (!stack.length) return;
      const previous = stack.pop();
      if (!previous) return;
      const redoStack = future();
      redoStack.push(currentSnapshot);
      saveStack(PAST_KEY, stack);
      saveStack(FUTURE_KEY, redoStack);
      applySnapshot(previous);
    };

    const redo = () => {
      commitCandidate();
      const redoStack = future();
      if (!redoStack.length) return;
      const next = redoStack.pop();
      if (!next) return;
      const stack = past();
      stack.push(currentSnapshot);
      saveStack(PAST_KEY, stack);
      saveStack(FUTURE_KEY, redoStack);
      applySnapshot(next);
    };

    const ensureToolbar = () => {
      if (document.querySelector('[data-visual-cms-history-toolbar="1"]')) return;
      const restoreButton = document.querySelector<HTMLButtonElement>('button[title="Restaurar versión publicada"]');
      const header = restoreButton?.parentElement;
      if (!restoreButton || !header) return;

      const wrapper = document.createElement('div');
      wrapper.dataset.visualCmsHistoryToolbar = '1';
      wrapper.className = 'flex shrink-0 items-center gap-1';

      undoButton = document.createElement('button');
      undoButton.type = 'button';
      undoButton.title = 'Deshacer cambio visual';
      undoButton.setAttribute('aria-label', 'Deshacer cambio visual');
      undoButton.className = 'grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-sm font-black text-white/55 transition hover:border-[#FFB000]/30 hover:text-[#FFB000] disabled:pointer-events-none sm:h-9 sm:w-9';
      undoButton.textContent = '↶';
      undoButton.addEventListener('click', undo);

      redoButton = document.createElement('button');
      redoButton.type = 'button';
      redoButton.title = 'Rehacer cambio visual';
      redoButton.setAttribute('aria-label', 'Rehacer cambio visual');
      redoButton.className = 'grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-sm font-black text-white/55 transition hover:border-[#FFB000]/30 hover:text-[#FFB000] disabled:pointer-events-none sm:h-9 sm:w-9';
      redoButton.textContent = '↷';
      redoButton.addEventListener('click', redo);

      wrapper.append(undoButton, redoButton);
      header.insertBefore(wrapper, restoreButton);
      refreshButtons();
    };

    const refreshPublishedBaseline = async (resetIfClean: boolean) => {
      try {
        const response = await fetch('/api/admin/site-structure/visual-overrides', { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok) return;
        const body = await response.json().catch(() => ({})) as SiteStructureResponse;
        const next = JSON.stringify(normalizeVisualCmsOverrides(body.content));
        if (!next) return;
        publishedSnapshot = next;
        if (resetIfClean && !localStorage.getItem(DRAFT_KEY)) {
          currentSnapshot = next;
          sessionStorage.setItem(BASE_KEY, next);
          clearHistory();
        }
      } catch {
        // The editor remains functional even if history cannot refresh its baseline.
      }
    };

    const onClickCapture = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('button');
      if (!button || button.textContent?.trim() !== 'Publicar') return;
      window.setTimeout(() => void refreshPublishedBaseline(true), 1400);
      window.setTimeout(() => void refreshPublishedBaseline(true), 3000);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select') || target?.isContentEditable) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };

    const initialize = async () => {
      const storedBaseBeforeFetch = sessionStorage.getItem(BASE_KEY);
      await refreshPublishedBaseline(false);
      if (disposed || !publishedSnapshot) return;

      const applying = sessionStorage.getItem(APPLYING_KEY) === '1';
      sessionStorage.removeItem(APPLYING_KEY);
      if (!applying && storedBaseBeforeFetch && storedBaseBeforeFetch !== publishedSnapshot) clearHistory();
      sessionStorage.setItem(BASE_KEY, publishedSnapshot);

      currentSnapshot = observedSnapshot();
      restoreRouteAfterReload();
      ensureToolbar();

      toolbarObserver = new MutationObserver(ensureToolbar);
      toolbarObserver.observe(document.body, { childList: true, subtree: true });

      pollTimer = window.setInterval(() => {
        const observed = observedSnapshot();
        if (!observed || observed === currentSnapshot) {
          candidateSnapshot = '';
          candidateSince = 0;
          refreshButtons();
          return;
        }
        if (observed !== candidateSnapshot) {
          candidateSnapshot = observed;
          candidateSince = Date.now();
          refreshButtons();
          return;
        }
        if (Date.now() - candidateSince >= 450) commitCandidate();
      }, 180);
    };

    document.addEventListener('click', onClickCapture, true);
    window.addEventListener('keydown', onKeyDown);
    void initialize();

    return () => {
      disposed = true;
      document.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('keydown', onKeyDown);
      toolbarObserver?.disconnect();
      if (pollTimer) window.clearInterval(pollTimer);
      document.querySelector('[data-visual-cms-history-toolbar="1"]')?.remove();
    };
  }, []);

  return null;
}
