import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "src/components/social/SuggestedUsersCarousel.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("Feed suggested-users visual contract", () => {
  it("keeps every summary label readable at phone widths", () => {
    expect(
      source.match(/flex min-w-0 flex-col items-center justify-center/g),
    ).toHaveLength(4);

    for (const label of ["Matches", "Added", "Verified", "Skipped"]) {
      expect(source).toContain(
        `text-[10px] font-semibold leading-tight text-muted-foreground">${label}`,
      );
    }
  });

  it("keeps visible actions complete and touch friendly", () => {
    expect(source).toContain('onClick={() => navigate("/explore")}');
    expect(source).toContain("zivo-social-chip flex min-h-11");
    expect(source).toContain("absolute right-0 top-0 flex min-h-11 min-w-11");
    expect(source).toContain("focus-visible:ring-inset");
    expect(source).toContain("min-h-11 w-full rounded-full");
    expect(source).toContain(
      "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left",
    );
    expect(source).toContain("focus-visible:ring-2 focus-visible:ring-ring");

    const defaultCardStart = source.indexOf("{/* Avatar */}");
    const profileButtonStart = source.indexOf(
      "onClick={() => navigate(`/user/${profile.id}`)}",
      defaultCardStart,
    );
    const profileButtonEnd = source.indexOf("</button>", profileButtonStart);
    const interactiveBioStart = source.indexOf(
      "{profile.bio && (",
      profileButtonStart,
    );

    expect(defaultCardStart).toBeGreaterThan(-1);
    expect(profileButtonStart).toBeGreaterThan(defaultCardStart);
    expect(profileButtonEnd).toBeGreaterThan(profileButtonStart);
    expect(profileButtonEnd).toBeLessThan(interactiveBioStart);
  });

  it("keeps secondary signal detail off the crowded phone viewport", () => {
    expect(source).toContain("mb-2.5 hidden items-center justify-between");
    expect(source).toContain("sm:flex");
  });
});
