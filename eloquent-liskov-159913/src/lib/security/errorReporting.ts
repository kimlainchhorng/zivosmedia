/**
 * Global Error Reporting & Monitoring
 * Captures unhandled errors and rejections, logs them to Supabase for admin review.
 */
// Lazy-import supabase to avoid pulling the vendor chunk into the critical path
let _supabase: typeof import("@/integrations/supabase/client").supabase | null = null;
async function getSupabase() {
  if (!_supabase) {
    const mod = await import("@/integrations/supabase/client");
    _supabase = mod.supabase;
  }
  return _supabase;
}

interface ErrorReport {
  type: "error" | "rejection" | "network";
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  sessionId: string;
}

let sessionId = "";

function getSessionId(): string {
  if (!sessionId) {
    sessionId =
      sessionStorage.getItem("zivo_error_session") ||
      crypto.randomUUID();
    sessionStorage.setItem("zivo_error_session", sessionId);
  }
  return sessionId;
}

const recentErrors = new Set<string>();
const MAX_RECENT = 50;

function isDuplicate(key: string): boolean {
  if (recentErrors.has(key)) return true;
  recentErrors.add(key);
  if (recentErrors.size > MAX_RECENT) {
    const first = recentErrors.values().next().value;
    if (first) recentErrors.delete(first);
  }
  return false;
}

async function reportError(report: ErrorReport): Promise<void> {
  const dedupeKey = `${report.type}:${report.message}`;
  if (isDuplicate(dedupeKey)) return;

  // Log locally
  console.error(`[ErrorMonitor] ${report.type}: ${report.message}`);

  // Attempt to log to Supabase analytics_events table
  try {
    const supabase = await getSupabase();
    await supabase.from("analytics_events").insert({
      event_name: "client_error",
      session_id: report.sessionId,
      page: report.url,
      meta: {
        type: report.type,
        message: report.message.slice(0, 500),
        stack: report.stack?.slice(0, 1000),
        user_agent: report.userAgent,
      },
    });
  } catch {
    // Silently fail - don't create error loops
  }
}

export function setupGlobalErrorHandlers(): void {
  window.addEventListener("unhandledrejection", (event) => {
    const message =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
    const stack =
      event.reason instanceof Error ? event.reason.stack : undefined;

    reportError({
      type: "rejection",
      message,
      stack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId: getSessionId(),
    });
  });

  window.addEventListener("error", (event) => {
    const message = event.error?.message || event.message || "Unknown error";
    const stack = event.error?.stack;

    reportError({
      type: "error",
      message,
      stack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId: getSessionId(),
    });
  });
}

/**
 * Structured logger for profile / social action failures (bookmark toggle,
 * post menu actions, caption edits, deletes, report submissions). Captures
 * the action name and a small JSON-safe context blob so we can trace
 * future schema-cache or RLS regressions without spamming the user.
 *
 * Always silent — never throws. Trimmed to ~1 KB and deduped.
 */
export function logProfileActionError(
  action: string,
  ctx: Record<string, unknown>,
  error: unknown,
): void {
  try {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;

    let serializedCtx = "";
    try {
      serializedCtx = JSON.stringify(ctx).slice(0, 1024);
    } catch {
      serializedCtx = "[unserializable context]";
    }

    const dedupeKey = `profile_action:${action}:${message}`;
    if (isDuplicate(dedupeKey)) return;

    console.error(`[ProfileAction:${action}]`, message, ctx);

    // Fire-and-forget Supabase write
    void (async () => {
      try {
        const supabase = await getSupabase();
        await supabase.from("analytics_events").insert({
          event_name: "profile_action_error",
          session_id: getSessionId(),
          page: typeof window !== "undefined" ? window.location.href : "",
          meta: {
            action,
            message: message.slice(0, 500),
            stack: stack?.slice(0, 1000),
            ctx: serializedCtx,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          },
        });
      } catch {
        // Silent — never create error loops.
      }
    })();
  } catch {
    // Truly never throw from logging.
  }
}

/**
 * Lightweight gesture telemetry for the post-viewer drag-to-dismiss flow.
 * Captures aborted swipes, failed pointer captures, and a sampled stream of
 * successful dismissals so future gesture regressions are diagnosable
 * without console spam. Always silent, ≤512B payload, deduped per session.
 */
export function logGestureEvent(
  kind: string,
  ctx: Record<string, unknown> = {},
): void {
  try {
    let serializedCtx = "";
    try {
      serializedCtx = JSON.stringify(ctx).slice(0, 512);
    } catch {
      serializedCtx = "[unserializable context]";
    }

    // Per-session dedupe — the same kind+ctx digest only logs once.
    const dedupeKey = `gesture:${kind}:${serializedCtx}`;
    if (isDuplicate(dedupeKey)) return;

    void (async () => {
      try {
        const supabase = await getSupabase();
        await supabase.from("analytics_events").insert({
          event_name: "gesture_event",
          session_id: getSessionId(),
          page: typeof window !== "undefined" ? window.location.href : "",
          meta: {
            kind,
            ctx: serializedCtx,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          },
        });
      } catch {
        // Silent — never create error loops.
      }
    })();
  } catch {
    // Truly never throw from logging.
  }
}
