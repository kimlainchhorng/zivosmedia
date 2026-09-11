import { format as formatDate } from "date-fns";
import { km } from "date-fns/locale/km";
export function formatTravelDate(...args: Parameters<typeof formatDate>) {
  return formatDate(args[0], args[1], { ...args[2], ...(document.documentElement.lang === "km" ? { locale: km } : {}) });
}
