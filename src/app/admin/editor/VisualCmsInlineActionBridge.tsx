'use client';

import { useEffect } from 'react';

type InspectorTab = 'Contenido' | 'Apariencia' | 'Medidas';

type InlineActionMessage = {
  type?: string;
  action?: string;
  value?: string;
};

function normalizeText(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function findEditorRoot() {
  const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>('main[data-admin-content] h1'))
    .find((node) => normalizeText(node.textContent).startsWith('Editor universal'));
  return heading?.closest<HTMLElement>('div.relative.flex') || null;
}

function findButton(root: HTMLElement, text: string) {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
    .find((button) => normalizeText(button.textContent) === text) || null;
}

function findLabel(root: HTMLElement, caption: string) {
  return Array.from(root.querySelectorAll<HTMLLabelElement>('label')).find((label) => {
    const directSpan = label.querySelector<HTMLElement>(':scope > span');
    return normalizeText(directSpan?.textContent) === caption;
  }) || null;
}

function setNativeValue(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = control instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : control instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(control, value);
  else control.value = value;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

function activateTab(root: HTMLElement, tab: InspectorTab) {
  findButton(root, tab)?.click();
}

function withRetry(action: () => boolean, attempts = 10) {
  let count = 0;
  const run = () => {
    count += 1;
    if (action() || count >= attempts) return;
    window.setTimeout(run, 45);
  };
  run();
}

function setInspectorField(tab: InspectorTab, caption: string, value: string) {
  const root = findEditorRoot();
  if (!root) return;
  activateTab(root, tab);
  withRetry(() => {
    const label = findLabel(root, caption);
    if (!label) return false;
    const control = label.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('textarea, select, input:not([type="color"])');
    if (!control) return false;
    setNativeValue(control, value);
    return true;
  });
}

function focusContextText() {
  withRetry(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>('[aria-label="Editor contextual del elemento seleccionado"] textarea');
    if (!textarea) return false;
    textarea.focus();
    textarea.select();
    return true;
  });
}

function openContextImage() {
  withRetry(() => {
    const root = document.querySelector<HTMLElement>('[aria-label="Editor contextual del elemento seleccionado"]');
    if (!root) return false;
    const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((candidate) => normalizeText(candidate.textContent) === 'Cambiar imagen');
    if (!button) return false;
    button.click();
    return true;
  });
}

function openAdvancedInspector() {
  withRetry(() => {
    const editorRoot = findEditorRoot();
    const contextRoot = document.querySelector<HTMLElement>('[aria-label="Editor contextual del elemento seleccionado"]');
    if (!editorRoot || !contextRoot) return false;
    if (editorRoot.dataset.contextAdvanced === '1') return true;
    const button = contextRoot.querySelector<HTMLButtonElement>('button[title="Inspector avanzado"]');
    if (!button) return false;
    button.click();
    return true;
  });
}

export default function VisualCmsInlineActionBridge() {
  useEffect(() => {
    const handler = (event: MessageEvent<InlineActionMessage>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'cms:visual-inline-action') return;
      const { action, value } = event.data;
      if (action === 'focus-text') focusContextText();
      else if (action === 'color' && value) setInspectorField('Apariencia', 'Texto / icono', value);
      else if (action === 'background' && value) setInspectorField('Apariencia', 'Fondo', value);
      else if (action === 'font-size' && value) setInspectorField('Apariencia', 'Tamaño', value);
      else if (action === 'image') openContextImage();
      else if (action === 'advanced') openAdvancedInspector();
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return null;
}
