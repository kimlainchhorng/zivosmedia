/**
 * CreateCampaignWizard — 4-step (Goal → Audience → Creative → Budget) wizard
 * inside a ResponsiveModal. Same data shape as the original single-form.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveModal,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Target,
  TrendingUp,
  Megaphone,
  Users,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import type { AdAccount, AdPlatform } from "@/hooks/useStoreAdsOverview";

interface PlatformDef {
  id: AdPlatform;
  label: string;
  icon: LucideIcon;
  color: string;
}

export interface CampaignFormState {
  name: string;
  objective: string;
  platforms: AdPlatform[];
  daily_budget: number;
  total_budget: number;
  currency: string;
  start_date: string;
  end_date: string;
  headline: string;
  body: string;
  cta: string;
  destination_url: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initial: CampaignFormState;
  isEditing: boolean;
  platforms: PlatformDef[];
  accounts: AdAccount[];
  onSave: (form: CampaignFormState, asDraft: boolean) => void;
  saving: boolean;
  walletBalanceCents?: number;
  onConnectPlatform?: (p: AdPlatform) => void;
  onAddFunds?: () => void;
}

const OBJECTIVES: { id: string; label: string; rationale: string; icon: LucideIcon }[] = [
  { id: "traffic", label: "Traffic", rationale: "Drive visitors to your site", icon: TrendingUp },
  { id: "conversions", label: "Conversions", rationale: "Get more orders or signups", icon: Target },
  { id: "awareness", label: "Awareness", rationale: "Reach new local customers", icon: Megaphone },
  { id: "leads", label: "Leads", rationale: "Collect interest and contacts", icon: Users },
  { id: "app_installs", label: "App installs", rationale: "Grow your mobile audience", icon: Smartphone },
];

const AUDIENCES = [
  { id: "local", label: "Local", body: "People near your store" },
  { id: "lookalike", label: "Lookalike", body: "Similar to your best customers" },
  { id: "retarget", label: "Retarget", body: "Recent visitors and cart abandoners" },
  { id: "custom", label: "Custom", body: "Define interests and demographics" },
];

const STEPS = ["Goal", "Audience", "Creative", "Budget"] as const;

function isValidUrl(u: string): boolean {
  if (!u) return true;
  try { new URL(u); return true; } catch { return false; }
}

export default function CreateCampaignWizard({
  open,
  onClose,
  initial,
  isEditing,
  platforms,
  accounts,
  onSave,
  saving,
  walletBalanceCents = 0,
  onConnectPlatform,
  onAddFunds,
}: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CampaignFormState>(initial);
  const [audience, setAudience] = useState("local");

  useEffect(() => {
    if (open) {
      setForm(initial);
      setStep(0);
    }
  }, [open, initial]);

  const connectedPlatforms = useMemo(
    () => new Set(accounts.filter((a) => a.status !== "disconnected").map((a) => a.platform)),
    [accounts]
  );

  const togglePlatform = (p: AdPlatform) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  };

  const dailyBudgetCents = Math.round(form.daily_budget * 100);
  const walletBlocks = walletBalanceCents > 0 || isEditing
    ? walletBalanceCents < dailyBudgetCents && !isEditing
    : false;
  // Only block submit (not draft) when wallet < daily budget AND user has any balance set up.
  // If wallet is 0 (never funded) we still allow submit and let backend enforce.
  const submitDisabled = saving || walletBlocks;

  const stepValid = (): boolean => {
    if (step === 0) return !!form.objective;
    if (step === 1) return form.platforms.length > 0;
    if (step === 2) return !!form.headline && isValidUrl(form.destination_url);
    if (step === 3) return form.daily_budget > 0 && !!form.name;
    return true;
  };

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const isLast = step === STEPS.length - 1;

  // Estimated reach: rough heuristic from daily budget × platform count
  const reachLow = Math.round(form.daily_budget * 200 * Math.max(1, form.platforms.length));
  const reachHigh = Math.round(form.daily_budget * 600 * Math.max(1, form.platforms.length));
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={isEditing ? "Edit Campaign" : "New Campaign"}
      footer={
        <ResponsiveModalFooter>
          <Button
            variant="outline"
            className="w-full sm:w-auto h-10"
            onClick={step === 0 ? onClose : prev}
          >
            {step === 0 ? "Cancel" : (
              <><ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back</>
            )}
          </Button>
          {!isLast ? (
            <Button
              className="w-full sm:w-auto h-10"
              onClick={next}
              disabled={!stepValid()}
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-10"
                onClick={() => onSave(form, true)}
                disabled={!stepValid() || saving}
              >
                Save draft
              </Button>
              <Button
                className="w-full sm:w-auto h-10"
                onClick={() => onSave(form, false)}
                disabled={!stepValid() || submitDisabled}
                title={walletBlocks ? "Wallet balance below daily budget — add funds to submit" : undefined}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Submit for review
              </Button>
            </div>
          )}
        </ResponsiveModalFooter>
      }
    >
      {/* Progress */}
      <div className="space-y-2 mb-3" aria-live="polite">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold shrink-0 transition",
                  i < step
                    ? "bg-emerald-500 text-white"
                    : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "h-0.5 flex-1 transition",
                  i < step ? "bg-emerald-500" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Step {step + 1} of {STEPS.length} · <span className="font-medium text-foreground">{STEPS[step]}</span>
        </p>
      </div>

      {/* Step 0: Goal */}
      {step === 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Choose your objective</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {OBJECTIVES.map((o) => {
              const Icon = o.icon;
              const selected = form.objective === o.id;
              return (
                <button type="button"
                  key={o.id}
                  onClick={() => setForm({ ...form, objective: o.id })}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 rounded-xl border-2 text-left transition active:scale-[0.98]",
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  )}
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{o.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{o.rationale}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1: Audience & Platforms */}
      {step === 1 && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Platforms</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-1.5">
              {platforms.map((p) => {
                const Icon = p.icon;
                const selected = form.platforms.includes(p.id);
                const connected = connectedPlatforms.has(p.id);
                return (
                  <button type="button"
                    key={p.id}
                    onClick={() => connected ? togglePlatform(p.id) : onConnectPlatform?.(p.id)}
                    aria-pressed={selected}
                    title={connected ? p.label : `Connect ${p.label}`}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition active:scale-95 touch-manipulation relative",
                      selected ? "border-primary bg-primary/5" : "border-border",
                      !connected && "opacity-60"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", p.color)} />
                    <span className="text-[10px]">{p.label.split(" ")[0]}</span>
                    {!connected && (
                      <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-white rounded-full px-1 leading-tight">+</span>
                    )}
                  </button>
                );
              })}
            </div>
            {platforms.some((p) => !connectedPlatforms.has(p.id)) && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Tap a dimmed platform to connect it.
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">Audience preset</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {AUDIENCES.map((a) => {
                const selected = audience === a.id;
                return (
                  <button type="button"
                    key={a.id}
                    onClick={() => setAudience(a.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col p-2 rounded-lg border-2 text-left transition active:scale-[0.98]",
                      selected ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <span className="text-xs font-semibold">{a.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-snug">{a.body}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Creative */}
      {step === 2 && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs flex items-center justify-between">
              <span>Headline</span>
              <span className="text-muted-foreground font-normal">{form.headline.length}/40</span>
            </Label>
            <Input
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value.slice(0, 40) })}
              maxLength={40}
              placeholder="Free delivery this weekend"
            />
          </div>
          <div>
            <Label className="text-xs flex items-center justify-between">
              <span>Body</span>
              <span className="text-muted-foreground font-normal">{form.body.length}/125</span>
            </Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value.slice(0, 125) })}
              maxLength={125}
              rows={2}
              placeholder="Order now and save 25% on your first order"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">CTA</Label>
              <Input
                value={form.cta}
                onChange={(e) => setForm({ ...form, cta: e.target.value })}
                placeholder="Order Now"
              />
            </div>
            <div>
              <Label className="text-xs">Destination URL</Label>
              <Input
                value={form.destination_url}
                onChange={(e) => setForm({ ...form, destination_url: e.target.value })}
                placeholder="https://hizivo.com/store/..."
                className={!isValidUrl(form.destination_url) ? "border-red-500" : ""}
              />
              {!isValidUrl(form.destination_url) && (
                <p className="text-[10px] text-red-500 mt-0.5">Invalid URL</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Budget & Schedule */}
      {step === 3 && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Campaign name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Summer promo"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Daily budget ($)</Label>
              <Input
                type="number"
                min={1}
                value={form.daily_budget}
                onChange={(e) => setForm({ ...form, daily_budget: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-xs">Total budget ($)</Label>
              <Input
                type="number"
                min={0}
                value={form.total_budget}
                onChange={(e) => setForm({ ...form, total_budget: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start</Label>
              <Input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[11px] text-muted-foreground">Estimated reach</p>
            <p className="text-sm font-semibold text-primary">
              ~{fmt(reachLow)}–{fmt(reachHigh)} people / day
            </p>
          </div>
          {walletBlocks && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
              <div className="text-[11px] flex-1">
                <p className="font-semibold text-amber-700 dark:text-amber-400">Wallet balance too low</p>
                <p className="text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                  Balance is ${(walletBalanceCents / 100).toFixed(2)}. Add at least ${(form.daily_budget).toFixed(2)} to submit.
                </p>
              </div>
              {onAddFunds && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] shrink-0"
                  onClick={() => { onClose(); onAddFunds(); }}
                >
                  Add funds
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </ResponsiveModal>
  );
}
