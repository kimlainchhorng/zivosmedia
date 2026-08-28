const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const resolveDateLocale = (locale: string) => {
  const candidate = locale.trim() || "en";

  try {
    return Intl.DateTimeFormat.supportedLocalesOf([candidate])[0] ?? "en";
  } catch {
    return "en";
  }
};

export const formatBusTravelDate = (value: string, locale = "en") => {
  const match = ISO_CALENDAR_DATE.exec(value);
  if (!match) return value;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(resolveDateLocale(locale), {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
};
