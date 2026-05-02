'use client';

// Top-level App Router global error boundary. Catches errors thrown during
// React render in any route segment and forwards them to Sentry. Without
// this file, unhandled render errors only show up in the browser console
// and never reach the dashboard.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#react-render-errors-in-app-router
import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        {/* `NextError` is the default Next.js error page component. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
