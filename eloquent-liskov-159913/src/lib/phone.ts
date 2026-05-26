export const normalizePhoneDigits = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 65248))
    .replace(/\D/g, "");

export const normalizePhoneE164 = (value: string) => {
  const digits = normalizePhoneDigits(value);
  return digits ? `+${digits}` : "";
};

export const buildPhoneE164 = (dialCode: string, localNumber: string) => {
  const dialDigits = normalizePhoneDigits(dialCode);
  const localDigits = normalizePhoneDigits(localNumber);
  return dialDigits || localDigits ? `+${dialDigits}${localDigits}` : "";
};