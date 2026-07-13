import { format } from "date-fns";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatChatDateLabel(value: string | number | Date, now: Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = startOfLocalDay(now);
  const messageDay = startOfLocalDay(date);
  const ageDays = Math.round((today.getTime() - messageDay.getTime()) / DAY_MS);

  if (ageDays === 0) return "Today";
  if (ageDays === 1) return "Yesterday";
  if (ageDays > 1 && ageDays < 7) return format(date, "EEEE");
  if (date.getFullYear() === now.getFullYear()) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
}
