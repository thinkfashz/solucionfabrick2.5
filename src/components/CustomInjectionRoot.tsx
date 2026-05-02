import 'server-only';
import { headers } from 'next/headers';
import { getSiteSection } from '@/lib/siteStructure';

/**
 * Server component that renders the admin-authored "Custom Injection" block.
 *
 * SECURITY:
 *   - This block is *only ever* writable through `/api/admin/site-structure/custom-injection`,
 *     which is gated by the admin session cookie. There is no anonymous write path.
 *   - The HTML/CSS/JS strings are rendered with `dangerouslySetInnerHTML`. We
 *     stamp the per-request CSP nonce on the inline `<script>` so the strict
 *     nonce-CSP allows it to execute (without weakening protection for any
 *     other inline script).
 *   - When `enabled` is false (the default), nothing is emitted at all.
 *
 * Render this component twice from the root layout — once inside `<head>` for
 * the CSS branch (CSS variables / sitewide overrides), and once before
 * `</body>` for the body-end html/js branches plus `head.html` (which is
 * rendered at the top of body and surfaces analytics-snippet-style markup
 * without resorting to a non-standard `<span>` inside `<head>`).
 */
export default async function CustomInjectionRoot({ slot }: { slot: 'head' | 'bodyEnd' }) {
  const injection = await getSiteSection('custom-injection');
  if (!injection.enabled) return null;
  const nonce = (await headers()).get('x-nonce') ?? '';

  if (slot === 'head') {
    // Only CSS lives in <head>. Free-form HTML is rendered in the body slot
    // because injecting arbitrary tags into <head> via React requires a
    // non-standard wrapper element (browsers tolerate it, but parsers /
    // strict validators do not). Analytics snippets that traditionally
    // ship in <head> work equivalently when rendered at the top of <body>.
    if (!injection.css) return null;
    return (
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: injection.css }}
        data-cms="custom-injection-css"
      />
    );
  }

  // bodyEnd slot — rendered just before `</body>`.
  return (
    <>
      {injection.head?.html ? (
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: injection.head.html }}
          data-cms="custom-injection-head-html"
        />
      ) : null}
      {injection.bodyEnd?.html ? (
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: injection.bodyEnd.html }}
          data-cms="custom-injection-body"
        />
      ) : null}
      {injection.bodyEnd?.js ? (
        <script
          nonce={nonce}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: injection.bodyEnd.js }}
          data-cms="custom-injection-js"
        />
      ) : null}
    </>
  );
}
