/**
 * PartnerBadge — visual marker for venues in the ZIVO network.
 * Restaurants & hotels that opted into our partner program get this badge so
 * users see which spots support in-app booking, ordering, and tracking.
 */
import BadgeCheck from "lucide-react/dist/esm/icons/badge-check";

interface Props {
  size?: "xs" | "sm" | "md";
  variant?: "filled" | "ghost";
  label?: string;
  className?: string;
}

const SIZE_MAP: Record<NonNullable<Props["size"]>, { wrapper: string; icon: string }> = {
  xs: { wrapper: "text-[9px] px-1.5 py-0.5 gap-0.5", icon: "w-2.5 h-2.5" },
  sm: { wrapper: "text-[10px] px-2 py-0.5 gap-1", icon: "w-3 h-3" },
  md: { wrapper: "text-[11px] px-2.5 py-1 gap-1", icon: "w-3.5 h-3.5" },
};

export default function PartnerBadge({
  size = "sm",
  variant = "filled",
  label = "ZIVO Partner",
  className = "",
}: Props) {
  const s = SIZE_MAP[size];
  const tone =
    variant === "filled"
      ? "bg-primary text-primary-foreground"
      : "bg-primary/10 text-primary border border-primary/30";
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide ${s.wrapper} ${tone} ${className}`}
      aria-label={label}
    >
      <BadgeCheck className={s.icon} />
      {label}
    </span>
  );
}
