// This file configures the initialization of Sentry on the browser/client side.
// The config you add here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProd = process.env.NODE_ENV === 'production';

// Only initialise Sentry in production builds with a configured DSN, so local
// development noise never reaches the dashboard.
if (isProd && dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? 'production',
    // Performance Monitoring – 10% of transactions in prod is a sane default.
    tracesSampleRate: 0.1,
    // Capture replay only on errors to keep volume manageable.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Don't print debug logs in production.
    debug: false,
    enabled: true,
  });
}
