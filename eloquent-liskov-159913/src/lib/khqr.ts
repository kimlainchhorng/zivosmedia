/**
 * KHQR — generate a dynamic KHQR string with amount + reference baked in.
 * When scanned by ABA / Bakong / any Cambodian bank app, the amount is prefilled.
 *
 * Based on the static merchant QR for CHHORNG KIMLAIN (ABA PayWay) and the
 * EMVCo / NBC Bakong KHQR specification.
 */

/** Static merchant QR string (no amount). Source of truth for merchant info. */
const STATIC_KHQR =
  "00020101021130510016abaakhppxxx@abaa01151260319063643400208ABA Bank5204421553031165802KH5915CHHORNG KIMLAIN6010PHNOM PENH624168370010PAYWAY@ABA0106941478020903218711963040E41";

const USD_TO_KHR = 4062.5;

/** ISO-4217 numeric currency codes used in KHQR. */
const CURRENCY = {
  USD: "840",
  KHR: "116",
} as const;

type Currency = keyof typeof CURRENCY;

/** CRC16-CCITT (poly 0x1021, init 0xFFFF) — required by EMVCo. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Encode a TLV (tag-length-value) field. */
function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${tag}${len}${value}`;
}

interface ParsedTlv {
  [tag: string]: string;
}

/** Parse a flat TLV string into { tag → value } map. */
function parseTlv(s: string): ParsedTlv {
  const out: ParsedTlv = {};
  let i = 0;
  while (i < s.length - 4) {
    const tag = s.slice(i, i + 2);
    const len = parseInt(s.slice(i + 2, i + 4), 10);
    if (Number.isNaN(len)) break;
    const val = s.slice(i + 4, i + 4 + len);
    out[tag] = val;
    i += 4 + len;
  }
  return out;
}

/**
 * Build a dynamic KHQR string with the given amount and reference.
 *
 * @param amount - Amount to charge (in `currency` units; e.g. 5.00 USD or 20000 KHR)
 * @param currency - "USD" or "KHR"
 * @param reference - Short reference / bill number (e.g. "ZIVO-A1B2C3")
 */
export function buildDynamicKhqr(
  amount: number,
  currency: Currency = "USD",
  reference?: string
): string {
  // Strip CRC (last 8 chars: "6304XXXX") and parse remaining fields.
  const body = STATIC_KHQR.slice(0, -8);
  const fields = parseTlv(body);

  // Override / inject:
  fields["01"] = "12"; // dynamic
  fields["52"] = fields["52"] || "4215"; // MCC
  fields["53"] = CURRENCY[currency]; // currency
  fields["54"] = amount.toFixed(2); // amount

  if (reference) {
    // Tag 62 = additional data; subtag 01 = bill / reference.
    const ref = reference.slice(0, 25);
    fields["62"] = tlv("01", ref);
  }

  // Reassemble in canonical order.
  const order = ["00", "01", "29", "30", "31", "52", "53", "54", "58", "59", "60", "62"];
  let out = "";
  for (const tag of order) {
    if (fields[tag] !== undefined) out += tlv(tag, fields[tag]);
  }

  // Append CRC placeholder, compute over full string ending in "6304".
  const withCrcTag = out + "6304";
  const crc = crc16(withCrcTag);
  return withCrcTag + crc;
}

/** Format USD amount as KHR string (rounded to nearest riel). */
export function usdToKhrString(usd: number): string {
  return Math.round(usd * USD_TO_KHR).toLocaleString();
}
