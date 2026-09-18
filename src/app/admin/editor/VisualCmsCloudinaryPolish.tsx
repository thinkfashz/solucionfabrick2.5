'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect } from 'react';

const FIELD_LABELS = new Set(['URL / Cloudinary', 'Imagen de fondo', 'Reemplazar por SVG / PNG']);

function looksLikeImageUrl(value: string) {
  const clean = value.trim();
  return clean.startsWith('https://') || clean.startsWith('http://') || clean.startsWith('data:image/');
}

function mountFieldPreview(label: HTMLLabelElement) {
  if (label.dataset.cloudinaryPolishPreview === '1') return;
  const caption = label.querySelector('span')?.textContent?.trim() || '';
  if (!FIELD_LABELS.has(caption)) return;
  const input = label.querySelector<HTMLInputElement>('input[type="text"], input:not([type])');
  if (!input) return;

  label.dataset.cloudinaryPolishPreview = '1';
  const preview = document.createElement('div');
  preview.dataset.cloudinaryPolishNode = '1';
  preview.className = 'mt-1 hidden min-w-0 items-center gap-2 rounded-lg border border-white/8 bg-black/25 p-1.5';
  preview.innerHTML = [
    '<span class="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border border-white/10 bg-black">',
    '<img data-cloudinary-polish-img="1" alt="Vista previa actual" class="h-full w-full object-cover" />',
    '</span>',
    '<span class="min-w-0 flex-1">',
    '<b class="block text-[8px] font-black uppercase tracking-[.12em] text-white/35">Actual</b>',
    '<small data-cloudinary-polish-url="1" class="block truncate text-[8px] text-white/28"></small>',
    '</span>',
  ].join('');

  const image = preview.querySelector<HTMLImageElement>('[data-cloudinary-polish-img="1"]');
  const urlText = preview.querySelector<HTMLElement>('[data-cloudinary-polish-url="1"]');

  const render = () => {
    const value = input.value.trim();
    if (!image || !urlText || !looksLikeImageUrl(value)) {
      preview.classList.add('hidden');
      preview.classList.remove('flex');
      return;
    }
    image.src = value;
    urlText.textContent = value;
    preview.classList.remove('hidden');
    preview.classList.add('flex');
  };

  image?.addEventListener('error', () => {
    preview.classList.add('hidden');
    preview.classList.remove('flex');
  });
  input.addEventListener('input', render);
  input.addEventListener('change', render);

  const cloudinaryButton = label.querySelector<HTMLElement>('[data-cloudinary-bridge-button="1"]');
  if (cloudinaryButton) label.insertBefore(preview, cloudinaryButton);
  else label.appendChild(preview);
  render();
}

export default function VisualCmsCloudinaryPolish() {
  useEffect(() => {
    const scan = () => {
      document.querySelectorAll<HTMLLabelElement>('label').forEach(mountFieldPreview);
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.querySelectorAll<HTMLElement>('[data-cloudinary-polish-node="1"]').forEach((node) => node.remove());
      document.querySelectorAll<HTMLElement>('[data-cloudinary-polish-preview="1"]').forEach((node) => delete node.dataset.cloudinaryPolishPreview);
    };
  }, []);

  return null;
}
