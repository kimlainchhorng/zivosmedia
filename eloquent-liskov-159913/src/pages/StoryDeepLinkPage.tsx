/**
 * StoryDeepLinkPage — Resolves `/stories/:storyId` shareable links by looking
 * up the story, verifying it's still active, and redirecting to the canonical
 * stories surface (`/feed?story=<id>`) where the shared StoryViewer mounts.
 *
 * Distinguishes between three "missing" states (not_found, expired, fetch_error)
 * with tailored copy + analytics so we can attribute drop-off accurately.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { track } from "@/lib/analytics";

type MissingReason = "not_found" | "expired" | "fetch_error";
type Status =
  | { status: "loading" }
  | { status: "ok" }
  | { status: "missing"; reason: MissingReason; detail?: string };

const COPY: Record<MissingReason, { title: string; body: string }> = {
  not_found: {
    title: "Story not found",
    body: "This story doesn't exist or was deleted by its author.",
  },
  expired: {
    title: "Story expired",
    body: "Stories disappear 24 hours after they're posted. Ask the author to share a fresh one.",
  },
  fetch_error: {
    title: "Couldn't load story",
    body: "We had trouble reaching our servers. Check your connection and try again.",
  },
};

export default function StoryDeepLinkPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<Status>({ status: "loading" });
  const [retryToken, setRetryToken] = useState(0);

  const resolve = useCallback(async () => {
    if (!storyId) {
      setState({ status: "missing", reason: "not_found" });
      track("story_deeplink_missing", { story_id: null, reason: "not_found", detail: "no id in url" });
      return;
    }
    try {
      const { data, error } = await supabase
        .from("stories" as any)
        .select("id, expires_at")
        .eq("id", storyId)
        .maybeSingle();

      if (error) {
        setState({ status: "missing", reason: "fetch_error", detail: error.message });
        track("story_deeplink_missing", { story_id: storyId, reason: "fetch_error", detail: error.message });
        return;
      }
      const story = data as any;
      if (!story) {
        setState({ status: "missing", reason: "not_found" });
        track("story_deeplink_missing", { story_id: storyId, reason: "not_found" });
        return;
      }
      if (new Date(story.expires_at) < new Date()) {
        setState({ status: "missing", reason: "expired", detail: story.expires_at });
        track("story_deeplink_missing", { story_id: storyId, reason: "expired", detail: story.expires_at });
        return;
      }
      track("story_deeplink_open", { story_id: storyId, source: "shared-link" });
      setState({ status: "ok" });
      navigate(`/feed?story=${storyId}`, { replace: true });
    } catch (err: any) {
      const detail = err?.message || String(err);
      setState({ status: "missing", reason: "fetch_error", detail });
      track("story_deeplink_missing", { story_id: storyId, reason: "fetch_error", detail });
    }
  }, [storyId, navigate]);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void resolve().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [resolve, retryToken]);

  if (state.status === "loading" || state.status === "ok") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const copy = COPY[state.reason];
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center"
      role="alert"
      data-testid="story-missing"
      data-reason={state.reason}
    >
      <h1 className="text-xl font-bold text-ig-gradient">{copy.title}</h1>
      <p className="text-sm text-muted-foreground max-w-sm">{copy.body}</p>
      <div className="flex items-center gap-2">
        {state.reason === "fetch_error" && (
          <Button variant="outline" onClick={() => setRetryToken((n) => n + 1)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
        <Button asChild>
          <Link to="/feed">Back to feed</Link>
        </Button>
      </div>
    </div>
  );
}
