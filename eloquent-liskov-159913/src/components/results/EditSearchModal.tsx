/**
 * Edit Search Modal Component
 * 
 * Unified modal for editing search parameters on results pages.
 * Uses Dialog on desktop, Sheet on mobile.
 * Pre-filled with current search values, updates URL on submit.
 */

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type ServiceType = "flights" | "hotels" | "cars";

interface EditSearchModalProps {
  service: ServiceType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

const serviceConfig = {
  flights: {
    title: "Edit Flight Search",
    description: "Update your search criteria to find new flights",
    accent: "sky",
  },
  hotels: {
    title: "Edit Hotel Search",
    description: "Update your search criteria to find new hotels",
    accent: "amber",
  },
  cars: {
    title: "Edit Car Search",
    description: "Update your search criteria to find new car rentals",
    accent: "violet",
  },
};

export function EditSearchModal({
  service,
  open,
  onOpenChange,
  children,
}: EditSearchModalProps) {
  const isMobile = useIsMobile();
  const config = serviceConfig[service];

  // Mobile: Use bottom sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className="h-auto max-h-[90vh] overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="text-xl">{config.title}</SheetTitle>
            <SheetDescription>{config.description}</SheetDescription>
          </SheetHeader>
          <div className="pb-safe">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Edit Search Trigger Button
 * Standardized button for opening the edit search modal
 */
interface EditSearchTriggerProps {
  onClick: () => void;
  service: ServiceType;
  className?: string;
}

const buttonColors = {
  flights: "hover:bg-sky-500/10 hover:text-sky-500 hover:border-sky-500/50",
  hotels: "hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/50",
  cars: "hover:bg-violet-500/10 hover:text-violet-500 hover:border-violet-500/50",
};

export function EditSearchTrigger({ onClick, service, className }: EditSearchTriggerProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "gap-2 transition-all duration-200 rounded-xl active:scale-95 touch-manipulation",
        buttonColors[service],
        className
      )}
    >
      <Pencil className="w-4 h-4" />
      <span className="hidden sm:inline">Edit Search</span>
      <span className="sm:hidden">Edit</span>
    </Button>
  );
}

/**
 * Hook for managing edit search modal state with URL updates
 */
export function useEditSearchModal(service: ServiceType) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleUpdate = useCallback(async (newParams: URLSearchParams) => {
    setIsUpdating(true);
    
    // Preserve UTM and tracking params from current URL
    const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "creator", "subid"];
    trackingParams.forEach((key) => {
      const val = searchParams.get(key);
      if (val && !newParams.has(key)) {
        newParams.set(key, val);
      }
    });

    // Get target path based on service
    const paths = {
      flights: "/flights/results",
      hotels: "/hotels/results",
      cars: "/rent-car/results",
    };

    // Navigate to updated results
    navigate(`${paths[service]}?${newParams.toString()}`);
    
    // Close modal after short delay for visual feedback
    setTimeout(() => {
      setIsUpdating(false);
      setOpen(false);
    }, 300);
  }, [navigate, searchParams, service]);

  return {
    open,
    setOpen,
    isUpdating,
    handleUpdate,
  };
}

export default EditSearchModal;
