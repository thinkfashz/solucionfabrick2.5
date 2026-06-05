'use client';

import { useEffect } from 'react';
import { useSiteConfigContextOrNull } from '@/context/SiteConfigContext';

/**
 * CmsPreviewOverlay
 *
 * This component is injected into the root layout and renders only when the
 * page is mounted with `?cms=preview` (indicated by `previewMode` in the
 * SiteConfigContext).
 *
 * It attaches a global click listener that intercepts clicks on any element
 * carrying a `data-cms-id` attribute. When such an element is clicked, it
 * prevents the default action (e.g. following a link) and posts a message
 * to the parent window (the admin editor) to select the corresponding section.
 *
 * It also injects a small CSS snippet to provide a visual hover outline,
 * turning the public page into a clickable, live-editable canvas.
 */
export default function CmsPreviewOverlay() {
  const ctx = useSiteConfigContextOrNull();

  useEffect(() => {
    // Only activate in preview mode
    if (!ctx?.previewMode) return;

    // 1. Inject global hover styles for editable elements
    const styleId = 'cms-preview-overlay-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        [data-cms-id] {
          cursor: pointer !important;
          position: relative;
          transition: outline 0.2s ease-in-out;
        }
        [data-cms-id]:hover {
          outline: 2px dashed rgba(250, 204, 21, 0.7) !important;
          outline-offset: -2px;
        }
        [data-cms-id]:hover::after {
          content: 'Editar';
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.8);
          color: #facc15;
          font-size: 10px;
          font-family: monospace;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid rgba(250, 204, 21, 0.3);
          pointer-events: none;
          z-index: 9999;
        }
      `;
      document.head.appendChild(style);
    }

    // 2. Attach global click listener
    const handleClick = (e: MouseEvent) => {
      // Find the closest ancestor with a data-cms-id
      const target = e.target as HTMLElement;
      const editableEl = target.closest('[data-cms-id]');

      if (editableEl) {
        e.preventDefault();
        e.stopPropagation();

        const cmsId = editableEl.getAttribute('data-cms-id');

        // Post message to the parent editor window
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'cms:select', id: cmsId }, window.location.origin);
        }
      }
    };

    // Capture phase ensures we intercept before normal React onClick handlers
    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      const styleEl = document.getElementById(styleId);
      if (styleEl) styleEl.remove();
    };
  }, [ctx?.previewMode]);

  if (!ctx?.previewMode) return null;

  return null;
}
