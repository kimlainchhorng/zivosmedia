/**
 * useStoryFunnel — Aggregates story deep-link analytics into a funnel view.
 *
 * Reads `analytics_events` rows for the four story events and groups by
 * `meta->>'source'`, `meta->>'story_id'`, and `meta->>'reason'`.
 * Admin-only: relies on the existing "Admins can view analytics events" RLS.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STORY_EVENTS = [
  "story_deeplink_open",
  "story_segment_view",
  "story_deeplink_close",
  "story_deeplink_missing",
] as const;

export type StorySource = "profile" | "feed" | "chat" | "shared-link" | "unknown";
export type MissingReason = "not_found" | "expired" | "fetch_error" | "unknown";

interface RawRow {
  event_name: (typeof STORY_EVENTS)[number];
  meta: Record<string, any> | null;
  created_at: string;
}

export interface SourceFunnel {
  source: StorySource;
  opens: number;
  segmentViews: number;
  closes: number;
  completedCloses: number;
  missing: number;
  renderRate: number;     // segmentViews / opens
  completionRate: number; // completedCloses / opens
  missingRate: number;    // missing / (opens + missing)
}

export interface TopStory {
  story_id: string;
  source: StorySource;
  opens: number;
  segmentViews: number;
  completions: number;
  conversion: number; // segmentViews / opens
}

export interface MissingBreakdown {
  reason: MissingReason;
  count: number;
}

export interface StoryFunnelData {
  totals: {
    opens: number;
    segmentViews: number;
    closes: number;
    completedCloses: number;
    missing: number;
  };
  bySource: SourceFunnel[];
  topStories: TopStory[];
  missing: MissingBreakdown[];
  rangeStart: string;
  rangeEnd: string;
}

const PAGE_SIZE = 1000;

export function useStoryFunnel(daysBack = 7) {
  return useQuery<StoryFunnelData>({
    queryKey: ["story-funnel", daysBack],
    staleTime: 60_000,
    queryFn: async () => {
      const end = new Date();
      const start = new Date(end.getTime() - daysBack * 24 * 60 * 60 * 1000);

      // Page through analytics_events to defeat the 1000-row default cap.
      const rows: RawRow[] = [];
      for (let page = 0; ; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await (supabase as any)
          .from("analytics_events")
          .select("event_name, meta, created_at")
          .in("event_name", STORY_EVENTS as unknown as string[])
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        const batch = (data || []) as RawRow[];
        rows.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        if (page > 50) break; // hard safety stop (50k rows)
      }

      // Aggregate
      const sourceAcc = new Map<string, SourceFunnel>();
      const storyAcc = new Map<string, TopStory>();
      const missingAcc = new Map<string, number>();
      const totals = { opens: 0, segmentViews: 0, closes: 0, completedCloses: 0, missing: 0 };

      const sourceOf = (m: any): StorySource => (m?.source as StorySource) || "unknown";
      const reasonOf = (m: any): MissingReason => (m?.reason as MissingReason) || "unknown";

      const ensureSource = (s: StorySource): SourceFunnel => {
        let row = sourceAcc.get(s);
        if (!row) {
          row = {
            source: s,
            opens: 0, segmentViews: 0, closes: 0, completedCloses: 0, missing: 0,
            renderRate: 0, completionRate: 0, missingRate: 0,
          };
          sourceAcc.set(s, row);
        }
        return row;
      };
      const ensureStory = (id: string, s: StorySource): TopStory => {
        let row = storyAcc.get(id);
        if (!row) {
          row = { story_id: id, source: s, opens: 0, segmentViews: 0, completions: 0, conversion: 0 };
          storyAcc.set(id, row);
        }
        return row;
      };

      for (const r of rows) {
        const m = r.meta || {};
        const src = sourceOf(m);
        const sRow = ensureSource(src);
        const storyId = m.story_id as string | undefined;

        switch (r.event_name) {
          case "story_deeplink_open":
            totals.opens++;
            sRow.opens++;
            if (storyId) ensureStory(storyId, src).opens++;
            break;
          case "story_segment_view":
            totals.segmentViews++;
            sRow.segmentViews++;
            if (storyId) ensureStory(storyId, src).segmentViews++;
            break;
          case "story_deeplink_close":
            totals.closes++;
            sRow.closes++;
            if (m.completed) {
              totals.completedCloses++;
              sRow.completedCloses++;
              if (storyId) ensureStory(storyId, src).completions++;
            }
            break;
          case "story_deeplink_missing": {
            totals.missing++;
            sRow.missing++;
            const reason = reasonOf(m);
            missingAcc.set(reason, (missingAcc.get(reason) || 0) + 1);
            break;
          }
        }
      }

      // Derive rates
      for (const row of sourceAcc.values()) {
        row.renderRate = row.opens ? row.segmentViews / row.opens : 0;
        row.completionRate = row.opens ? row.completedCloses / row.opens : 0;
        const denom = row.opens + row.missing;
        row.missingRate = denom ? row.missing / denom : 0;
      }
      for (const row of storyAcc.values()) {
        row.conversion = row.opens ? row.segmentViews / row.opens : 0;
      }

      const bySource = [...sourceAcc.values()].sort((a, b) => b.opens - a.opens);
      const topStories = [...storyAcc.values()]
        .filter((s) => s.opens >= 3) // suppress noise
        .sort((a, b) => b.conversion - a.conversion || b.opens - a.opens)
        .slice(0, 10);
      const missing = [...missingAcc.entries()]
        .map(([reason, count]) => ({ reason: reason as MissingReason, count }))
        .sort((a, b) => b.count - a.count);

      return {
        totals,
        bySource,
        topStories,
        missing,
        rangeStart: start.toISOString(),
        rangeEnd: end.toISOString(),
      };
    },
  });
}
