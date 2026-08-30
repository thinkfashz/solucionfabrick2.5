'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTenantBranding } from '@/hooks/useTenantBranding';

const TEXT_REPLACEMENTS = [
  'Soluciones Fabrick SpA',
  'Soluciones Fabrick',
  'SOLUCIONES FABRICK',
  'Fabrick',
  'solucionesfabrick.cl',
  'solucionesfabrick.com',
  'contacto@solucionesfabrick.com',
  'pagos@solucionesfabrick.cl',
  'admin@fabrick.cl',
];

function isRootSurface(pathname: string) {
  return pathname.startsWith('/admin/saas') || pathname.startsWith('/admin/superadmin');
}

function shouldApply(pathname: string) {
  return !pathname.startsWith('/api') && !isRootSurface(pathname);
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace copy in one pass so a replacement can never be processed again by a
 * shorter rule. This is important when the tenant name itself contains
 * "Fabrick": "Soluciones Fabrick" must not become
 * "Soluciones Soluciones Fabrick" after the generic Fabrick rule runs.
 */
function replaceText(value: string, replacements: Record<string, string>) {
  const entries = Object.entries(replacements)
    .filter(([from, to]) => Boolean(from) && Boolean(to))
    .sort(([a], [b]) => b.length - a.length);

  if (!entries.length) return value;

  const replacementMap = new Map(entries);
  const pattern = new RegExp(entries.map(([from]) => escapeRegExp(from)).join('|'), 'g');
  return value.replace(pattern, (match) => replacementMap.get(match) ?? match);
}

function applyBrandImages(root: ParentNode, logoUrl: string | null, brandName: string) {
  if (!logoUrl) return;
  const elements: HTMLImageElement[] = [];
  if (root instanceof HTMLImageElement) elements.push(root);
  root.querySelectorAll?.('img').forEach((item) => elements.push(item as HTMLImageElement));

  elements.forEach((img) => {
    const current = img.getAttribute('src') || '';
    const original = img.dataset.tenantOriginalSrc || current;
    const isBrandAsset = original.includes('/brand/soluciones-fabrick')
      || original.includes('/app-icon')
      || current.includes('/brand/soluciones-fabrick');
    if (!isBrandAsset) return;
    if (!img.dataset.tenantOriginalSrc) img.dataset.tenantOriginalSrc = original;
    if (img.src !== logoUrl) img.src = logoUrl;
    img.alt = brandName;
    img.style.objectFit = 'contain';
  });
}

function applyTenantCopy(root: ParentNode, replacements: Record<string, string>, logoUrl: string | null, brandName: string) {
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

  const attributes = root instanceof Element ? [root, ...Array.from(root.querySelectorAll<HTMLElement>('[alt], [title], [aria-label], [placeholder]'))] : Array.from(document.querySelectorAll<HTMLElement>('[alt], [title], [aria-label], [placeholder]'));
  attributes.forEach((element) => {
    for (const attr of ['alt', 'title', 'aria-label', 'placeholder']) {
      const current = element.getAttribute(attr);
      if (!current) continue;
      const next = replaceText(current, replacements);
      if (next !== current) element.setAttribute(attr, next);
    }
  });

  applyBrandImages(root, logoUrl, brandName);
}

function applyFavicon(logoUrl: string | null) {
  if (!logoUrl) return;
  let link = document.querySelector<HTMLLinkElement>('link[data-tenant-favicon]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.dataset.tenantFavicon = 'true';
    document.head.appendChild(link);
  }
  link.href = logoUrl;
}

export function TenantCopyRuntime() {
  const pathname = usePathname();
  const { branding, enabled } = useTenantBranding();

  useEffect(() => {
    if (!enabled || !shouldApply(pathname)) return;

    const brandName = branding.name || 'Soluciones Fabrick';
    const brandUpper = brandName.toUpperCase();
    const email = branding.contactEmail || branding.ownerEmail || branding.billingEmail || 'contacto@solucionesfabrick.com';
    const billingEmail = branding.billingEmail || email;
    const domain = branding.customDomain || `${branding.slug || 'fabrick'}.solucionesfabrick.com`;

    const replacements: Record<string, string> = {
      'Soluciones Fabrick SpA': brandName,
      'Soluciones Fabrick': brandName,
      'SOLUCIONES FABRICK': brandUpper,
      'Fabrick': brandName,
      'contacto@solucionesfabrick.com': email,
      'pagos@solucionesfabrick.cl': billingEmail,
      'admin@fabrick.cl': email,
      'solucionesfabrick.cl': domain,
      'solucionesfabrick.com': domain,
    };

    applyTenantCopy(document.body, replacements, branding.logoUrl, brandName);
    applyFavicon(branding.logoUrl);
    document.documentElement.dataset.tenantBrand = branding.slug || 'fabrick';

    if (document.title) document.title = replaceText(document.title, replacements);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && isSafeTextNode(node)) {
            const text = node as Text;
            const next = replaceText(text.textContent || '', replacements);
            if (next !== text.textContent) text.textContent = next;
            return;
          }
          if (node.nodeType === Node.ELEMENT_NODE) {
            applyTenantCopy(node as Element, replacements, branding.logoUrl, brandName);
          }
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      delete document.documentElement.dataset.tenantBrand;
    };
  }, [branding.billingEmail, branding.contactEmail, branding.customDomain, branding.logoUrl, branding.name, branding.ownerEmail, branding.slug, enabled, pathname]);

  return null;
}
