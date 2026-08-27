import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/MorePage.tsx"),
  "utf8",
);

const sliceBetween = (start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe("MorePage account tool directory", () => {
  it("renders the existing grouped search engine as a labelled mobile control", () => {
    const searchMarkup = sliceBetween(
      "{/* Account tool search */}",
      "{/* Quick Actions */}",
    );

    expect(searchMarkup).toContain('role="search"');
    expect(searchMarkup).toContain('aria-label="Search account tools"');
    expect(searchMarkup).toContain('id="more-directory-search"');
    expect(searchMarkup).toContain("ref={directorySearchRef}");
    expect(searchMarkup).toContain(
      "placeholder={`Search ${totalLinks} tools`}",
    );
    expect(searchMarkup).toContain(
      "onChange={(event) => setSearch(event.target.value)}",
    );
    expect(searchMarkup).toContain('event.key === "Escape"');
    expect(searchMarkup).toContain('event.key !== "Enter"');
    expect(searchMarkup).toContain("searchResults?.length === 1");
    expect(searchMarkup).toContain(
      "openDirectoryResult(searchResults[0].link)",
    );
    expect(searchMarkup).toContain("[&::-webkit-search-cancel-button]:hidden");
  });

  it("keeps the grouped search reachable from the sticky mobile header", () => {
    const headerMarkup = sliceBetween(
      "{/* Mobile sticky header */}",
      '<div className="flex-1 lg:flex',
    );
    const focusHandler = sliceBetween(
      "const focusDirectorySearch = useCallback(() => {",
      "const clearDirectorySearch = useCallback(() => {",
    );

    expect(headerMarkup).toContain("onClick={focusDirectorySearch}");
    expect(headerMarkup).toContain('aria-label="Search account tools"');
    expect(headerMarkup).toContain('className="flex h-11 w-11');
    expect(focusHandler).toContain("directorySearchRef.current");
    expect(focusHandler).toContain(
      "searchInput.focus({ preventScroll: true })",
    );
    expect(focusHandler).toContain("searchInput.scrollIntoView({");
    expect(focusHandler).toContain(
      'window.matchMedia("(prefers-reduced-motion: reduce)").matches',
    );
  });

  it("keeps clear, voice, and account-scoped recent searches touch friendly", () => {
    const searchMarkup = sliceBetween(
      "{/* Account tool search */}",
      "{/* Quick Actions */}",
    );

    expect(searchMarkup).toContain("onClick={clearDirectorySearch}");
    expect(searchMarkup).toContain("onClick={startVoiceSearch}");
    expect(searchMarkup).toContain("searchHistory.map((term)");
    expect(searchMarkup).toContain(
      "aria-label={`Search account tools for ${term}`}",
    );
    expect(searchMarkup.match(/h-11 w-11/g)?.length).toBeGreaterThanOrEqual(2);
    expect(searchMarkup).toContain("inline-flex min-h-11");
    expect(searchMarkup).toContain(
      "focus-visible:ring-2 focus-visible:ring-ring",
    );
  });

  it("shows grouped results immediately while search is active", () => {
    expect(source).toContain(
      "{user && !searchResults && renderQuickActions()}",
    );
    expect(source).toContain("{user && !searchResults && (");
    expect(source).toContain('id="more-directory-results"');
    expect(source).toContain("searchResultGroups?.map((group, groupIndex)");
    expect(source).toContain("const seenResultKeys = new Set<string>()");
    expect(source).toContain(
      "const resultKey = `${link.href}::${link.label.toLowerCase()}`",
    );
  });

  it("keeps directory navigation, pinning, and local actions as separate native controls", () => {
    const rowMarkup = sliceBetween(
      "/* --- Link Row --- */",
      "/* --- Collapsible Section --- */",
    );
    const navigationStart = rowMarkup.indexOf("<Link");
    const navigationEnd = rowMarkup.indexOf("</Link>", navigationStart);
    const pinControl = rowMarkup.indexOf(
      "aria-label={isPinned ? `Unpin ${link.label}`",
    );

    expect(rowMarkup).toContain("<motion.button");
    expect(rowMarkup).toContain("onClick={handleAction}");
    expect(navigationStart).toBeGreaterThan(-1);
    expect(navigationEnd).toBeGreaterThan(navigationStart);
    expect(pinControl).toBeGreaterThan(navigationEnd);
    expect(rowMarkup).toContain("h-11 w-11");
    expect(rowMarkup).not.toContain("e.preventDefault()");
    expect(rowMarkup).not.toContain("e.stopPropagation()");
  });

  it("keeps category browsing compact on phones and balanced on desktop", () => {
    const sectionMarkup = sliceBetween(
      "/* --- Collapsible Section --- */",
      "/* --- Total link count --- */",
    );
    const directoryMarkup = sliceBetween(
      "{/* All Sections OR categorized search results */}",
      "{/* Account access */}",
    );

    expect(sectionMarkup).toContain(
      'className="mt-2 hidden gap-1.5 overflow-hidden pl-11 sm:flex"',
    );
    expect(sectionMarkup).not.toContain('className="mb-3 overflow-hidden');
    expect(directoryMarkup).toContain('"grid gap-2.5"');
    expect(directoryMarkup).toContain(
      'expandedSection ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"',
    );
    expect(directoryMarkup).toContain(
      "sections.map((section, si) => renderSection(section, si))",
    );
  });
});
