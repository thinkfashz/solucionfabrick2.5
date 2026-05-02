import 'server-only';
import { getSiteSection } from '@/lib/siteStructure';

/**
 * Emits the admin-authored color/typography tokens as CSS variables on
 * `:root`, so any component (including hardcoded ones not yet refactored to
 * `useSiteContent`) can opt-in by referencing `var(--cms-accent)` etc.
 *
 * Rendered inside `<head>` from the root layout. Inline `<style>` is
 * permitted by CSP `style-src 'unsafe-inline'`.
 */
export default async function GlobalStylesRoot() {
  const styles = await getSiteSection('global-styles');
  const css = `:root{
  --cms-accent:${styles.colors.accent};
  --cms-accent-soft:${styles.colors.accentSoft};
  --cms-bg:${styles.colors.background};
  --cms-fg:${styles.colors.foreground};
}`;
  return (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: css }}
      data-cms="global-styles"
    />
  );
}
