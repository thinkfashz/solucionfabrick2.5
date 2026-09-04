'use client';

import { useEffect } from 'react';

const STYLE_ID = 'sf-visual-cms-workspace-style';

export default function VisualCmsWorkspaceBridge() {
  useEffect(() => {
    const content = document.querySelector<HTMLElement>('main[data-admin-content]');
    if (!content) return;

    content.dataset.visualCmsWorkspace = '1';

    const notices = document.querySelector<HTMLElement>('.fabrick-admin-notices');
    const previousNoticesDisplay = notices?.style.display || '';
    if (notices) notices.style.display = 'none';

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        main[data-admin-content][data-visual-cms-workspace="1"] {
          padding: 0 !important;
          padding-bottom: 0 !important;
          overflow: hidden !important;
        }
        main[data-admin-content][data-visual-cms-workspace="1"] > :first-child {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
        }
        main[data-admin-content][data-visual-cms-workspace="1"] [data-sf-visual-editor-root="1"] {
          height: calc(100dvh - var(--fa-topbar-height)) !important;
          min-height: 0 !important;
        }
        @media (max-width: 900px) {
          main[data-admin-content][data-visual-cms-workspace="1"] [data-sf-visual-editor-root="1"] {
            height: calc(100svh - 64px) !important;
            height: calc(100dvh - 64px) !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      delete content.dataset.visualCmsWorkspace;
      if (notices) notices.style.display = previousNoticesDisplay;
    };
  }, []);

  return null;
}
