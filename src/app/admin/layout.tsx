import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/AdminShell';
import AdminBaseThemeFrame from '@/components/admin/AdminBaseThemeFrame';
import { StudioShell } from '@/components/admin-studio';
import './studio-theme.css';

export const metadata: Metadata = {
  title: 'Admin | Fabrick',
  description: 'Panel de administración Fabrick',
};

// Force per-request rendering for every /admin/* route.
//
// Two reasons this is required:
//
// 1. CSP nonce matching. `src/middleware.ts` emits a strict, per-request
//    Content-Security-Policy with a fresh nonce on every HTML navigation. If a
//    route is statically prerendered at build time, Next.js bakes a
//    build-time nonce into the hydration <script> tags. That nonce won't match
//    the runtime CSP header, so the browser blocks the bootstrap scripts and
//    the admin panel renders as a blank (black) screen — this is the exact
//    symptom reported on /admin/login (Vercel logs showed the response as a
//    CDN cache HIT with 304 Not Modified).
//
// 2. Admin pages are personalized and auth-gated; they should never be cached
//    at the edge. Forcing dynamic rendering also sets an appropriate
//    Cache-Control so Vercel's CDN doesn't serve stale HTML to new visitors.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── Fabrick (default) shell ─────────────────────────────
          Visible when body does NOT have data-admin-theme="studio".
          The CSS in studio-theme.css hides this div when Studio is active.
      ──────────────────────────────────────────────────────────── */}
      <div id="shell-fabrick" className="fabrick-shell">
        <AdminBaseThemeFrame>
          <AdminShell>{children}</AdminShell>
        </AdminBaseThemeFrame>
      </div>

      {/* ── Studio Admin shell ──────────────────────────────────
          Hidden by default; shown when body[data-admin-theme="studio"].
          The CSS in studio-theme.css toggles visibility.
      ──────────────────────────────────────────────────────────── */}
      <div id="shell-studio" className="studio-shell" style={{ display: 'none' }}>
        <StudioShell>{children}</StudioShell>
      </div>
    </>
  );
}
