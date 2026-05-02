'use client';

/**
 * EditorRoot
 *
 * Top-level client component for the integrated 3D editor.
 *
 *   • Picks the responsive shell via `useIsMobile()` instead of CSS-only
 *     media queries so the mobile-only gesture / drawer code never mounts on
 *     desktops (and vice-versa).
 *   • Owns the shared keyboard-shortcut binding.
 *   • Renders both shells server-side as `null` (the page imports this with
 *     `dynamic({ ssr: false })`, so SSR never reaches here anyway, but the
 *     initial client paint is also a no-op until media queries resolve).
 */

import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useIsMobile from './hooks/useIsMobile';
import DesktopShell from './responsive/DesktopShell';
import MobileShell from './responsive/MobileShell';

export default function EditorRoot() {
  useKeyboardShortcuts();
  const { isMobile } = useIsMobile();

  return (
    <main
      className="fixed inset-0 z-0 overflow-hidden bg-neutral-950 text-neutral-100 h-[100dvh] w-[100dvw]"
      // Disabling overscroll & touch-callout site-wide on this route prevents
      // the iOS pull-to-refresh and long-press magnifier from interfering
      // with 3D drag gestures.
      style={{ WebkitTouchCallout: 'none' }}
    >
      {isMobile ? <MobileShell /> : <DesktopShell />}
    </main>
  );
}
