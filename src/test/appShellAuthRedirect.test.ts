import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, "..", relativePath), "utf8");

describe("app shell auth redirects", () => {
  it("keeps mobile nav and guest profile redirects on the shared helper", () => {
    const mobileNav = readSource("components/app/ZivoMobileNav.tsx");
    const guestProfile = readSource("components/auth/GuestProfilePreview.tsx");

    expect(mobileNav).toContain('import { withRedirectParam } from "@/lib/authRedirect";');
    expect(mobileNav).toContain('user ? path : withRedirectParam("/login", path)');
    expect(mobileNav).not.toContain("`/login?redirect=${encodeURIComponent(path)}`");

    expect(guestProfile).toContain('import { withRedirectParam } from "@/lib/authRedirect";');
    expect(guestProfile).toContain("const redirect = `${location.pathname}${location.search}${location.hash}`;");
    expect(guestProfile).toContain('return <Navigate to={withRedirectParam("/login", redirect)} replace />;');
  });

  it("keeps create sheet and Home trip-share auth CTAs on the shared helper", () => {
    const createSheet = readSource("components/feed/CreateSheet.tsx");
    const planTripBundle = readSource("components/home/PlanTripBundle.tsx");

    expect(createSheet).toContain('import { withRedirectParam } from "@/lib/authRedirect";');
    expect(createSheet).toContain('navigate(withRedirectParam("/login", path));');
    expect(createSheet).toContain('navigate(withRedirectParam("/login", authRedirectPath || "/feed"));');
    expect(createSheet).not.toContain("`/login?redirect=${encodeURIComponent(path)}`");

    expect(planTripBundle).toContain('import { withRedirectParam } from "@/lib/authRedirect";');
    expect(planTripBundle).toContain('navigate(withRedirectParam("/login", "/chat"));');
    expect(planTripBundle).not.toContain('navigate("/login?redirect=%2Fchat")');
  });

  it("keeps profile create and live CTAs on the shared helper", () => {
    const profileTabs = readSource("components/profile/ProfileContentTabs.tsx");

    expect(profileTabs).toContain('import { withRedirectParam } from "@/lib/authRedirect";');
    expect(profileTabs).toContain('navigate(withRedirectParam("/login", "/profile"));');
    expect(profileTabs).not.toContain('navigate("/login?redirect=/profile")');
  });
});
