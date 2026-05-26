/**
 * StoryDebugPanel — floating in-app diagnostic for the Stories pipeline.
 *
 * Shows in real time:
 *   - Whether the current user has an active story in the DB (direct query,
 *     bypassing every cache).
 *   - Whether each carousel cache (Feed / Profile / Chat) currently contains
 *     that story id, plus row count + last update time.
 *   - A "Force refresh all" button that runs `invalidateAllStoryCaches`.
 *
 * Visibility gate: only renders when `?debug=stories` is in the URL OR
 * `localStorage.zivo_debug_stories === '1'`. Invisible by default in prod.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, X, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invalidateAllStoryCaches } from "@/lib/storiesCache";
import { cn } from "@/lib/utils";

interface MyStoryRow {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  expires_at: string;
}

function isDebugEnabled() {
  if (typeof window === "undefined") return false;
  if (window.location.search.includes("debug=stories")) {
    try {
      window.localStorage.setItem("zivo_debug_stories", "1");
    } catch {}
    return true;
  }
  try {
    return window.localStorage.getItem("zivo_debug_stories") === "1";
  } catch {
    return false;
  }
}

export default function StoryDebugPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isDebugEnabled());
  }, []);

  // Direct DB check — bypasses every cache so we can confirm RLS + row exists
  const {
    data: dbRows = [],
    refetch: refetchDb,
    isFetching: dbFetching,
    dataUpdatedAt: dbAt,
    error: dbError,
  } = useQuery({
    queryKey: ["debug-my-stories", user?.id],
    enabled: !!user?.id && enabled && open,
    refetchInterval: open ? 5000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories" as any)
        .select("id, media_url, media_type, created_at, expires_at")
        .eq("user_id", user!.id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as any[]) || []) as MyStoryRow[];
    },
  });

  const myStoryIds = useMemo(() => new Set(dbRows.map((r) => r.id)), [dbRows]);

  // Inspect each carousel's cache (no fetching, just reading react-query state)
  const cacheChecks = useMemo(() => {
    if (!enabled || !open || !user?.id) return [];
    const targets: Array<{ label: string; key: readonly unknown[] }> = [
      { label: "Feed carousel", key: ["feed-story-users"] },
      { label: "Profile carousel", key: ["profile-story-rings", user.id] },
      { label: "Chat carousel", key: ["user-stories"] },
    ];
    return targets.map((t) => {
      const state = queryClient.getQueryState(t.key as any);
      const data = (state?.data ?? []) as any[];
      let containsMyStory = false;
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.id && myStoryIds.has(item.id)) {
            containsMyStory = true;
            break;
          }
          // ChatStories shape: storyGroups with nested stories
          if (Array.isArray(item?.stories)) {
            for (const s of item.stories) {
              if (s?.id && myStoryIds.has(s.id)) {
                containsMyStory = true;
                break;
              }
            }
          }
        }
      }
      return {
        label: t.label,
        cacheStatus: state?.status ?? "missing",
        updatedAt: state?.dataUpdatedAt ?? 0,
        rowCount: Array.isArray(data) ? data.length : 0,
        containsMyStory,
      };
    });
    // Re-run when the DB result changes (dbAt) so the green dot updates live.
  }, [enabled, open, user?.id, queryClient, myStoryIds, dbAt]);

  if (!enabled || !user) return null;

  const fmtTime = (ts: number) =>
    ts ? new Date(ts).toLocaleTimeString() : "never";

  return (
    <>
      {/* Toggle button */}
      <button type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-3 z-[2000] h-11 w-11 rounded-full bg-foreground text-background shadow-lg flex items-center justify-center active:scale-95"
        aria-label="Story debug panel"
      >
        <Bug className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed bottom-40 right-3 z-[2000] w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-4 text-xs">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold flex items-center gap-1.5">
              <Bug className="h-4 w-4" /> Stories debug
            </p>
            <button type="button"
              onClick={() => setOpen(false)}
              className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* DB section */}
          <div className="rounded-xl border border-border/60 p-3 mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-bold uppercase tracking-wide text-[10px] text-muted-foreground">
                Database (direct)
              </p>
              <button type="button"
                onClick={() => refetchDb()}
                disabled={dbFetching}
                className="h-6 px-2 rounded-full bg-muted text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3 w-3", dbFetching && "animate-spin")} /> Refetch
              </button>
            </div>
            {dbError ? (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="break-all">{(dbError as Error).message}</span>
              </div>
            ) : dbRows.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>
                  <b>{dbRows.length}</b> active{" "}
                  {dbRows.length === 1 ? "story" : "stories"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                <span>No active stories for your account</span>
              </div>
            )}
            {dbRows[0] && (
              <p className="mt-1 text-[10px] text-muted-foreground break-all">
                Latest id: {dbRows[0].id.slice(0, 8)}… · expires{" "}
                {new Date(dbRows[0].expires_at).toLocaleTimeString()}
              </p>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">
              Last fetched: {fmtTime(dbAt)}
            </p>
          </div>

          {/* Cache section */}
          <div className="rounded-xl border border-border/60 p-3 mb-2 space-y-1.5">
            <p className="font-bold uppercase tracking-wide text-[10px] text-muted-foreground mb-0.5">
              Carousel caches
            </p>
            {cacheChecks.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {c.containsMyStory ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="font-medium truncate">{c.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {c.cacheStatus} · {c.rowCount} · {fmtTime(c.updatedAt)}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1">
              Green = your latest story id is in this cache.
            </p>
          </div>

          {/* Actions */}
          <button type="button"
            onClick={() => {
              invalidateAllStoryCaches(queryClient, user.id);
              refetchDb();
            }}
            className="w-full h-9 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Force refresh all
          </button>

          <p className="mt-2 text-[10px] text-muted-foreground text-center">
            <button type="button"
              className="underline"
              onClick={() => {
                try {
                  localStorage.removeItem("zivo_debug_stories");
                } catch {}
                setEnabled(false);
                setOpen(false);
              }}
            >
              Disable debug
            </button>
          </p>
        </div>
      )}
    </>
  );
}
