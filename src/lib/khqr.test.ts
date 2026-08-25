import { describe, expect, it } from "vitest";
import {
  buildDynamicKhqr,
  formatBakongBillId,
  getKhqrMerchantName,
  usdToKhrString,
} from "./khqr";

// Independent EMVCo CRC16-CCITT (poly 0x1021, init 0xFFFF). Anchored below to the
// canonical "123456789" -> "29B1" known-answer vector so it can validate the
// library's checksum without trusting the library's own crc16.
function crc16ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Minimal, independent TLV reader: parse a flat tag-length-value string into
// ordered [tag, value] pairs. Mirrors EMVCo encoding but shares no code with the
// module under test, so a parsing regression there can't hide here.
function readTlv(s: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  let i = 0;
  while (i + 4 <= s.length) {
    const tag = s.slice(i, i + 2);
    const len = parseInt(s.slice(i + 2, i + 4), 10);
    if (Number.isNaN(len)) break;
    const val = s.slice(i + 4, i + 4 + len);
    if (val.length !== len) break;
    out.push([tag, val]);
    i += 4 + len;
  }
  return out;
}

function toMap(s: string): Record<string, string> {
  return Object.fromEntries(readTlv(s));
}

/** Split a full KHQR into its body (everything up to and including "6304") and 4-char CRC. */
function splitCrc(qr: string): { withCrcTag: string; crc: string } {
  return { withCrcTag: qr.slice(0, -4), crc: qr.slice(-4) };
}

describe("crc16ccitt test anchor", () => {
  it("matches the EMVCo CCITT-FALSE known-answer vector", () => {
    expect(crc16ccitt("123456789")).toBe("29B1");
  });
});

describe("buildDynamicKhqr", () => {
  it("emits a valid EMVCo CRC over the full body ending in 6304", () => {
    const qr = buildDynamicKhqr(5, "USD", "ZIVO-A1B2C3");
    const { withCrcTag, crc } = splitCrc(qr);
    expect(withCrcTag.endsWith("6304")).toBe(true);
    expect(crc).toBe(crc16ccitt(withCrcTag));
  });

  it("parses cleanly with no trailing/garbled bytes (every byte consumed)", () => {
    const qr = buildDynamicKhqr(5, "USD", "ZIVO-A1B2C3");
    const { withCrcTag } = splitCrc(qr);
    const body = withCrcTag.slice(0, -4); // drop the "6304" CRC tag+len
    const reEncoded = readTlv(body)
      .map(([t, v]) => `${t}${v.length.toString().padStart(2, "0")}${v}`)
      .join("");
    expect(reEncoded).toBe(body);
  });

  it("sets point-of-initiation to dynamic (tag 01 = 12)", () => {
    const map = toMap(splitCrc(buildDynamicKhqr(5, "USD")).withCrcTag.slice(0, -4));
    expect(map["00"]).toBe("01"); // payload format indicator
    expect(map["01"]).toBe("12"); // dynamic
  });

  it("encodes USD amount as tag 53=840 and tag 54 fixed to 2 decimals", () => {
    const map = toMap(splitCrc(buildDynamicKhqr(5, "USD")).withCrcTag.slice(0, -4));
    expect(map["53"]).toBe("840");
    expect(map["54"]).toBe("5.00");
  });

  it("rounds USD to 2 decimals", () => {
    const map = toMap(splitCrc(buildDynamicKhqr(1234.5, "USD")).withCrcTag.slice(0, -4));
    expect(map["54"]).toBe("1234.50");
  });

  it("encodes KHR amount as tag 53=116 and an integer riel value", () => {
    const map = toMap(splitCrc(buildDynamicKhqr(20000, "KHR")).withCrcTag.slice(0, -4));
    expect(map["53"]).toBe("116");
    expect(map["54"]).toBe("20000");
  });

  it("rounds KHR to the nearest whole riel", () => {
    const map = toMap(splitCrc(buildDynamicKhqr(20000.7, "KHR")).withCrcTag.slice(0, -4));
    expect(map["54"]).toBe("20001");
  });

  it("injects the reference into tag 62 subtag 01", () => {
    const map = toMap(splitCrc(buildDynamicKhqr(5, "USD", "ZIVO-A1B2C3")).withCrcTag.slice(0, -4));
    const additional = toMap(map["62"]);
    expect(additional["01"]).toBe("ZIVO-A1B2C3");
  });

  it("truncates an over-long reference to 25 chars", () => {
    const map = toMap(
      splitCrc(buildDynamicKhqr(5, "USD", "X".repeat(40))).withCrcTag.slice(0, -4),
    );
    const additional = toMap(map["62"]);
    expect(additional["01"]).toBe("X".repeat(25));
  });

  it("omits the bill reference when none is supplied", () => {
    const map = toMap(splitCrc(buildDynamicKhqr(5, "USD")).withCrcTag.slice(0, -4));
    if (map["62"] !== undefined) {
      expect(toMap(map["62"])["01"]).toBeUndefined();
    }
  });
});

describe("getKhqrMerchantName", () => {
  it("extracts a real merchant name (tag 59), not the fallback", () => {
    const name = getKhqrMerchantName();
    expect(name.length).toBeGreaterThan(0);
    expect(name).not.toBe("Bakong merchant");
  });
});

describe("usdToKhrString", () => {
  it("converts USD to rounded riel (locale-separator agnostic)", () => {
    expect(usdToKhrString(2).replace(/[^0-9]/g, "")).toBe("8200");
    expect(usdToKhrString(0.5).replace(/[^0-9]/g, "")).toBe("2050");
  });
});

describe("formatBakongBillId", () => {
  it("returns the last hyphen-delimited segment, upper-cased", () => {
    expect(formatBakongBillId("ZIVO-A1B2C3")).toBe("A1B2C3");
  });
  it("upper-cases a plain reference with no delimiter", () => {
    expect(formatBakongBillId("plainref")).toBe("PLAINREF");
  });
  it("ignores trailing empty segments from a trailing hyphen", () => {
    expect(formatBakongBillId("a-b-")).toBe("B");
  });
  it("returns null for empty / whitespace / nullish input", () => {
    expect(formatBakongBillId(null)).toBeNull();
    expect(formatBakongBillId(undefined)).toBeNull();
    expect(formatBakongBillId("   ")).toBeNull();
  });
});
