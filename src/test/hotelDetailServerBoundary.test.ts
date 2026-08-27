import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/lodging/HotelResortDetailPage.tsx"),
  "utf8",
);

const unavailableStart = source.indexOf(
  "if (!isLoading && detailQuery.isError && detailQuery.data === undefined)",
);
const notFoundStart = source.indexOf("if (!isLoading && !store)");
const unavailableBranch = source.slice(unavailableStart, notFoundStart);
const normalizedUnavailableBranch = unavailableBranch.replace(/\s+/g, " ");

describe("hotel detail server boundary", () => {
  it("keeps an aggregate read failure distinct from a successful not-found response", () => {
    expect(source).toContain("if (error) throw error");
    expect(unavailableStart).toBeGreaterThan(-1);
    expect(notFoundStart).toBeGreaterThan(unavailableStart);
    expect(source).toContain("Property not found");
  });

  it("renders an honest unavailable state before exposing property details", () => {
    expect(unavailableBranch).toContain('role="alert"');
    expect(unavailableBranch).toContain("Hotel details unavailable");
    expect(normalizedUnavailableBranch).toContain(
      "This does not mean the property was removed.",
    );
    expect(unavailableBranch).not.toContain("Property not found");
    expect(unavailableBranch).not.toContain("Book Now");
  });

  it("offers a busy-aware retry and a safe hotels recovery route", () => {
    expect(unavailableBranch).toContain("void detailQuery.refetch()");
    expect(unavailableBranch).toContain("disabled={detailQuery.isFetching}");
    expect(unavailableBranch).toContain("aria-busy={detailQuery.isFetching}");
    expect(unavailableBranch).toContain("Retry hotel details");
    expect(unavailableBranch).toContain('navigate("/hotels")');
  });

  it("does not synthesize rooms when the server payload is absent", () => {
    expect(source).toContain("((detail?.rooms ?? []) as any[])");
    expect(source).not.toMatch(/(?:mock|sample|fallback)Rooms\s*=/i);
  });
});
