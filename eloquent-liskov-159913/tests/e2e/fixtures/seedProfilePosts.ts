/**
 * Playwright fixture that seeds /profile with deterministic posts so
 * menu-interaction E2E specs always have something to click. Sets a
 * window flag BEFORE any app script runs (`addInitScript`); the app's
 * `getE2ESeedPosts()` reads it during initial state hydration.
 *
 * Production code is unaffected — the flag is only set by tests.
 */
import type { Page } from "@playwright/test";

export interface SeedPost {
  id: string;
  type: "photo" | "reel";
  likes: number;
  comments: number;
  caption: string;
  time: string;
  url: string | null;
  views?: number;
  user: { name: string; avatar: string };
  createdAt?: string;
}

export const DEFAULT_SEED_POSTS: SeedPost[] = [
  {
    id: "e2e-photo-1",
    type: "photo",
    likes: 12,
    comments: 3,
    caption: "E2E seeded photo post",
    time: "1h",
    url: "https://placehold.co/600x600/png",
    user: { name: "QA Bot", avatar: "" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "e2e-reel-1",
    type: "reel",
    likes: 99,
    comments: 4,
    caption: "E2E seeded reel",
    time: "2h",
    url: null,
    views: 1234,
    user: { name: "QA Bot", avatar: "" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "e2e-photo-2",
    type: "photo",
    likes: 5,
    comments: 0,
    caption: "Second seeded photo",
    time: "3h",
    url: "https://placehold.co/600x800/png",
    user: { name: "QA Bot", avatar: "" },
    createdAt: new Date().toISOString(),
  },
];

export async function seedProfilePosts(
  page: Page,
  posts: SeedPost[] = DEFAULT_SEED_POSTS,
): Promise<void> {
  await page.addInitScript((payload) => {
    // The app reads window.__ZIVO_E2E_SEED__ in src/lib/testing/e2eSeed.ts.
    (window as unknown as { __ZIVO_E2E_SEED__?: unknown }).__ZIVO_E2E_SEED__ = {
      posts: payload,
    };
  }, posts);
}
