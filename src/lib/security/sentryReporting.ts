type SentryModule = typeof import("@sentry/browser");
let client: Promise<SentryModule> | undefined;

/** Optional error-only reporting. No startup SDK, replay, user details or breadcrumbs. */
export async function reportToSentry(error: Error, category: "global" | "route" | "error" | "rejection" | "network"): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn || !import.meta.env.PROD) return;
  try {
    if (!client) client = import("@sentry/browser").then(sentry => {
      sentry.init({
        dsn,
        environment: "production",
        defaultIntegrations: false,
        sendDefaultPii: false,
        maxBreadcrumbs: 0,
        tracesSampleRate: 0,
        beforeSend(event) {
          // Error strings and URLs may contain login data. Keep error type and
          // asset stack locations while removing user-supplied diagnostic text.
          delete event.user; delete event.request; delete event.breadcrumbs;
          delete event.extra; delete event.contexts; delete event.message;
          for (const exception of event.exception?.values || []) {
            exception.value = "Application error";
            if (exception.stacktrace?.frames) exception.stacktrace.frames = exception.stacktrace.frames.map(frame => {
              let filename: string | undefined;
              try { const url = new URL(frame.filename || ""); if (url.pathname.startsWith("/assets/")) filename = url.origin + url.pathname; } catch { /* Non-asset locations are omitted. */ }
              return { filename, lineno: frame.lineno, colno: frame.colno, function: frame.function, in_app: frame.in_app };
            });
          }
          return event;
        },
      });
      return sentry;
    });
    (await client).captureException(error, { tags: { category } });
  } catch { client = undefined; /* Monitoring must not break recovery. */ }
}
