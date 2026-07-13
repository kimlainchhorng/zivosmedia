import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-[1490] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

// Each side reserves the matching safe-area inset on top of its base padding
// so content (and the close button positioned below) never collides with the
// iOS status bar / Dynamic Island or the Android gesture area. Without these
// max() guards, sheets that touch the top edge get clipped by the system
// status bar — visible on iOS as the Wi-Fi/clock icons covering the close X.
const sheetVariants = cva(
  "fixed z-[1500] gap-4 bg-background px-6 shadow-2xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top pt-[max(1.5rem,calc(var(--zivo-safe-top,0px)+0.5rem))] pb-6",
        bottom:
          "inset-x-0 bottom-0 border-t rounded-t-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom pt-6 pb-[max(1.5rem,calc(var(--zivo-safe-bottom,0px)+0.5rem))]",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm pt-[max(1.5rem,calc(var(--zivo-safe-top,0px)+0.5rem))] pb-[max(1.5rem,var(--zivo-safe-bottom,0px))]",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm pt-[max(1.5rem,calc(var(--zivo-safe-top,0px)+0.5rem))] pb-[max(1.5rem,var(--zivo-safe-bottom,0px))]",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, ...props }, ref) => {
    const zMatch = className?.match(/(?:^|\s)z-\[(\d+)\]/);
    const overlayZClass = zMatch ? `z-[${Math.max(0, parseInt(zMatch[1], 10) - 1)}]` : undefined;

    return (
      <SheetPortal>
        <SheetOverlay className={overlayZClass} />
        <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
          {children}
          {/* Close button: only side="top"/"left"/"right" sheets touch the
              status bar, so they need the safe-area inset. For side="bottom"
              the sheet sits at the bottom of the screen — applying the inset
              there pushes the X far below the title, which looks broken. */}
          <SheetPrimitive.Close
            className="absolute right-4 rounded-full w-8 h-8 flex items-center justify-center bg-foreground text-background shadow-md ring-1 ring-black/10 hover:opacity-90 ring-offset-background transition-all active:scale-90 touch-manipulation focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-50"
            style={{
              top:
                side === "bottom"
                  ? "0.75rem"
                  : "calc(var(--zivo-safe-top,0px) + 0.75rem)",
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
