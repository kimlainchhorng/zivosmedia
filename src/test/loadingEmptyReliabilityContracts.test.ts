import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("loading, empty, and reliability visual contracts", () => {
  it("keeps reusable empty and degraded-state components animated, actionable, and trackable", () => {
    const emptyState = source("src/components/ui/empty-state.tsx");
    const loadFailure = source("src/components/reliability/LoadFailureCard.tsx");
    const degradedBanner = source("src/components/reliability/DegradedDataBanner.tsx");

    for (const needle of [
      "initial={{ opacity: 0, y: 8, scale: 0.98 }}",
      "transition={{ type: \"spring\", stiffness: 320, damping: 26 }}",
      "toneGradient",
      "action",
      "secondaryAction",
      "compact ? \"py-8 px-4 gap-3\" : \"py-16 px-6 gap-4\"",
    ]) {
      expect(emptyState).toContain(needle);
    }

    for (const needle of [
      'component: "load_failure_card"',
      'action: "retry"',
      'action: "secondary"',
      'retryLabel = "Retry"',
      'secondaryLabel = "Go Back"',
      "disabled={retryDisabled}",
      "rounded-3xl border border-border/60 bg-card/95",
    ]) {
      expect(loadFailure).toContain(needle);
    }

    for (const needle of [
      'component: "degraded_data_banner"',
      'action: "retry"',
      'retryLabel = "Retry"',
      "rightSlot",
      "animate-pulse rounded-full bg-amber-500",
      "disabled={retryDisabled}",
    ]) {
      expect(degradedBanner).toContain(needle);
    }
  });

  it("keeps feed and reels loading, empty, offline, and cached-data states visible", () => {
    const socialFeed = source("src/pages/ReelsFeedPage.tsx");
    const reelsFeed = source("src/pages/FeedPage.tsx");

    for (const needle of [
      'aria-label="Loading posts"',
      'aria-busy="true"',
      "mx-2 my-3 overflow-hidden rounded-[1.85rem] border border-border/40 bg-background/88",
      "<EngagementSkeleton />",
      "No posts yet",
      "Be the first to share something amazing!",
      "Nothing in {feedTab} yet",
      "Back to For You",
      "Clear filter",
    ]) {
      expect(socialFeed).toContain(needle);
    }

    for (const needle of [
      'aria-label="Loading reels"',
      "Feed is having trouble loading",
      "We could not load reels right now.",
      "No reels yet",
      "Create reel",
      "No reels from people you follow",
      "Show all reels",
      "You're offline",
      "Using cached reels. Live refresh failed.",
      "<DegradedDataBanner",
      "<LoadFailureCard",
      "<EmptyState",
      'role="status"',
      'aria-live="polite"',
    ]) {
      expect(reelsFeed).toContain(needle);
    }
  });

  it("keeps commerce discovery skeleton, error, and empty states covered by visual contracts", () => {
    const grocery = source("src/pages/GroceryStorePage.tsx");
    const frontendContracts = source("scripts/qa/frontend-visual-contracts.mjs");
    const loadingStateTest = source("src/test/loadingErrorStates.test.tsx");

    for (const needle of [
      "Loading skeletons",
      "Horizontal skeleton row",
      "!isLoading && error",
      "bg-destructive/10 border border-destructive/20",
      "!isLoading && !error && products.length === 0",
      "No products found",
      "No products available",
      "Try a different search term",
    ]) {
      expect(grocery).toContain(needle);
    }

    expect(frontendContracts).toContain('id: "loading-error-empty-states"');
    expect(frontendContracts).toContain("src/test/loadingErrorStates.test.tsx");
    expect(loadingStateTest).toContain("loading, error, and empty states");
  });
});
