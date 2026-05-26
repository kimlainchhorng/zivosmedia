/**
 * ReadReceipt — Telegram-style status indicator for outgoing messages.
 *
 * sending   → clock icon (optimistic, not yet acknowledged by server)
 * sent      → single check
 * delivered → double check (muted)
 * read      → double check (blue/sky tint)
 */
import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReadReceiptStatus = "sending" | "sent" | "delivered" | "read";

interface ReadReceiptProps {
  status: ReadReceiptStatus;
  /** `onPrimary` tints icons to read against a colored "me" bubble. */
  tone?: "default" | "onPrimary";
  className?: string;
}

export default function ReadReceipt({ status, tone = "default", className }: ReadReceiptProps) {
  const size = cn("h-3.5 w-3.5", className);
  const muted = tone === "onPrimary" ? "text-primary-foreground/35" : "text-muted-foreground/40";
  const readTint = tone === "onPrimary" ? "text-sky-300" : "text-blue-500";

  if (status === "sending") return <Clock className={cn(size, muted)} />;
  if (status === "read") return <CheckCheck className={cn(size, readTint)} />;
  if (status === "delivered") return <CheckCheck className={cn(size, muted)} />;
  return <Check className={cn(size, muted)} />;
}
