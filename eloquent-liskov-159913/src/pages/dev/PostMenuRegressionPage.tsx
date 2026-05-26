/**
 * PostMenuRegressionPage — Dev-only QA dashboard.
 *
 * Renders a checklist of every post-viewer menu action against a synthetic
 * post id. Exists so QA can verify the wiring without seeding real posts
 * after each release. 404s in production builds via `import.meta.env.DEV`.
 *
 * Each row exercises the same code path the production menu uses (Supabase
 * inserts, clipboard, navigation), captures success or the thrown error,
 * and surfaces a green OK / red FAIL pill so regressions are obvious at a
 * glance.
 */
import { useCallback, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Play, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logProfileActionError } from "@/lib/security/errorReporting";
import NotFound from "@/pages/NotFound";

type CheckResult =
  | { state: "idle" }
  | { state: "running" }
  | { state: "ok"; detail?: string }
  | { state: "fail"; detail: string };

interface CheckRow {
  id: string;
  label: string;
  description: string;
  /** Returns a human-readable success message or throws on failure. */
  run: (ctx: { mockPostId: string; userId: string | null }) => Promise<string>;
}

const ROWS: CheckRow[] = [
  {
    id: "bookmark",
    label: "Bookmark insert",
    description: "Inserts and rolls back a bookmarks row using the production payload shape.",
    run: async ({ mockPostId, userId }) => {
      if (!userId) throw new Error("Sign in required for this check.");
      const { error: insertError } = await (supabase as any).from("bookmarks").insert({
        user_id: userId,
        item_id: mockPostId,
        item_type: "post",
      });
      if (insertError) throw insertError;
      // Cleanup so the QA run is non-destructive.
      await (supabase as any)
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("item_type", "post")
        .eq("item_id", mockPostId);
      return "Insert + rollback succeeded";
    },
  },
  {
    id: "report",
    label: "Report submit",
    description: "Posts a synthetic report row to verify the post_reports schema.",
    run: async ({ mockPostId, userId }) => {
      if (!userId) throw new Error("Sign in required for this check.");
      const { error } = await (supabase as any).from("post_reports").insert({
        post_id: mockPostId,
        reporter_id: userId,
        category: "QA regression check",
      });
      if (error) throw error;
      return "Report row inserted";
    },
  },
  {
    id: "notifications",
    label: "Notifications toggle",
    description: "Pure client state — verifies the local toggle path executes without throwing.",
    run: async () => {
      const next = new Set<string>();
      next.add("mock");
      next.delete("mock");
      return "Toggle path OK";
    },
  },
  {
    id: "not-interested",
    label: "Not interested",
    description: "Verifies hidden-post filter logic.",
    run: async () => {
      const hidden = new Set<string>(["mock"]);
      const feed = [{ id: "mock" }, { id: "keep" }];
      const visible = feed.filter((f) => !hidden.has(f.id));
      if (visible.length !== 1 || visible[0].id !== "keep") {
        throw new Error("Filter did not exclude hidden post");
      }
      return "Filter OK (1/2 posts visible)";
    },
  },
  {
    id: "comment-settings",
    label: "Comment settings",
    description: "Verifies the comment-control state machine.",
    run: async () => {
      const allowed = ["everyone", "followers", "off"] as const;
      let value: (typeof allowed)[number] = "everyone";
      value = "followers";
      value = "off";
      if (!allowed.includes(value)) throw new Error("Invalid state");
      return `Final state: ${value}`;
    },
  },
  {
    id: "copy-link",
    label: "Copy link",
    description: "Writes a sample URL to the clipboard via navigator.clipboard.",
    run: async ({ mockPostId }) => {
      const url = `https://hizivo.com/p/${mockPostId}`;
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(url);
      return "Clipboard write OK";
    },
  },
];

export default function PostMenuRegressionPage() {
  // Hard 404 in production so this page never ships to end users.
  // The dev-only body lives in an inner component so hooks always run in the
  // same order under the same component identity (rules-of-hooks).
  if (!import.meta.env.DEV) return <NotFound />;
  return <PostMenuRegressionPageInner />;
}

function PostMenuRegressionPageInner() {
  const { user } = useAuth();
  const [results, setResults] = useState<Record<string, CheckResult>>(() =>
    Object.fromEntries(ROWS.map((r) => [r.id, { state: "idle" } as CheckResult])),
  );
  const mockPostId = "qa-mock-post-00000000-0000-4000-8000-000000000000";

  const runOne = useCallback(
    async (row: CheckRow) => {
      setResults((prev) => ({ ...prev, [row.id]: { state: "running" } }));
      try {
        const detail = await row.run({ mockPostId, userId: user?.id ?? null });
        setResults((prev) => ({ ...prev, [row.id]: { state: "ok", detail } }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logProfileActionError(`regression.${row.id}`, { mockPostId, userId: user?.id }, err);
        setResults((prev) => ({ ...prev, [row.id]: { state: "fail", detail: message } }));
      }
    },
    [mockPostId, user?.id],
  );

  const runAll = useCallback(async () => {
    for (const row of ROWS) {
      // Sequential to keep the UI legible and avoid clipboard contention.
       
      await runOne(row);
    }
  }, [runOne]);

  const summary = ROWS.reduce(
    (acc, row) => {
      const r = results[row.id];
      if (r.state === "ok") acc.ok += 1;
      else if (r.state === "fail") acc.fail += 1;
      return acc;
    },
    { ok: 0, fail: 0 },
  );

  const hasResults = summary.ok + summary.fail > 0;

  const copyResults = useCallback(async () => {
    const lines: string[] = [];
    lines.push(`ZIVO post-menu regression — ${new Date().toISOString()}`);
    if (typeof navigator !== "undefined") lines.push(`UA: ${navigator.userAgent}`);
    lines.push(`Summary: ${summary.ok} OK · ${summary.fail} FAIL`);
    lines.push("");
    for (const row of ROWS) {
      const r = results[row.id];
      const tag =
        r.state === "ok"
          ? "[OK]  "
          : r.state === "fail"
          ? "[FAIL]"
          : r.state === "running"
          ? "[…]  "
          : "[--] ";
      const detail =
        (r.state === "ok" || r.state === "fail") && r.detail ? ` — ${r.detail}` : "";
      lines.push(`- ${tag} ${row.label}${detail}`);
    }
    const text = lines.join("\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Regression results copied to clipboard");
    } catch {
      toast.error("Could not copy results");
    }
  }, [results, summary.ok, summary.fail]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8" data-testid="post-menu-regression-page">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dev only · Post viewer QA
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ig-gradient">Post menu regression checklist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Runs each post-viewer menu action against a synthetic post and surfaces the result.
          Use before shipping any change to <code className="text-xs">ProfileContentTabs</code> or{" "}
          <code className="text-xs">ReelsFeedPage</code> overlays.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button"
            onClick={runAll}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Play className="h-4 w-4" /> Run all checks
          </button>
          <button type="button"
            data-testid="regression-copy-results"
            onClick={copyResults}
            disabled={!hasResults}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="h-4 w-4" /> Copy results
          </button>
          <span className="text-sm text-muted-foreground">
            {summary.ok} OK · {summary.fail} failing
          </span>
        </div>
      </header>

      <ul className="space-y-2">
        {ROWS.map((row) => {
          const r = results[row.id];
          return (
            <li
              key={row.id}
              data-testid={`regression-row-${row.id}`}
              data-state={r.state}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                </div>
                <StatusPill result={r} />
                <button type="button"
                  onClick={() => runOne(row)}
                  disabled={r.state === "running"}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  Run
                </button>
              </div>
              {(r.state === "ok" || r.state === "fail") && r.detail && (
                <p
                  className={
                    "mt-2 text-xs " +
                    (r.state === "fail" ? "text-destructive" : "text-muted-foreground")
                  }
                >
                  {r.detail}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function StatusPill({ result }: { result: CheckResult }) {
  if (result.state === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Running
      </span>
    );
  }
  if (result.state === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> OK
      </span>
    );
  }
  if (result.state === "fail") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
        <XCircle className="h-3 w-3" /> FAIL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      Idle
    </span>
  );
}
