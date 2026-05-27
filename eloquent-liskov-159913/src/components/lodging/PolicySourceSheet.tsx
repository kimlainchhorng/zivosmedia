/**
 * PolicySourceSheet — "View source" inline disclosure for consent checkboxes.
 * Shows the exact rule data the guest is consenting to.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { cancellationLabel, cancellationDescription } from "@/lib/lodging/cancellationCopy";

interface HouseRulesData {
  quiet_hours?: string;
  parties_allowed?: boolean;
  smoking_zones?: string;
  min_age?: number;
  id_at_checkin?: boolean;
  security_deposit_cents?: number;
}

interface Props {
  type: "house_rules" | "cancellation";
  houseRules?: HouseRulesData;
  cancellationKey?: string | null;
  rateLabel?: string;
  onOpened?: () => void;
}

const fmtMoney = (c?: number) => (c ? `$${(c / 100).toFixed(2)}` : "—");

export function PolicySourceSheet({
  type, houseRules, cancellationKey, rateLabel, onOpened,
}: Props) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) onOpened?.();
  };

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={toggle}
        className="text-[10px] font-bold text-primary inline-flex items-center gap-0.5 hover:underline"
      >
        {type === "house_rules" ? <FileText className="h-2.5 w-2.5" /> : <ShieldAlert className="h-2.5 w-2.5" />}
        View source
        {open ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      </button>

      {open && (
        <div className={cn(
          "mt-1.5 p-2.5 rounded-lg border border-primary/30 bg-primary/[0.04] text-[11px] space-y-1"
        )}>
          {type === "house_rules" ? (
            <>
              <p className="font-bold text-[11px] mb-1">House rules — source data</p>
              <ul className="space-y-0.5">
                <SourceRow label="Quiet hours" value={houseRules?.quiet_hours || "—"} highlight={!!houseRules?.quiet_hours} />
                <SourceRow label="Parties / events" value={houseRules?.parties_allowed ? "Allowed (notify host)" : "Not allowed"} highlight />
                <SourceRow label="Smoking" value={houseRules?.smoking_zones || "—"} highlight={!!houseRules?.smoking_zones} />
                <SourceRow label="Min age" value={houseRules?.min_age != null ? `${houseRules.min_age}+` : "—"} highlight={houseRules?.min_age != null} />
                <SourceRow label="ID at check-in" value={houseRules?.id_at_checkin ? "Required" : "Not required"} highlight={!!houseRules?.id_at_checkin} />
                <SourceRow label="Security deposit" value={fmtMoney(houseRules?.security_deposit_cents)} highlight={!!houseRules?.security_deposit_cents} />
              </ul>
            </>
          ) : (
            <>
              <p className="font-bold text-[11px] mb-1">Cancellation — source data</p>
              <SourceRow label="Policy key" value={cancellationKey || "standard"} highlight />
              <SourceRow label="Label" value={cancellationLabel(cancellationKey)} highlight />
              {rateLabel && <SourceRow label="Rate type" value={rateLabel} highlight />}
              <p className="mt-1.5 italic text-muted-foreground">{cancellationDescription(cancellationKey)}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SourceRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <li className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold text-right", highlight ? "text-foreground" : "text-muted-foreground")}>{value}</span>
    </li>
  );
}
