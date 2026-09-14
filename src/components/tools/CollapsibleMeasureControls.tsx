'use client';

import { useEffect } from 'react';

type Props = {
  targetText: string;
  ancestorDepth: number;
  label: string;
  summary: string;
  defaultOpen?: boolean;
};

function normalize(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export default function CollapsibleMeasureControls({
  targetText,
  ancestorDepth,
  label,
  summary,
  defaultOpen = false,
}: Props) {
  useEffect(() => {
    let disposed = false;
    let timeout: number | undefined;
    let cleanup: (() => void) | undefined;
    const wanted = normalize(targetText);

    const install = () => {
      if (disposed || cleanup) return;

      const candidates = Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,p,span'))
        .filter((node) => normalize(node.textContent).includes(wanted))
        .sort((a, b) => (a.textContent?.length || 0) - (b.textContent?.length || 0));
      const anchor = candidates[0];
      if (!anchor) {
        timeout = window.setTimeout(install, 120);
        return;
      }

      let target: HTMLElement | null = anchor;
      for (let index = 0; index < ancestorDepth; index += 1) target = target?.parentElement || null;
      if (!target || target.dataset.fabrickMeasureCollapse === 'true') return;

      target.dataset.fabrickMeasureCollapse = 'true';
      const originalChildren = Array.from(target.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
      const originalDisplays = originalChildren.map((child) => child.style.display);
      let open = defaultOpen;

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.setAttribute('aria-expanded', String(open));
      trigger.style.cssText = [
        'width:100%',
        'min-height:58px',
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'gap:12px',
        'border:1px solid rgba(255,255,255,.11)',
        'border-radius:16px',
        'background:rgba(5,9,12,.72)',
        'color:#fff',
        'padding:11px 13px',
        'text-align:left',
        'cursor:pointer',
        'font:inherit',
        'box-sizing:border-box',
      ].join(';');

      const copy = document.createElement('span');
      copy.style.cssText = 'display:block;min-width:0;';
      const title = document.createElement('strong');
      title.textContent = label;
      title.style.cssText = 'display:block;color:#F6C64A;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;';
      const detail = document.createElement('span');
      detail.textContent = summary;
      detail.style.cssText = 'display:block;margin-top:3px;color:rgba(255,255,255,.56);font-size:10px;line-height:1.45;white-space:normal;';
      copy.append(title, detail);

      const action = document.createElement('span');
      action.style.cssText = 'flex:0 0 auto;display:inline-flex;align-items:center;gap:7px;color:rgba(255,255,255,.72);font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;';
      const actionText = document.createElement('span');
      const chevron = document.createElement('span');
      chevron.textContent = '⌄';
      chevron.style.cssText = 'display:grid;width:28px;height:28px;place-items:center;border:1px solid rgba(246,198,74,.32);border-radius:999px;color:#F6C64A;font-size:17px;line-height:1;transition:transform .18s ease;';
      action.append(actionText, chevron);
      trigger.append(copy, action);

      const render = () => {
        trigger.setAttribute('aria-expanded', String(open));
        actionText.textContent = open ? 'Ocultar' : 'Editar';
        chevron.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
        originalChildren.forEach((child, index) => {
          child.style.display = open ? originalDisplays[index] : 'none';
        });
        target!.style.rowGap = open ? '' : '0';
      };

      trigger.addEventListener('click', () => {
        open = !open;
        render();
      });
      target.prepend(trigger);
      render();

      cleanup = () => {
        originalChildren.forEach((child, index) => { child.style.display = originalDisplays[index]; });
        delete target!.dataset.fabrickMeasureCollapse;
        target!.style.rowGap = '';
        trigger.remove();
      };
    };

    install();
    return () => {
      disposed = true;
      if (timeout) window.clearTimeout(timeout);
      cleanup?.();
    };
  }, [ancestorDepth, defaultOpen, label, summary, targetText]);

  return null;
}
