import { motion } from "framer-motion";
import { Settings, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_QUICK_LINKS, type QuickLink } from "./quickLinks";

type Props = {
  onNavigate: (to: string) => void;
  /** Override the default link list, e.g. to inject custom items or counts. */
  links?: QuickLink[];
  className?: string;
};

const ProfileQuickLinksCard = ({ onNavigate, links = DEFAULT_QUICK_LINKS, className }: Props) => {
  return (
    <div
      className={cn(
        "mx-3 lg:mx-0 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-3 shadow-sm",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-bold tracking-tight text-foreground">Account</h3>
        <button
          type="button"
          onClick={() => onNavigate("/settings")}
          className="text-[11px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-md px-1.5 py-0.5"
        >
          See all
        </button>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.key}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate(link.to)}
                aria-label={link.label}
                className="relative flex w-full flex-col items-center gap-1.5 rounded-2xl border border-border/40 bg-background/60 px-2 py-3 text-center transition-colors hover:bg-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <span
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full",
                    link.tint || "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {!!link.badge && link.badge > 0 && (
                    <span
                      aria-label={`${link.badge} unread`}
                      className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-[16px] tabular-nums shadow-md"
                    >
                      {link.badge > 99 ? "99+" : link.badge}
                    </span>
                  )}
                </span>
                <span className="truncate text-[11px] font-semibold leading-tight text-foreground">
                  {link.label}
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onNavigate("/settings")}
        className="mt-2 flex w-full items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <span className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-semibold text-foreground">App settings</span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
      </button>
    </div>
  );
};

export default ProfileQuickLinksCard;
