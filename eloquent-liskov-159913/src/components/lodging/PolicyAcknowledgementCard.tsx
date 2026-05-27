/**
 * PolicyAcknowledgementCard — compact card showing which policy sections
 * the guest viewed at booking time (proof of acknowledgement).
 */
import { ShieldCheck, FileText, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ConsentEntry {
  viewed_at?: string;
  viewed_section?: string;
  policy_key?: string;
}

interface Props {
  consent: { rules?: ConsentEntry; cancellation?: ConsentEntry } | null | undefined;
  versionStamp?: string | null;
}

const ago = (iso?: string) => {
  if (!iso) return null;
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return null; }
};

export function PolicyAcknowledgementCard({ consent, versionStamp }: Props) {
  if (!consent || (!consent.rules && !consent.cancellation)) return null;

  const items = [
    consent.rules && {
      icon: FileText,
      label: "House rules",
      section: consent.rules.viewed_section || "house_rules",
      when: ago(consent.rules.viewed_at),
    },
    consent.cancellation && {
      icon: ShieldAlert,
      label: "Cancellation policy",
      section: consent.cancellation.policy_key
        ? `${consent.cancellation.viewed_section || "cancellation_policy"} · ${consent.cancellation.policy_key}`
        : (consent.cancellation.viewed_section || "cancellation_policy"),
      when: ago(consent.cancellation.viewed_at),
    },
  ].filter(Boolean) as Array<{ icon: typeof FileText; label: string; section: string; when: string | null }>;

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <p className="text-[11px] font-bold text-emerald-700">Policies acknowledged</p>
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <li key={i} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1.5 min-w-0">
                <Icon className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="font-semibold truncate">{it.label}</span>
                <span className="text-muted-foreground truncate">· {it.section}</span>
              </span>
              {it.when && <span className="text-muted-foreground shrink-0">{it.when}</span>}
            </li>
          );
        })}
      </ul>
      {versionStamp && (
        <p className="text-[10px] text-muted-foreground border-t border-emerald-500/15 pt-1.5">
          Version stamp · {new Date(versionStamp).toLocaleString()}
        </p>
      )}
    </div>
  );
}
