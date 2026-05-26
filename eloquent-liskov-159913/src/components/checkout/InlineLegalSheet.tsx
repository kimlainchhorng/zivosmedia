/**
 * Inline Legal Sheet — renders legal page content in a bottom sheet
 * Uses lazy-loaded React components (not iframes) so content renders properly
 */
import { lazy, Suspense, useState, useMemo } from "react";
import { X, Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Lazy load legal page components
const legalPages: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  "/terms": lazy(() => import("@/pages/Terms")),
  "/privacy": lazy(() => import("@/pages/Privacy")),
  "/cookies": lazy(() => import("@/pages/legal/CookiePolicy")),
  "/partner-disclosure": lazy(() => import("@/pages/legal/PartnerDisclosure")),
  "/legal/partner-disclosure": lazy(() => import("@/pages/legal/PartnerDisclosure")),
  "/legal/flight-terms": lazy(() => import("@/pages/legal/FlightTerms")),
};

interface InlineLegalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
}

export default function InlineLegalSheet({ open, onOpenChange, title, url }: InlineLegalSheetProps) {
  // Strip hash fragments so "/legal/flight-terms#refunds" resolves to "/legal/flight-terms"
  const basePath = url.split("#")[0];
  const PageComponent = legalPages[basePath];

  // Avoid mounting any sheet portal/focus guards until actually opened.
  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 flex flex-col [&>button]:hidden">
        {/* Custom header — single close button */}
        <div className="px-5 pt-5 pb-3 border-b border-border/30 flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold">{title}</h3>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)} className="rounded-full h-8 w-8 shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content area — renders the actual React component */}
        <ScrollArea className="flex-1">
          <div className="legal-sheet-content [&_header]:hidden [&_nav]:hidden [&_footer]:hidden [&_.safe-bottom]:hidden [&>div>div>nav]:hidden [&>div>div>header]:hidden">
            {PageComponent ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <div className="[&>div]:min-h-0 [&>div>nav]:hidden [&>div>header]:hidden [&>div>footer]:hidden [&>div>div>a]:hidden [&_.pt-24]:pt-4 [&_.pt-20]:pt-4 [&_.py-12]:py-4 [&_.mb-8]:mb-2 [&_.mb-12]:mb-4 [&_.text-4xl]:text-xl [&_.text-5xl]:text-xl [&_.text-3xl]:text-lg [&_.lg\:text-4xl]:text-lg">
                  <PageComponent />
                </div>
              </Suspense>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <p className="text-sm">Content not available</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Hook to manage legal sheet state
 */
export function useLegalSheet() {
  const [sheet, setSheet] = useState<{ open: boolean; title: string; url: string }>({
    open: false,
    title: "",
    url: "",
  });

  const openSheet = (title: string, url: string) => {
    setSheet({ open: true, title, url });
  };

  const closeSheet = () => {
    setSheet(prev => ({ ...prev, open: false }));
  };

  return { sheet, openSheet, closeSheet, setOpen: (open: boolean) => setSheet(prev => ({ ...prev, open })) };
}
