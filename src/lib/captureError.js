import * as Sentry from "@sentry/react";

export function captureError(error, context = {}) {
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      if (typeof value === "string" || typeof value === "number") {
        scope.setTag(key, value);
      } else {
        scope.setExtra(key, value);
      }
    });

    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error))
    );
  });

  if (import.meta.env.MODE !== "production") {
    console.error("[captureError]", error, context);
  }
}