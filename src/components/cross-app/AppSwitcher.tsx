import { useMemo, useState } from "react";
import { ArrowUpRight, Check, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ZIVO_APPS, getCurrentZivoApp } from "@/config/zivoApps";
import ZivoChatSupportButton from "@/components/cross-app/ZivoChatSupportButton";

export interface AppSwitcherProps {
  /** Extra classes for the trigger button. */
  className?: string;
  /** Popover alignment relative to the trigger. Defaults to "end". */
  align?: "start" | "center" | "end";
}

/**
 * Global ZIVO app switcher — a grid-icon Popover listing every app in the ZIVO
 * network (from the shared `ZIVO_APPS` registry). The app you're currently on
 * is marked "Current"; the others link out to their production origin, carrying
 * the shared Zivosmedia identity. A ZivoChat support entry sits at the bottom so
 * every surface exposes the same support handoff.
 *
 * Self-contained (owns its Popover) so host surfaces only render `<AppSwitcher />`.
 * It performs no auth/payment work — only same-network navigation.
 */
export default function AppSwitcher({ className, align = "end" }: AppSwitcherProps) {
  const [open, setOpen] = useState(false);
  const current = useMemo(() => getCurrentZivoApp(), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Switch ZIVO app"
          className={cn(
            "w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50",
            className,
          )}
        >
          <LayoutGrid className="w-[18px] h-[18px]" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className="w-80 p-0 bg-card/95 backdrop-blur-2xl border-border/50 shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="p-3 border-b border-border/50 bg-muted/30">
          <p className="text-sm font-semibold">ZIVO apps</p>
          <p className="text-xs text-muted-foreground">One account across the whole network</p>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-1">
          {ZIVO_APPS.map((app) => {
            const isCurrent = current?.key === app.key;
            const rowClass = cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
              isCurrent ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/60",
            );
            const body = (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-sm">{app.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.tagline}</p>
                </div>
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary shrink-0">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Current
                  </span>
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground/70 shrink-0" aria-hidden="true" />
                )}
              </>
            );

            return isCurrent ? (
              <div key={app.key} className={rowClass} aria-current="page">
                {body}
              </div>
            ) : (
              <a
                key={app.key}
                href={app.origin}
                className={rowClass}
                onClick={() => setOpen(false)}
              >
                {body}
              </a>
            );
          })}
        </div>

        <div className="p-2 border-t border-border/50">
          <ZivoChatSupportButton
            path="/"
            variant="ghost"
            className="w-full justify-start gap-2 rounded-xl text-sm font-medium"
            onClick={() => setOpen(false)}
          >
            Support on ZivoChat
          </ZivoChatSupportButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}
