import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(process.cwd(), "src/pages/app/ServicesPage.tsx"), "utf8");

describe("ServicesPage canonical Ride links", () => {
  it("does not launch retired RideHub tab routes from the active services surface", () => {
    expect(source).not.toContain("/rides/hub?tab=reserve");
    expect(source).not.toContain("zivoReserveBanner");
  });

  it("marks Reserve as coming soon until the shared Ride app owns scheduling", () => {
    expect(source).toContain('id: "ride-reserve"');
    expect(source).toContain('href: "/rides/hub"');
    expect(source).toContain('badge: t("services.badge.coming_soon")');
    expect(source).toContain("comingSoon: true");
  });

  it("uses service identifiers rather than route-only favorite keys", () => {
    expect(source).toContain("const serviceFavoriteKey = (service: ServiceItem) => service.id");
    expect(source).toContain("normalizeFavoriteServices");
    expect(source).toContain('key={`${serviceFavoriteKey(service)}-${service.label}`}');
    expect(source).toContain("toggleFavorite(service, event)");
    expect(source).not.toContain("toggleFavorite(service.href");
    expect(source).not.toContain("favorites.includes(service.href)");
  });
});

describe("ServicesPage waitlist request isolation", () => {
  it("invalidates pending work when the sheet closes or another service opens", () => {
    expect(source).toContain("const waitlistRequestGateRef = useRef(createWaitlistRequestGate())");
    expect(source).toContain("const closeWaitlist = () => {");
    expect(source).toContain("onOpenChange={(open) => { if (!open) closeWaitlist(); }}");

    const comingSoonStart = source.indexOf("if (service.comingSoon)");
    const comingSoonEnd = source.indexOf("if (service.animClass)", comingSoonStart);
    const comingSoonSource = source.slice(comingSoonStart, comingSoonEnd);
    expect(comingSoonSource).toContain("invalidateWaitlistRequest(waitlistRequestGateRef.current)");
    expect(comingSoonSource).toContain("setWaitlistSubmitted(false)");
    expect(comingSoonSource).toContain("setWaitlistLoading(false)");
  });

  it("allows only the current single-flight request to update visible state", () => {
    const submitStart = source.indexOf("const submitWaitlist = async () => {");
    const submitEnd = source.indexOf("\n\n  return (", submitStart);
    const submitSource = source.slice(submitStart, submitEnd);

    expect(submitSource).toContain("const requestId = beginWaitlistRequest(waitlistRequestGateRef.current)");
    expect(submitSource).toContain("if (requestId === null) return");
    expect(submitSource.match(/completeWaitlistRequest\(waitlistRequestGateRef\.current, requestId\)/g)).toHaveLength(2);
    expect(submitSource).toContain("email,\n        service,");
    expect(submitSource).toContain("setWaitlistSubmitted(true)");
    expect(source).toContain("onClick={closeWaitlist}");
  });

  it("uses native email validation and keyboard form submission", () => {
    const formStart = source.indexOf('<form\n              aria-busy={waitlistLoading}');
    const formEnd = source.indexOf("</form>", formStart);
    const formSource = source.slice(formStart, formEnd);

    expect(formStart).toBeGreaterThan(-1);
    expect(formSource).toContain("onSubmit={(event) => {");
    expect(formSource).toContain("event.preventDefault();");
    expect(formSource).toContain("void submitWaitlist();");
    expect(formSource).toContain('type="email"');
    expect(formSource).toContain("required");
    expect(formSource).toContain("disabled={waitlistLoading}");
    expect(formSource).toContain('type="submit"');
    expect(formSource).not.toContain("onClick={submitWaitlist}");
  });
});
