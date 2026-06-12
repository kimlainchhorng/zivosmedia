/**
 * HubFormShell — shared premium shell for the hub "create" forms
 * (post a gig, list an item, create an event, start a voice room…).
 *
 * Owns the chrome (Header, back link, badge, title/subtitle, the form card,
 * and the submit button with busy/disabled state) so each create page only
 * declares its own labelled fields via `children`. Pairs with <Field/> and
 * `fieldClass` below for consistent, accessible inputs.
 */
import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { type LucideIcon } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

/** Shared input/textarea/select class for hub forms. */
export const fieldClass =
  "w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow";

export function Field({
  label,
  htmlFor,
  required,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-rose-500"> *</span>}
        {optional && <span className="font-medium normal-case tracking-normal text-muted-foreground/70"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

interface HubFormShellProps {
  backTo: string;
  backLabel: string;
  badge: string;
  badgeIcon?: LucideIcon;
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: () => void;
  busy: boolean;
  canSubmit: boolean;
  children: ReactNode;
}

export default function HubFormShell({
  backTo,
  backLabel,
  badge,
  badgeIcon: BadgeIcon = Sparkles,
  title,
  subtitle,
  submitLabel,
  onSubmit,
  busy,
  canSubmit,
  children,
}: HubFormShellProps) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-safe-header pb-24 container mx-auto px-4 max-w-lg">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-orange-500/10 border border-border text-xs font-semibold mb-3">
          <BadgeIcon className="w-3.5 h-3.5 text-fuchsia-500" />
          {badge}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">{title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>

        <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5 space-y-4">
          {children}
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || !canSubmit}
            className="w-full inline-flex items-center justify-center gap-1 py-3 rounded-xl bg-ig-gradient text-white font-bold text-sm shadow-md shadow-black/10 disabled:opacity-50 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
