import { track } from "@/lib/analytics";

type FeedQueryScope =
  | "social-feed-posts"
  | "reels-feed-grid"
  | "customer-feed";

type FeedQueryErrorKind =
  | "aborted"
  | "auth"
  | "permission"
  | "not_found"
  | "bad_request"
  | "network"
  | "server"
  | "unknown";

interface FeedQueryErrorReport {
  scope: FeedQueryScope;
  queryKey: string;
  userId?: string | null;
  tab?: string | null;
  pageSize?: number;
  pageMultiplier?: number;
}

interface ErrorLike {
  message?: string;
  status?: number;
  code?: string | number;
  name?: string;
}

function toErrorLike(error: unknown): ErrorLike {
  if (!error || typeof error !== "object") return {};
  return error as ErrorLike;
}

function classifyFeedError(error: unknown): FeedQueryErrorKind {
  const e = toErrorLike(error);
  const message = String(e.message || "").toLowerCase();
  const status = Number(e.status || e.code || 0);

  if (e.name === "AbortError" || message.includes("abort")) return "aborted";
  if (status === 400 || message.includes("bad request")) return "bad_request";
  if (status === 401 || message.includes("unauthorized") || message.includes("auth")) return "auth";
  if (status === 403 || message.includes("permission") || message.includes("rls")) return "permission";
  if (status === 404 || message.includes("not found")) return "not_found";
  if (status >= 500) return "server";
  if (
    message.includes("network")
    || message.includes("fetch")
    || message.includes("failed to fetch")
    || message.includes("timeout")
  ) {
    return "network";
  }
  return "unknown";
}

export function reportFeedQueryError(report: FeedQueryErrorReport, error: unknown) {
  const kind = classifyFeedError(error);

  // Request cancellation is expected with AbortSignal wiring and should not pollute telemetry.
  if (kind === "aborted") return;

  const e = toErrorLike(error);
  const status = Number(e.status || e.code || 0) || null;
  const message = String(e.message || "unknown error").slice(0, 240);

  track("feed_query_error", {
    scope: report.scope,
    query_key: report.queryKey,
    user_id: report.userId ?? null,
    tab: report.tab ?? null,
    page_size: report.pageSize ?? null,
    page_multiplier: report.pageMultiplier ?? null,
    error_kind: kind,
    error_status: status,
    error_message: message,
    dedupeMs: 6000,
  });

  if (import.meta.env.DEV) {
    console.warn("[feed_query_error]", {
      ...report,
      errorKind: kind,
      status,
      message,
    });
  }
}
