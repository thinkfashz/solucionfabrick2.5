'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTenantBranding } from '@/hooks/useTenantBranding';

const TEXT_REPLACEMENTS = [
  'Soluciones Fabrick SpA',
  'Soluciones Fabrick',
  'SOLUCIONES FABRICK',
  'solucionesfabrick.cl',
  'solucionesfabrick.com',
  'pagos@solucionesfabrick.cl',
  'admin@fabrick.cl',
];

function shouldApply(pathname: string) {
  return !pathname.startsWith('/admin')
    && !pathname.startsWith('/auth')
    && !pathname.startsWith('/api')
    && !pathname.startsWith('/registro');
}

function isSafeTextNode(node: Node) {
  const parent = node.parentElement;
  if (!parent) return false;
  const tag = parent.tagName.toLowerCase();
  return tag !== 'script'
    && tag !== 'style'
    && tag !== 'noscript'
    && tag !== 'textarea'
    && tag !== 'input'
    && !parent.closest('[data-no-tenant-copy]')
    && !parent.closest('[contenteditable="true"]');
}

function replaceText(value: string, replacements: Record<string, string>) {
  let next = value;
  for (const [from, to] of Object.entries(replacements)) {
    if (!to) continue;
    next = next.split(from).join(to);
  }
  return next;
}

function applyTenantCopy(root: ParentNode, replacements: Record<string, string>) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!isSafeTextNode(node)) return NodeFilter.FILTER_REJECT;
      const value = node.textContent || '';
      return TEXT_REPLACEMENTS.some((needle) => value.includes(needle))
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => {
    const next = replaceText(node.textContent || '', replacements);
    if (next !== node.textContent) node.textContent = next;
  });

  document.querySelectorAll<HTMLElement>('[alt], [title], [aria-label]').forEach((element) => {
    for (const attr of ['alt', 'title', 'aria-label']) {
      const current = element.getAttribute(attr);
      if (!current) continue;
      const next = replaceText(current, replacements);
      if (next !== current) element.setAttribute(attr, next);
    }
  });
}

export function TenantCopyRuntime() {
  const pathname = usePathname();
  const { branding, enabled } = useTenantBranding();

  useEffect(() => {
    if (!enabled || !shouldApply(pathname)) return;

    const brandName = branding.name || 'Soluciones Fabrick';
    const brandUpper = brandName.toUpperCase();
    const email = branding.billingEmail || branding.ownerEmail || 'pagos@solucionesfabrick.cl';
    const domain = branding.customDomain || `${branding.slug || 'fabrick'}.solucionesfabrick.com`;

    const replacements: Record<string, string> = {
      'Soluciones Fabrick SpA': brandName,
      'Soluciones Fabrick': brandName,
      'SOLUCIONES FABRICK': brandUpper,
      'pagos@solucionesfabrick.cl': email,
      'admin@fabrick.cl': email,
      'solucionesfabrick.cl': domain,
      'solucionesfabrick.com': domain,
    };

    applyTenantCopy(document.body, replacements);
    if (document.title.includes('Soluciones Fabrick')) {
      document.title = replaceText(document.title, replacements);
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && isSafeTextNode(node)) {
            const text = node as Text;
            const next = replaceText(text.textContent || '', replacements);
            if (next !== text.textContent) text.textContent = next;
            return;
          }
          if (node.nodeType === Node.ELEMENT_NODE) applyTenantCopy(node as Element, replacements);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [branding.billingEmail, branding.customDomain, branding.name, branding.ownerEmail, branding.slug, enabled, pathname]);

  return null;
}
