/**
 * Contract tests for the pure exports of channelMedia.ts —
 * extractChannelPostUrls, formatChannelMediaDuration, buildChannelMediaBuckets,
 * and channelPostMatchesTab.
 *
 * Expected values are grounded by an independent oracle that does NOT import the
 * module: a clean-room reimplementation re-derived from the documented behavior
 * (the URL pattern + trailing-punctuation strip, the "m:ss" duration format, the
 * getItemDuration ms-vs-seconds heuristic spelled out in the source comment, and the
 * voice>gif>music>file>media classification order). RegExp / Set / URL / padStart /
 * Math.* are shared JS primitives.
 *
 * LOAD-BEARING, non-obvious contracts pinned:
 *   - extractChannelPostUrls strips trailing [),.;!?], terminates a match at ')',
 *     and DEDUPES via Set;
 *   - formatChannelMediaDuration ROUNDS ms->s (59999 -> "1:00"), zero-pads seconds,
 *     returns null for 0/NaN/Infinity, and clamps negatives to "0:00";
 *   - getItemDuration TRUSTS explicit duration_ms/durationMs as-is (sub-second 900
 *     stays 900, never ×1000) but scales the AMBIGUOUS bare `duration` up ×1000 when
 *     <=1000 and keeps it as-is when >1000;
 *   - classification priority is voice > gif > music > file > media, an image WITH a
 *     filename still classifies as media (not file), and a music link in the post body
 *     is duplicated into BOTH the links and music buckets.
 */
import { describe, it, expect } from "vitest";
import {
  extractChannelPostUrls,
  formatChannelMediaDuration,
  buildChannelMediaBuckets,
  channelPostMatchesTab,
} from "./channelMedia";
import type { ChannelPost } from "@/hooks/useChannel";

const post = (p: Record<string, unknown>): ChannelPost => p as unknown as ChannelPost;

describe("extractChannelPostUrls", () => {
  it("returns [] for a null/empty body", () => {
    expect(extractChannelPostUrls(null)).toEqual([]);
    expect(extractChannelPostUrls("")).toEqual([]);
    expect(extractChannelPostUrls("just text")).toEqual([]);
  });

  it("strips trailing comma/bang punctuation between urls", () => {
    expect(extractChannelPostUrls("Check https://zivo.com/a, and https://zivo.com/b!")).toEqual([
      "https://zivo.com/a",
      "https://zivo.com/b",
    ]);
  });

  it("terminates a parenthesis-wrapped url at the closing paren", () => {
    expect(extractChannelPostUrls("see (https://zivo.com/x) please")).toEqual(["https://zivo.com/x"]);
  });

  it("strips a trailing period", () => {
    expect(extractChannelPostUrls("go https://zivo.com/path.")).toEqual(["https://zivo.com/path"]);
  });

  it("dedupes identical urls via Set", () => {
    expect(extractChannelPostUrls("https://zivo.com https://zivo.com")).toEqual(["https://zivo.com"]);
  });
});

describe("formatChannelMediaDuration", () => {
  it("returns null for 0, NaN, and Infinity", () => {
    expect(formatChannelMediaDuration(0)).toBeNull();
    expect(formatChannelMediaDuration(NaN)).toBeNull();
    expect(formatChannelMediaDuration(Infinity)).toBeNull();
    expect(formatChannelMediaDuration(null)).toBeNull();
    expect(formatChannelMediaDuration(undefined)).toBeNull();
  });

  it("rounds milliseconds to the nearest second and zero-pads", () => {
    expect(formatChannelMediaDuration(1000)).toBe("0:01");
    expect(formatChannelMediaDuration(1500)).toBe("0:02"); // round(1.5) = 2
    expect(formatChannelMediaDuration(1400)).toBe("0:01"); // round(1.4) = 1
  });

  it("rounds across a minute boundary (59999ms -> 1:00)", () => {
    expect(formatChannelMediaDuration(59999)).toBe("1:00");
  });

  it("formats multi-minute durations", () => {
    expect(formatChannelMediaDuration(65000)).toBe("1:05");
    expect(formatChannelMediaDuration(600000)).toBe("10:00");
  });

  it("clamps a negative duration to 0:00", () => {
    expect(formatChannelMediaDuration(-5000)).toBe("0:00");
  });
});

describe("buildChannelMediaBuckets — duration heuristic", () => {
  it("trusts an explicit sub-second duration_ms as-is (900 stays 900, never ×1000)", () => {
    const buckets = buildChannelMediaBuckets([
      post({ id: "p1", created_at: "t", media: [{ type: "voice", url: "https://c.dn/v.m4a", duration_ms: 900 }] }),
    ]);
    expect(buckets.voice[0].durationMs).toBe(900);
  });

  it("scales an ambiguous bare duration <= 1000 up ×1000 (5 -> 5000)", () => {
    const buckets = buildChannelMediaBuckets([
      post({ id: "p2", created_at: "t", media: [{ type: "voice", url: "https://c.dn/a.m4a", duration: 5 }] }),
    ]);
    expect(buckets.voice[0].durationMs).toBe(5000);
  });

  it("keeps an ambiguous bare duration > 1000 as-is (1500)", () => {
    const buckets = buildChannelMediaBuckets([
      post({ id: "p3", created_at: "t", media: [{ type: "voice", url: "https://c.dn/b.m4a", duration: 1500 }] }),
    ]);
    expect(buckets.voice[0].durationMs).toBe(1500);
  });
});

describe("buildChannelMediaBuckets — classification priority", () => {
  const classifyPost = post({
    id: "cp",
    created_at: "t",
    media: [
      { type: "image/gif", url: "https://c.dn/a.gif" },
      { type: "audio/mpeg", url: "https://c.dn/song.mp3" },
      { type: "application/pdf", url: "https://c.dn/doc.pdf" },
      { type: "image/jpeg", url: "https://c.dn/photo.jpg" },
      { filename: "photo.jpg", url: "https://c.dn/photo2.jpg" },
    ],
  });

  it("routes a gif to the gif bucket", () => {
    expect(buildChannelMediaBuckets([classifyPost]).gif.map((i) => i.url)).toEqual(["https://c.dn/a.gif"]);
  });

  it("routes an audio/* item to the music bucket", () => {
    expect(buildChannelMediaBuckets([classifyPost]).music.map((i) => i.url)).toEqual(["https://c.dn/song.mp3"]);
  });

  it("routes an application/pdf item to the files bucket", () => {
    expect(buildChannelMediaBuckets([classifyPost]).files.map((i) => i.url)).toEqual(["https://c.dn/doc.pdf"]);
  });

  it("keeps a plain image AND an image-with-filename in the media bucket (not files)", () => {
    expect(buildChannelMediaBuckets([classifyPost]).media.map((i) => i.url)).toEqual([
      "https://c.dn/photo.jpg",
      "https://c.dn/photo2.jpg",
    ]);
  });
});

describe("buildChannelMediaBuckets — music body links", () => {
  const linkPost = post({ id: "lp", created_at: "t", body: "listen https://open.spotify.com/track/1 now" });

  it("puts a body link in the links bucket", () => {
    expect(buildChannelMediaBuckets([linkPost]).links.map((i) => i.url)).toEqual([
      "https://open.spotify.com/track/1",
    ]);
  });

  it("duplicates a music link into the music bucket tagged 'music-link'", () => {
    const music = buildChannelMediaBuckets([linkPost]).music;
    expect(music.map((i) => i.url)).toEqual(["https://open.spotify.com/track/1"]);
    expect(music[0].type).toBe("music-link");
  });
});

describe("channelPostMatchesTab", () => {
  const p = post({ id: "cp", created_at: "t", media: [{ type: "image/gif", url: "https://c.dn/a.gif" }] });

  it("is true for a tab the post has content in", () => {
    expect(channelPostMatchesTab(p, "gif")).toBe(true);
  });

  it("is false for a tab the post has no content in", () => {
    expect(channelPostMatchesTab(p, "voice")).toBe(false);
  });
});
