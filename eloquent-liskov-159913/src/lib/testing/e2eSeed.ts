/**
 * E2E test seed bridge.
 *
 * Playwright specs call `seedProfilePosts(page)` (see
 * tests/e2e/fixtures/seedProfilePosts.ts) before navigation. That fixture
 * uses `page.addInitScript` to set `window.__ZIVO_E2E_SEED__` to a JSON
 * payload BEFORE any app script runs. This module reads that payload at
 * module init so React state can hydrate against it.
 *
 * Production-safe:
 *   - The window flag is never set in real browsers.
 *   - Returns null whenever the flag is missing, so `?? demoFeed` keeps
 *     production behavior identical.
 */

export interface E2ESeedFeedItem {
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

interface E2ESeedPayload {
  posts?: E2ESeedFeedItem[];
}

declare global {
  interface Window {
    __ZIVO_E2E_SEED__?: E2ESeedPayload | string;
  }
}

function readSeed(): E2ESeedPayload | null {
  if (typeof window === "undefined") return null;
  const raw = window.__ZIVO_E2E_SEED__;
  if (!raw) return null;
  try {
    return typeof raw === "string" ? (JSON.parse(raw) as E2ESeedPayload) : raw;
  } catch {
    return null;
  }
}

export function isE2ESeeded(): boolean {
  return readSeed() !== null;
}

/** Returns the seeded posts, or `null` when no E2E seed is active. */
export function getE2ESeedPosts(): E2ESeedFeedItem[] | null {
  const seed = readSeed();
  if (!seed?.posts || seed.posts.length === 0) return null;
  return seed.posts;
}
