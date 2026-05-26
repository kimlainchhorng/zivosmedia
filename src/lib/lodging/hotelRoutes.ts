interface HotelRouteOptions {
  city?: string | null;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  adults?: number | null;
  children?: number | null;
  rooms?: number | null;
  bundle?: boolean;
}

const toLocalDateParam = (value: Date | string): string => {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const defaultHotelDates = (base = new Date()) => {
  const checkIn = new Date(base);
  checkIn.setHours(0, 0, 0, 0);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);
  return { checkIn, checkOut };
};

export function buildHotelsPath(options: HotelRouteOptions = {}): string {
  const defaults = defaultHotelDates();
  const checkIn = options.checkIn ?? defaults.checkIn;
  const checkOut = options.checkOut ?? (() => {
    const next = typeof checkIn === "string"
      ? new Date(`${checkIn.slice(0, 10)}T00:00:00`)
      : new Date(checkIn);
    next.setDate(next.getDate() + 1);
    return next;
  })();
  const params = new URLSearchParams();

  if (options.city?.trim()) params.set("city", options.city.trim());
  params.set("ci", toLocalDateParam(checkIn));
  params.set("co", toLocalDateParam(checkOut));
  params.set("adults", String(Math.max(1, options.adults ?? 2)));

  if ((options.children ?? 0) > 0) params.set("children", String(options.children));
  if ((options.rooms ?? 1) > 1) params.set("rooms", String(options.rooms));
  if (options.bundle) params.set("bundle", "1");

  return `/hotels?${params.toString()}`;
}
