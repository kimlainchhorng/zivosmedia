/**
 * ResponsiveModal — bottom Sheet on mobile, centered Dialog on `≥sm`.
 * Includes scrollable body, sticky footer with safe-area padding, and overscroll containment.
 */
import * as React from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFocusReturn } from "@/components/admin/ads/useFocusReturn";
import { cn } from "@/lib/utils";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** width on desktop dialog */
  className?: string;
  /** disable mobile bottom-sheet behavior (always dialog) */
  forceDialog?: boolean;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  forceDialog,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();
  useFocusReturn(open);

  const handleHandleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  if (isMobile && !forceDialog) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          aria-modal="true"
          className="p-0 h-auto max-h-[92dvh] flex flex-col rounded-t-2xl gap-0"
        >
          {/* Drag handle — keyboard accessible */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Drag or press Enter to dismiss"
            onClick={() => onOpenChange(false)}
            onKeyDown={handleHandleKey}
            className="flex justify-center pt-2 pb-1 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-2xl"
          >
            <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          {/* Visible-on-focus close button (Sheet's built-in X is in top-right; this is an a11y backup) */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-10 focus:rounded-md focus:bg-background focus:p-1.5 focus:ring-2 focus:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
          {(title || description) && (
            <SheetHeader className="px-4 pb-3 pt-1 text-left shrink-0">
              {title && <SheetTitle className="text-base">{title}</SheetTitle>}
              {description && <SheetDescription className="text-xs">{description}</SheetDescription>}
            </SheetHeader>
          )}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {children}
          </div>
          {footer && (
            <div
              className="shrink-0 border-t border-border px-4 pt-3 bg-background"
              style={{ paddingBottom: "calc(var(--zivo-mobile-nav-h, 64px) + var(--zivo-safe-bottom,0px) + 0.75rem)" }}
            >
              {footer}
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 max-w-md w-[calc(100vw-2rem)] sm:w-full max-h-[85vh] flex flex-col gap-0",
          className
        )}
      >
        {(title || description) && (
          <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
            {title && <DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>}
            {description && <DialogDescription className="text-xs sm:text-sm">{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t-2 border-border/80 px-5 py-4 bg-muted/30 backdrop-blur-sm rounded-b-lg shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Auto-stacks on mobile (primary on top), inline on desktop. */
export function ResponsiveModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2", className)}>
      {children}
    </div>
  );
}
