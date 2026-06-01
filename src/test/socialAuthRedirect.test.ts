import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, "..", relativePath), "utf8");

describe("social auth redirects", () => {
  it("keeps Feed sidebar auth-only shortcuts on the shared redirect helper", () => {
    const sidebar = readSource("components/social/FeedSidebar.tsx");

    expect(sidebar).toContain('import { withRedirectParam } from "@/lib/authRedirect";');
    expect(sidebar).toContain('navigate(withRedirectParam("/login", path));');
    expect(sidebar).toContain('navigate(withRedirectParam("/login", "/chat"))');
    expect(sidebar).toContain("onClick={() => goToItem(item.path, item.authRequired)}");
    expect(sidebar).not.toContain("`/login?redirect=${encodeURIComponent(path)}`");
    expect(sidebar).not.toContain('encodeURIComponent("/chat")');
  });

  it("keeps poll voting login handoff on the shared redirect helper", () => {
    const poll = readSource("components/social/PollPostCard.tsx");

    expect(poll).toContain('import { withRedirectParam } from "@/lib/authRedirect";');
    expect(poll).toContain('window.location.assign(withRedirectParam("/login", "/feed"));');
    expect(poll).not.toContain('window.location.assign(`/login?redirect=${encodeURIComponent("/feed")}`)');
  });
});
