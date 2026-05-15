import * as Sentry from "@sentry/react";

export function identifyUserInSentry(supabaseUser) {
  if (!supabaseUser) return;

  Sentry.setUser({
    id: supabaseUser.id,
    email: supabaseUser.email,
  });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}