/**
 * SegmentPicker — shared segment selector for Ads and Marketing wizards.
 * Shows segment name + live member count + last refreshed; "Everyone" fallback.
 */
import { Users, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMarketingSegments } from "@/hooks/useMarketingSegments";

interface Props {
  storeId: string;
  value: string | null;
  onChange: (segmentId: string | null) => void;
  onCreateNew?: () => void;
  className?: string;
}

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString();

export default function SegmentPicker({ storeId, value, onChange, onCreateNew, className }: Props) {
  const { data: segments = [], isLoading } = useMarketingSegments(storeId);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Audience</span>
        {onCreateNew && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-primary"
            onClick={onCreateNew}
          >
            <Plus className="w-3 h-3 mr-1" /> New segment
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "flex items-start gap-2 p-2.5 rounded-lg border text-left transition",
            value === null
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border hover:border-primary/40"
          )}
        >
          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold">Everyone</div>
            <div className="text-[10px] text-muted-foreground">All eligible customers</div>
          </div>
        </button>

        {isLoading ? (
          <div className="p-2.5 text-[11px] text-muted-foreground">Loading…</div>
        ) : (
          segments.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => onChange(s.id)}
              className={cn(
                "flex items-start gap-2 p-2.5 rounded-lg border text-left transition",
                value === s.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40"
              )}
            >
              <Users className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate">{s.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  ≈ {fmt(s.member_count || 0)} customers
                  {s.last_refreshed_at && (
                    <span className="ml-1 opacity-70">· refreshed</span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
      {!isLoading && segments.length === 0 && !onCreateNew && (
        <p className="text-[10px] text-muted-foreground">
          No saved segments yet — Everyone will be used.
        </p>
      )}
    </div>
  );
}
