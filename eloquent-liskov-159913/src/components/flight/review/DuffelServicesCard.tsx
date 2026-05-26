/**
 * DuffelServicesCard — 3D Spatial premium add-ons
 * Floating glassmorphic card with depth and tactile toggles
 */
import { motion } from "framer-motion";
import { Luggage, Armchair, Shield, Package, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { type DuffelAvailableService, useDuffelAvailableServices } from "@/hooks/useDuffelFlights";

const SERVICE_META: Record<string, { icon: typeof Luggage; label: string; color: string }> = {
  baggage: { icon: Luggage, label: "Extra Baggage", color: "text-[hsl(var(--flights))]" },
  seat: { icon: Armchair, label: "Seat Selection", color: "text-[hsl(var(--flights))]" },
  cancel_for_any_reason: { icon: Shield, label: "Cancel For Any Reason", color: "text-emerald-500" },
};

function getServiceMeta(type: string) {
  return SERVICE_META[type] || { icon: Package, label: type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), color: "text-muted-foreground" };
}

function formatAmount(amount: string, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(parseFloat(amount));
  } catch {
    return `$${amount}`;
  }
}

interface DuffelServicesCardProps {
  offerId: string | null;
  selectedServiceIds: string[];
  onToggleService: (service: DuffelAvailableService) => void;
  className?: string;
}

export function DuffelServicesCard({ offerId, selectedServiceIds, onToggleService, className }: DuffelServicesCardProps) {
  const { data, isLoading, error } = useDuffelAvailableServices(offerId);

  const cardStyle = {
    background: "hsl(var(--card))",
    boxShadow: `0 20px 40px -16px hsl(var(--foreground)/0.07),
                 0 6px 12px -4px hsl(var(--foreground)/0.03),
                 inset 0 1.5px 0 hsl(var(--background)/0.8),
                 inset 0 -1px 0 hsl(var(--foreground)/0.03)`,
    transform: "perspective(600px) rotateX(1deg)",
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("overflow-hidden rounded-3xl border-[1.5px] border-border/20", className)}
        style={cardStyle}
      >
        <div className="py-10 flex flex-col items-center gap-2.5 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--flights))]" />
          <p className="text-xs font-medium">Loading available add-ons…</p>
        </div>
      </motion.div>
    );
  }

  if (error || !data?.services?.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("overflow-hidden rounded-3xl border-[1.5px] border-border/20", className)}
        style={cardStyle}
      >
        <div className="p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground"
              style={{
                transform: "perspective(200px) rotateX(5deg) rotateY(-3deg)",
                boxShadow: "0 6px 14px -6px hsl(var(--foreground)/0.08), inset 0 1px 0 hsl(var(--background)/0.5)",
              }}
            >
              <Package className="w-4 h-4" />
            </div>
            <h3 className="text-[13px] font-extrabold">Trip Add-ons</h3>
          </div>
          <div
            className="flex items-start gap-2.5 p-3.5 rounded-2xl border border-border/15"
            style={{
              background: "linear-gradient(145deg, hsl(var(--muted)/0.35), hsl(var(--muted)/0.15))",
              boxShadow: "inset 0 2px 4px -1px hsl(var(--foreground)/0.04), inset 0 -1px 0 hsl(var(--background)/0.5)",
            }}
          >
            <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {error
                ? "Unable to load add-on services. You can add extras after booking through the airline's website."
                : "No add-on services available for this fare. Additional options like seat selection and extra baggage may be available through the airline after booking."}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const { grouped } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn("overflow-hidden rounded-3xl border-[1.5px] border-border/20", className)}
      style={cardStyle}
    >
      {/* Header */}
      <div
        className="px-5 py-3 border-b border-border/15 flex items-center gap-2.5"
        style={{
          background: "linear-gradient(135deg, hsl(var(--muted)/0.3), transparent)",
        }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--flights))]/15 to-[hsl(var(--flights))]/5 text-[hsl(var(--flights))]"
          style={{
            transform: "perspective(200px) rotateX(5deg) rotateY(-3deg)",
            boxShadow: "0 8px 18px -6px hsl(var(--flights)/0.25), inset 0 1px 0 hsl(var(--background)/0.5)",
          }}
        >
          <Package className="w-4 h-4" />
        </div>
        <h3 className="text-[13px] font-extrabold flex-1">Available Add-ons</h3>
        <Badge
          variant="secondary"
          className="text-[9px] px-2 py-0.5 font-bold"
          style={{
            boxShadow: "0 2px 6px -2px hsl(var(--foreground)/0.06)",
          }}
        >
          {data.total} option{data.total !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="p-4 space-y-3">
        {Object.entries(grouped).map(([type, services]) => {
          const meta = getServiceMeta(type);
          const Icon = meta.icon;

          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{meta.label}</span>
              </div>
              {services.map((svc, i) => {
                const isSelected = selectedServiceIds.includes(svc.id);
                return (
                  <motion.label
                    key={svc.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.4 }}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-2xl border-[1.5px] cursor-pointer transition-all duration-200 mb-2",
                      isSelected
                        ? "border-[hsl(var(--flights))]/30"
                        : "border-border/15 hover:border-border/30"
                    )}
                    style={{
                      background: isSelected
                        ? "linear-gradient(135deg, hsl(var(--flights)/0.06), transparent)"
                        : undefined,
                      boxShadow: isSelected
                        ? "0 8px 20px -8px hsl(var(--flights)/0.15), inset 0 1px 0 hsl(var(--background)/0.6)"
                        : "0 2px 6px -3px hsl(var(--foreground)/0.05), inset 0 1px 0 hsl(var(--background)/0.4)",
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleService(svc)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold capitalize">
                        {type.replace(/_/g, " ")}
                        {svc.maximum_quantity > 1 && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            (up to {svc.maximum_quantity})
                          </span>
                        )}
                      </p>
                      {svc.segment_ids?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Per segment · {svc.passenger_ids?.length || 1} passenger{(svc.passenger_ids?.length || 1) > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-[12px] font-bold whitespace-nowrap text-[hsl(var(--flights))]"
                      style={{ textShadow: isSelected ? "0 2px 8px hsl(var(--flights)/0.2)" : undefined }}
                    >
                      +{formatAmount(svc.total_amount, svc.total_currency)}
                    </span>
                  </motion.label>
                );
              })}
            </div>
          );
        })}

        <p className="text-[9px] text-muted-foreground text-center pt-1 leading-relaxed">
          Add-on prices are provided by the airline in real-time. Services are subject to availability.
        </p>
      </div>
    </motion.div>
  );
}
