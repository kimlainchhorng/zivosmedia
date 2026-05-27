/**
 * Sticky Search Summary Bar
 * Shows search parameters with edit button
 * Fixed on scroll for quick reference
 */

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { EditSearchModal } from "./EditSearchModal";

export type ServiceType = "flights" | "hotels" | "cars";

interface StickySearchSummaryProps {
  service: ServiceType;
  title: ReactNode;
  badges: { label: string; value?: string }[];
  backLink: string;
  backLabel?: string;
  searchForm?: ReactNode;
  onEditClick?: () => void;
  className?: string;
}

const serviceColors = {
  flights: {
    gradient: "from-muted to-muted",
    accent: "text-sky-500",
    badge: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    button: "hover:bg-sky-500/10 hover:text-sky-500 hover:border-sky-500/50",
  },
  hotels: {
    gradient: "from-amber-950/40 to-background",
    accent: "text-amber-500",
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    button: "hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/50",
  },
  cars: {
    gradient: "from-muted to-muted",
    accent: "text-violet-500",
    badge: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    button: "hover:bg-violet-500/10 hover:text-violet-500 hover:border-violet-500/50",
  },
};

export function StickySearchSummary({
  service,
  title,
  badges,
  backLink,
  backLabel = "New search",
  searchForm,
  onEditClick,
  className,
}: StickySearchSummaryProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const colors = serviceColors[service];

  const handleEditClick = () => {
    if (onEditClick) {
      onEditClick();
    } else {
      setShowEditModal(true);
    }
  };

  return (
    <>
      <section
        className={cn(
          "sticky top-16 z-30 bg-gradient-to-b border-b border-border/50 py-4",
          colors.gradient,
          className
        )}
      >
        <div className="container mx-auto px-4">
          {/* Back link */}
          <Link
            to={backLink}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>

          {/* Summary row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
              {badges.map((badge, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className={cn("text-xs sm:text-sm", colors.badge)}
                >
                  {badge.value ? `${badge.label}: ${badge.value}` : badge.label}
                </Badge>
              ))}
            </div>

            {searchForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditClick}
                className={cn("gap-2 transition-all duration-200 min-h-[40px] rounded-xl active:scale-95 touch-manipulation border-transparent bg-background/20 backdrop-blur-sm", colors.button)}
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Modify Search</span>
                <span className="sm:hidden">Modify</span>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Edit Search Modal (responsive: dialog on desktop, sheet on mobile) */}
      {searchForm && (
        <EditSearchModal
          service={service}
          open={showEditModal}
          onOpenChange={setShowEditModal}
        >
          {searchForm}
        </EditSearchModal>
      )}
    </>
  );
}
