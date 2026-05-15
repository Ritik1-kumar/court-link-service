import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.MODE === "production",
  tracesSampleRate: 1.0,

  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Network request failed",
    "ChunkLoadError",
  ],

  beforeSend(event) {
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});