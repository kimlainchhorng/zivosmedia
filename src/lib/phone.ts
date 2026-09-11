export const normalizePhoneDigits = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 65248))
    .replace(/[០-៩]/g, (digit) => String(digit.charCodeAt(0) - 0x17e0))
    .replace(/\D/g, "");

export const normalizePhoneE164 = (value: string) => {
  const digits = normalizePhoneDigits(value);
  return digits ? `+${digits}` : "";
};

export const buildPhoneE164 = (dialCode: string, localNumber: string) => {
  const dialDigits = normalizePhoneDigits(dialCode);
  const normalized = normalizePhoneDigits(localNumber);
  const localDigits = dialDigits === "855" ? normalized.replace(/^0/, "") : normalized;
  return dialDigits || localDigits ? `+${dialDigits}${localDigits}` : "";
};
