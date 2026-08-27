import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const feedSource = readFileSync(
  path.join(process.cwd(), "src/pages/ReelsFeedPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("feed pagination continuity", () => {
  it("keeps the rendered feed visible while a larger page is loading", () => {
    expect(feedSource).toContain(
      'import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";',
    );

    const queryKeyIndex = feedSource.indexOf(
      'queryKey: ["reels-feed-grid", pageSize]',
    );
    const placeholderIndex = feedSource.indexOf(
      "placeholderData: keepPreviousData",
      queryKeyIndex,
    );
    const queryFunctionIndex = feedSource.indexOf(
      "queryFn: async () =>",
      queryKeyIndex,
    );

    expect(queryKeyIndex).toBeGreaterThan(-1);
    expect(placeholderIndex).toBeGreaterThan(queryKeyIndex);
    expect(placeholderIndex).toBeLessThan(queryFunctionIndex);
    expect(feedSource).toContain(
      "setPageSize((prev) => Math.min(prev + PAGE_INCREMENT, PAGE_MAX));",
    );
  });
});
