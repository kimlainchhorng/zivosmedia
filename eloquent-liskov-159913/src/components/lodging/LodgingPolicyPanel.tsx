/**
 * LodgingPolicyPanel - guest-side Booking-style policies grid.
 * Renders only sections that have data; hidden if profile is empty.
 */
import { Clock, CalendarX, Dog, Baby, CreditCard, Languages, Phone, ShieldCheck } from "lucide-react";
import type { LodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";

interface Props {
  profile: LodgePropertyProfile | null | undefined;
}

const PAYMENT_LABELS: Record<string, string> = {
  card: "Credit / Debit card",
  cash: "Cash",
  aba: "ABA Pay",
  bank_transfer: "Bank transfer",
};

export function LodgingPolicyPanel({ profile }: Props) {
  if (!profile) return null;

  const hasCheckIn = profile.check_in_from || profile.check_out_until;
  const hasCancel = profile.cancellation_policy;
  const hasPet = profile.pet_policy && profile.pet_policy.allowed !== undefined;
  const hasChild = profile.child_policy && profile.child_policy.allowed !== undefined;
  const hasPay = (profile.payment_methods || []).length > 0;
  const hasLang = (profile.languages || []).length > 0;
  const hasContact = profile.contact && (profile.contact.phone || profile.contact.email || profile.contact.whatsapp);

  if (!hasCheckIn && !hasCancel && !hasPet && !hasChild && !hasPay && !hasLang && !hasContact) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-3">
      <h3 className="text-[12px] font-bold text-foreground mb-2.5">Property rules & policies</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {hasCheckIn && (
          <PolicyRow icon={Clock} title="Check-in / Check-out">
            {profile.check_in_from && (<>From <b>{profile.check_in_from}</b>{profile.check_in_until ? ` until ${profile.check_in_until}` : ""}<br /></>)}
            {profile.check_out_from && (<>Out {profile.check_out_from}–<b>{profile.check_out_until || "11:00"}</b></>)}
          </PolicyRow>
        )}
        {hasCancel && (
          <PolicyRow icon={CalendarX} title="Cancellation">
            {profile.cancellation_policy}
            {profile.cancellation_window_hours ? <><br />Free up to <b>{profile.cancellation_window_hours}h</b> before check-in</> : null}
          </PolicyRow>
        )}
        {hasPet && (
          <PolicyRow icon={Dog} title="Pets">
            {profile.pet_policy.allowed ? (
              <>Allowed{profile.pet_policy.fee_cents ? ` · $${(profile.pet_policy.fee_cents / 100).toFixed(2)} fee` : ""}{profile.pet_policy.max_weight_kg ? ` · max ${profile.pet_policy.max_weight_kg}kg` : ""}</>
            ) : "Not allowed"}
          </PolicyRow>
        )}
        {hasChild && (
          <PolicyRow icon={Baby} title="Children">
            {profile.child_policy.allowed ? (
              <>Welcome{profile.child_policy.min_age != null ? ` from age ${profile.child_policy.min_age}` : ""}{profile.child_policy.cot_available ? " · cot available" : ""}</>
            ) : "Adults only"}
          </PolicyRow>
        )}
        {hasPay && (
          <PolicyRow icon={CreditCard} title="Payment">
            {(profile.payment_methods || []).map(p => PAYMENT_LABELS[p] || p).join(", ")}
            {(profile.currencies_accepted || []).length > 0 && <><br /><span className="text-muted-foreground">{(profile.currencies_accepted || []).join(" · ")}</span></>}
          </PolicyRow>
        )}
        {hasLang && (
          <PolicyRow icon={Languages} title="Languages">
            {profile.languages.slice(0, 5).join(", ")}{profile.languages.length > 5 ? ` +${profile.languages.length - 5}` : ""}
          </PolicyRow>
        )}
        {hasContact && (
          <PolicyRow icon={Phone} title="Contact">
            {profile.contact.phone && (
              <span className="inline-flex items-center gap-1 flex-wrap">
                {profile.contact.phone}
                {profile.contact.phone_verified_at && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0 text-[9px] font-semibold"
                    title="Phone number verified by store owner via SMS"
                  >
                    <ShieldCheck className="h-2.5 w-2.5" /> Verified
                  </span>
                )}
              </span>
            )}
            {profile.contact.email && <><br />{profile.contact.email}</>}
          </PolicyRow>
        )}
      </div>
    </div>
  );
}

function PolicyRow({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-2 rounded-xl bg-muted/30 border border-border/60">
      <Icon className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground leading-snug">{children}</div>
      </div>
    </div>
  );
}
