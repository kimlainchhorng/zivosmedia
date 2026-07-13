/**
 * Contract tests for the PURE exports of parseVehicleCsv.ts — parseCsv,
 * autoMapColumns, validateRow, and the KNOWN_COLUMNS / SAMPLE_CSV constants.
 *
 * Expected values are grounded by an independent clean-room oracle that does
 * NOT import this module; every value below was first captured from the real
 * helpers in Node v22 (TZ=UTC-7) and cross-checked by that oracle.
 *
 * LOAD-BEARING, non-obvious contracts pinned:
 *   - parseInt0 strips every non-[\d-] char, so "3.7" FUSES to 37 (not 3, not
 *     rounded) and "12k" -> 12;
 *   - parseDollarsToCents uses Math.round(n*100) on a float, so "1.005" -> 100
 *     (the 100.4999… artifact), NOT 101;
 *   - the CSV tokenizer swallows CR, so a trailing CRLF yields NO empty row;
 *     "" inside quotes is a literal quote; a newline inside quotes is kept;
 *   - a short row back-fills missing cells with "";
 *   - parseFeatures dedupes case-insensitively but keeps the FIRST casing;
 *   - autoMapColumns matches a direct alias first, then a snake_case fallback
 *     (so "model-year" -> "year"), else null;
 *   - validateRow ALWAYS warns "Asking price is $0." when asking_price is
 *     absent/zero; missing make/model is an "error"; an unparseable cost/asking
 *     price is an "error" while a bad msrp is only a "warn";
 *   - duplicate VIN/stock lookup lowercases the incoming value against an
 *     already-lowercased Set (case-insensitive match).
 */
import { describe, it, expect } from "vitest";
import {
  parseCsv,
  autoMapColumns,
  validateRow,
  KNOWN_COLUMNS,
  SAMPLE_CSV,
  type CanonicalColumn,
} from "./parseVehicleCsv";

describe("parseCsv — tokenizer", () => {
  it("parses a basic header+row", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([{ a: "1", b: "2", c: "3" }]);
  });

  it("keeps a comma inside a quoted field", () => {
    expect(parseCsv('h1,h2\n"x,y",z')).toEqual([{ h1: "x,y", h2: "z" }]);
  });

  it('treats "" inside quotes as a literal quote', () => {
    expect(parseCsv('h\n"she said ""hi"""')).toEqual([{ h: 'she said "hi"' }]);
  });

  it("swallows CR so a trailing CRLF yields no empty row", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([{ a: "1", b: "2" }]);
  });

  it("skips an all-blank row", () => {
    expect(parseCsv("a,b\n1,2\n,\n3,4")).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("trims headers", () => {
    expect(parseCsv("  a  , b \n1,2")).toEqual([{ a: "1", b: "2" }]);
  });

  it("trims values", () => {
    expect(parseCsv("a,b\n  1 ,  2  ")).toEqual([{ a: "1", b: "2" }]);
  });

  it("back-fills a short row with empty strings", () => {
    expect(parseCsv("a,b,c\n1,2")).toEqual([{ a: "1", b: "2", c: "" }]);
  });

  it("returns [] for empty text", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("returns [] for a header-only file", () => {
    expect(parseCsv("a,b,c")).toEqual([]);
  });

  it("preserves a newline inside quotes", () => {
    expect(parseCsv('a,b\n"line1\nline2",z')).toEqual([{ a: "line1\nline2", b: "z" }]);
  });
});

describe("autoMapColumns", () => {
  it("maps a direct alias", () => {
    expect(autoMapColumns(["Make"])).toEqual({ Make: "make" });
  });

  it("maps via the snake_case fallback (model-year -> year)", () => {
    expect(autoMapColumns(["model-year"])).toEqual({ "model-year": "year" });
  });

  it("returns null for an unknown header", () => {
    expect(autoMapColumns(["unknown_header"])).toEqual({ unknown_header: null });
  });

  it("maps a batch of headers (space-normalized + fallback + null)", () => {
    expect(autoMapColumns(["Make", "Model Year", "Stock #", "whatever"])).toEqual({
      Make: "make",
      "Model Year": "year",
      "Stock #": "stock_number",
      whatever: null,
    });
  });
});

describe("validateRow", () => {
  const freshOpts = (): { existingVins: Set<string>; existingStocks: Set<string> } => ({
    existingVins: new Set<string>(),
    existingStocks: new Set<string>(),
  });

  const validate = (
    rec: Record<string, string>,
    mapping: Record<string, CanonicalColumn | null>,
    opts: { existingVins: Set<string>; existingStocks: Set<string> } = freshOpts(),
  ) => validateRow(rec, mapping, 1, opts);

  it("flags missing make and model as an error", () => {
    const result = validate({ Make: "", Model: "" }, { Make: "make", Model: "model" });
    expect(result.severity).toBe("error");
    expect(result.messages).toContain("Missing make.");
    expect(result.messages).toContain("Missing model.");
  });

  it("fuses non-digits out of year so \"3.7\" -> 37", () => {
    const result = validate(
      { Year: "3.7", Make: "Toyota", Model: "Camry" },
      { Year: "year", Make: "make", Model: "model" },
    );
    expect(result.draft.year).toBe(37);
  });

  it("strips the unit off mileage so \"12k\" -> 12", () => {
    const result = validate(
      { Mileage: "12k", Make: "A", Model: "B" },
      { Mileage: "mileage", Make: "make", Model: "model" },
    );
    expect(result.draft.mileage).toBe(12);
  });

  it("rounds cents on a float so \"1.005\" -> 100 (not 101)", () => {
    const result = validate(
      { Cost: "1.005", Make: "A", Model: "B" },
      { Cost: "cost", Make: "make", Model: "model" },
    );
    expect(result.draft.cost_cents).toBe(100);
  });

  it("parses a formatted asking price (\"$26,995\" -> 2699500)", () => {
    const result = validate(
      { Price: "$26,995", Make: "A", Model: "B" },
      { Price: "asking_price", Make: "make", Model: "model" },
    );
    expect(result.draft.asking_price_cents).toBe(2699500);
  });

  it("treats an unparseable cost as an error", () => {
    const result = validate(
      { Cost: "abc", Make: "A", Model: "B" },
      { Cost: "cost", Make: "make", Model: "model" },
    );
    expect(result.severity).toBe("error");
    expect(result.messages[0]).toMatch(/Cost.*not a valid number/);
  });

  // Symbol-only input ("$", "$$$", ",") strips to "" and parseDollarsToCents
  // returns 0 (NOT null), so the caller's `costCents == null` check never fires
  // and the cost silently becomes $0 with no error. Pinned to lock this lenient
  // behavior; a digit-bearing-but-garbage cost like "abc" DOES error (above).
  it("silently treats a symbol-only cost (\"$\") as $0, not an error (lenient)", () => {
    const result = validate(
      { Cost: "$", Make: "A", Model: "B" },
      { Cost: "cost", Make: "make", Model: "model" },
    );
    expect(result.draft.cost_cents).toBe(0);
    expect(result.messages.some((m) => m.includes("not a valid number"))).toBe(false);
  });

  it("warns when the asking price is $0", () => {
    const result = validate(
      { Price: "0", Make: "A", Model: "B" },
      { Price: "asking_price", Make: "make", Model: "model" },
    );
    expect(result.severity).toBe("warn");
    expect(result.messages).toContain("Asking price is $0.");
  });

  it("dedupes features case-insensitively, keeping the first casing", () => {
    const result = validate(
      { Features: "Bluetooth|bluetooth|BLUETOOTH", Make: "A", Model: "B" },
      { Features: "features", Make: "make", Model: "model" },
    );
    expect(result.draft.features).toEqual(["Bluetooth"]);
  });

  it("keeps an ISO date verbatim", () => {
    const result = validate(
      { Date: "2023-05-15", Make: "A", Model: "B" },
      { Date: "acquired_at", Make: "make", Model: "model" },
    );
    expect(result.draft.acquired_at).toBe("2023-05-15");
  });

  it("normalizes a US-format date (5/15/2023 -> 2023-05-15)", () => {
    const result = validate(
      { Date: "5/15/2023", Make: "A", Model: "B" },
      { Date: "acquired_at", Make: "make", Model: "model" },
    );
    expect(result.draft.acquired_at).toBe("2023-05-15");
  });

  it("maps condition CPO -> certified_preowned", () => {
    const result = validate(
      { Condition: "CPO", Make: "A", Model: "B" },
      { Condition: "condition", Make: "make", Model: "model" },
    );
    expect(result.draft.condition).toBe("certified_preowned");
  });

  it("maps fuel EV -> electric", () => {
    const result = validate(
      { Fuel: "EV", Make: "A", Model: "B" },
      { Fuel: "fuel_type", Make: "make", Model: "model" },
    );
    expect(result.draft.fuel_type).toBe("electric");
  });

  it("maps drivetrain 4x4 -> 4wd", () => {
    const result = validate(
      { Drive: "4x4", Make: "A", Model: "B" },
      { Drive: "drivetrain", Make: "make", Model: "model" },
    );
    expect(result.draft.drivetrain).toBe("4wd");
  });

  it("warns and defaults to \"used\" on an unrecognized condition", () => {
    const result = validate(
      { Condition: "foo", Make: "A", Model: "B" },
      { Condition: "condition", Make: "make", Model: "model" },
    );
    expect(result.draft.condition).toBe("used");
    expect(result.severity).toBe("warn");
    expect(result.messages.some((m) => m.includes("foo"))).toBe(true);
  });

  it("detects a duplicate VIN case-insensitively", () => {
    const opts = { existingVins: new Set<string>(["1hgcm82633a123456"]), existingStocks: new Set<string>() };
    const result = validate(
      { Vin: "1HGCM82633A123456", Make: "A", Model: "B" },
      { Vin: "vin", Make: "make", Model: "model" },
      opts,
    );
    expect(result.duplicateOf).toBe("vin");
    expect(result.messages.some((m) => m.includes("Duplicate VIN"))).toBe(true);
  });

  it("detects a duplicate stock number case-insensitively", () => {
    const opts = { existingVins: new Set<string>(), existingStocks: new Set<string>(["abc123"]) };
    const result = validate(
      { Stock: "ABC123", Make: "A", Model: "B" },
      { Stock: "stock_number", Make: "make", Model: "model" },
      opts,
    );
    expect(result.duplicateOf).toBe("stock_number");
    expect(result.messages.some((m) => m.includes("Duplicate stock"))).toBe(true);
  });
});

describe("KNOWN_COLUMNS / SAMPLE_CSV", () => {
  it("KNOWN_COLUMNS lists the canonical columns", () => {
    expect(KNOWN_COLUMNS).toContain("make");
    expect(KNOWN_COLUMNS).toContain("model");
    expect(KNOWN_COLUMNS).toContain("vin");
    expect(KNOWN_COLUMNS.length).toBe(31);
  });

  it("SAMPLE_CSV parses to 3 vehicle rows led by the Toyota", () => {
    const rows = parseCsv(SAMPLE_CSV);
    expect(rows.length).toBe(3);
    expect(rows[0].make).toBe("Toyota");
  });
});
