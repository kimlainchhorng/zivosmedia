import { useSyncExternalStore } from "react";

export type RequestIssueScope = "query" | "mutation" | "retry";
export type RequestIssueCategory = "network" | "auth" | "database" | "rate_limit" | "unknown";
export type RequestIssueRoute = "home" | "feed" | "reels" | "chat" | "profile" | "other";

export interface RequestIssue {
  timestamp: number;
  scope: RequestIssueScope;
  category: RequestIssueCategory;
  route: RequestIssueRoute;
  status: number | null;
  retryable: boolean;
  key?: string;
  path?: string;
}

type RequestHealthState = {
  totalIssues: number;
  byScope: Record<RequestIssueScope, number>;
  byCategory: Record<RequestIssueCategory, number>;
  byRoute: Record<RequestIssueRoute, number>;
  byStatus: Record<string, number>;
  recent: RequestIssue[];
};

const MAX_RECENT_ISSUES = 40;

let state: RequestHealthState = {
  totalIssues: 0,
  byScope: {
    query: 0,
    mutation: 0,
    retry: 0,
  },
  byCategory: {
    network: 0,
    auth: 0,
    database: 0,
    rate_limit: 0,
    unknown: 0,
  },
  byRoute: {
    home: 0,
    feed: 0,
    reels: 0,
    chat: 0,
    profile: 0,
    other: 0,
  },
  byStatus: {},
  recent: [],
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function routeFromPath(path?: string): RequestIssueRoute {
  const normalized = String(path || "").trim().toLowerCase();
  if (normalized === "/" || normalized.startsWith("/home")) return "home";
  if (normalized.startsWith("/feed")) return "feed";
  if (normalized.startsWith("/reels")) return "reels";
  if (normalized.startsWith("/chat")) return "chat";
  if (normalized.startsWith("/profile") || normalized.startsWith("/account")) return "profile";
  return "other";
}

export function recordRequestIssue(issue: Omit<RequestIssue, "timestamp" | "route"> & { route?: RequestIssueRoute }) {
  const next: RequestIssue = {
    timestamp: Date.now(),
    ...issue,
    route: issue.route || routeFromPath(issue.path),
  };

  state = {
    ...state,
    totalIssues: state.totalIssues + 1,
    byScope: {
      ...state.byScope,
      [next.scope]: state.byScope[next.scope] + 1,
    },
    byCategory: {
      ...state.byCategory,
      [next.category]: state.byCategory[next.category] + 1,
    },
    byRoute: {
      ...state.byRoute,
      [next.route]: state.byRoute[next.route] + 1,
    },
    byStatus: {
      ...state.byStatus,
      [next.status === null ? "unknown" : String(next.status)]: (state.byStatus[next.status === null ? "unknown" : String(next.status)] || 0) + 1,
    },
    recent: [next, ...state.recent].slice(0, MAX_RECENT_ISSUES),
  };

  notify();
}

export function clearRequestHealth() {
  state = {
    totalIssues: 0,
    byScope: {
      query: 0,
      mutation: 0,
      retry: 0,
    },
    byCategory: {
      network: 0,
      auth: 0,
      database: 0,
      rate_limit: 0,
      unknown: 0,
    },
    byRoute: {
      home: 0,
      feed: 0,
      reels: 0,
      chat: 0,
      profile: 0,
      other: 0,
    },
    byStatus: {},
    recent: [],
  };
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useRequestHealthSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
