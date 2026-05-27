/**
 * UsernamePage — Claim or change your @username
 * Workflows:
 *  1. Claim username (new user)
 *  2. Change username (existing) — with confirmation dialog (old handle freed)
 *  3. Real-time availability check with debounce
 *  4. Username suggestions based on display name
 *  5. Copy / Share profile link
 *  6. View public profile shortcut
 *  7. Success state after save
 *  8. Smart back navigation via `from` param
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  AtSign,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Share2,
  Hash,
  Info,
  RefreshCw,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { useUsername, validateUsername } from "@/hooks/useUsername";
import { useUserProfile } from "@/hooks/useUserProfile";

type CheckState = "idle" | "checking" | "available" | "taken" | "mine" | "invalid";

/** Derive username suggestions from a display name */
function buildSuggestions(fullName: string | null | undefined, existing: string | null): string[] {
  if (!fullName) return [];
  const base = fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .join("_");
  if (base.length < 4) return [];
  const candidates = [
    base,
    `${base}_`,
    `${base}zivo`,
    base.replace(/_/g, ""),
  ];
  return candidates.filter((s) => validateUsername(s) === null && s !== existing).slice(0, 3);
}

export default function UsernamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username: currentUsername, loading, claim, checkAvailability } = useUsername();
  const { data: profile } = useUserProfile();

  const [input, setInput] = useState("");
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [checkError, setCheckError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill with current username
  useEffect(() => {
    if (currentUsername && !input) setInput(currentUsername);
  }, [currentUsername]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = useMemo(
    () => buildSuggestions(profile?.full_name, currentUsername),
    [profile?.full_name, currentUsername],
  );

  // Active display username (after save shows updated value)
  const displayUsername = savedUsername ?? currentUsername;

  const handleInputChange = (val: string) => {
    const cleaned = val.replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "");
    setInput(cleaned);
    setCheckError(null);

    if (!cleaned) {
      setCheckState("idle");
      return;
    }

    const err = validateUsername(cleaned);
    if (err) {
      setCheckState("invalid");
      setCheckError(err);
      return;
    }

    setCheckState("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await checkAvailability(cleaned);
      if (result.mine) {
        setCheckState("mine");
        setCheckError(null);
      } else if (result.available) {
        setCheckState("available");
        setCheckError(null);
      } else {
        setCheckState("taken");
        setCheckError(result.error ?? "Not available");
      }
    }, 480);
  };

  const doSave = async () => {
    if (!input || saving) return;
    setSaving(true);
    const result = await claim(input);
    setSaving(false);
    if (result.ok) {
      setSavedUsername(input);
      setCheckState("mine");
      toast.success(`@${input} is now your username!`);
    } else {
      toast.error(result.error ?? "Failed to save username");
    }
  };

  const handleSavePress = () => {
    if (!input || saving) return;
    // If changing an existing username, require confirmation
    if (currentUsername && input !== currentUsername) {
      setShowConfirm(true);
    } else {
      void doSave();
    }
  };

  const handleCopy = (handle?: string | null) => {
    const h = handle ?? displayUsername ?? input;
    if (!h) return;
    navigator.clipboard.writeText(`https://zivo.me/${h}`).then(() => {
      toast.success("Profile link copied!");
    });
  };

  const handleShare = async () => {
    const h = displayUsername ?? input;
    if (!h) return;
    const url = `https://zivo.me/${h}`;
    if (navigator.share) {
      await navigator.share({ title: `@${h} on ZIVO`, url });
    } else {
      void handleCopy(h);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams(location.search);
    const from = params.get("from");
    if (from) navigate(`/${from}`);
    else navigate(-1);
  };

  const isSaveEnabled =
    !saving &&
    input.length >= 4 &&
    (checkState === "available" || checkState === "mine") &&
    input !== currentUsername;

  const stateIcon = () => {
    if (checkState === "checking") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (checkState === "available") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (checkState === "mine") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (checkState === "taken" || checkState === "invalid") return <XCircle className="h-4 w-4 text-destructive" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="Username · ZIVO" description="Claim or change your @username on ZIVO" />

      {/* Confirmation dialog — change username (releases old handle) */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Change username?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>
                  You're changing from{" "}
                  <span className="font-semibold text-foreground">@{currentUsername}</span>{" "}
                  to{" "}
                  <span className="font-semibold text-foreground">@{input}</span>.
                </p>
                <p>
                  Your old username <span className="font-semibold text-foreground">@{currentUsername}</span>{" "}
                  will be released and can be claimed by anyone else immediately.
                </p>
                <p>All existing links to your old profile URL will stop working.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep @{currentUsername}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => void doSave()}
            >
              Yes, switch to @{input}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <header
        className="zivo-pt-safe-sticky sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40 flex items-center gap-2 px-3 pb-2 pt-safe"
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted/60 active:scale-90 transition-transform text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-[17px] flex-1">Username</h1>
        {displayUsername && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleCopy()}
              aria-label="Copy profile link"
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted/60 active:scale-90 transition-transform text-foreground"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share profile"
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted/60 active:scale-90 transition-transform text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-6">

        {/* Success banner — shown immediately after save */}
        <AnimatePresence>
          {savedUsername && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] text-emerald-700 dark:text-emerald-400">
                  @{savedUsername} is yours!
                </p>
                <p className="text-[12px] text-muted-foreground">Your profile link is ready to share.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current username banner (pre-save) */}
        {!loading && displayUsername && !savedUsername && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3"
          >
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <AtSign className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Your username</p>
              <p className="font-bold text-[17px] text-primary truncate">@{displayUsername}</p>
            </div>
          </motion.div>
        )}

        {/* View public profile shortcut */}
        {displayUsername && (
          <motion.button
            type="button"
            onClick={() => navigate(`/u/${displayUsername}`)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 px-4 py-3 text-left hover:bg-muted/50 transition-colors active:scale-[0.98]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Your profile link</p>
              <p className="text-[14px] font-semibold text-foreground truncate">
                zivo.me/<span className="text-primary">{displayUsername}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                aria-label="Copy"
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          </motion.button>
        )}

        {/* Input section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="username-input" className="text-[13px] font-semibold text-foreground">
              {displayUsername ? "Change username" : "Claim your username"}
            </label>
            {input.length > 0 && (
              <span className={cn(
                "text-[11px] font-medium tabular-nums",
                input.length > 28 ? "text-amber-500" : "text-muted-foreground"
              )}>
                {input.length}/32
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-[15px] select-none pointer-events-none">
              @
            </span>
            <Input
              id="username-input"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="yourname"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={32}
              className="pl-8 pr-10 h-12 text-[15px] font-medium rounded-xl border-border/60 focus:border-primary"
              disabled={loading}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {stateIcon()}
            </span>
          </div>

          {/* Availability message */}
          <AnimatePresence mode="wait">
            {checkState !== "idle" && checkState !== "checking" && (
              <motion.p
                key={checkState + input}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "text-[12px] font-medium px-1",
                  checkState === "available" && "text-emerald-600 dark:text-emerald-400",
                  checkState === "mine" && "text-primary",
                  (checkState === "taken" || checkState === "invalid") && "text-destructive",
                )}
              >
                {checkState === "available" && `✓ @${input} is available!`}
                {checkState === "mine" && `@${input} is already yours`}
                {(checkState === "taken" || checkState === "invalid") && checkError}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Suggestions (only when no username yet or taken) */}
          {(checkState === "taken" || (!displayUsername && checkState === "idle")) && suggestions.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1">
              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 px-1">
                <Sparkles className="h-3 w-3" /> Suggestions
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleInputChange(s)}
                    className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[12.5px] font-medium text-foreground hover:bg-primary/10 hover:border-primary/40 transition-colors"
                  >
                    @{s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save / Claim button */}
        <Button
          onClick={handleSavePress}
          disabled={!isSaveEnabled}
          className="h-12 rounded-xl font-semibold text-[15px]"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
          ) : displayUsername ? (
            <><RefreshCw className="h-4 w-4 mr-2" />Update to @{input || "…"}</>
          ) : (
            <><Hash className="h-4 w-4 mr-2" />Claim @{input || "username"}</>
          )}
        </Button>

        {/* Warning note when changing */}
        {displayUsername && input && input !== displayUsername && (checkState === "available" || checkState === "mine") && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3.5 py-3"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Changing to <span className="font-semibold">@{input}</span> will permanently release{" "}
              <span className="font-semibold">@{displayUsername}</span>. Anyone can claim it after.
            </p>
          </motion.div>
        )}

        {/* Rules card */}
        <div className="rounded-2xl border border-border/40 bg-muted/20 px-4 py-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            Username rules
          </div>
          {[
            "4–32 characters",
            "Letters, numbers and underscores only (a-z, 0-9, _)",
            "No spaces or special characters",
            "You can change it at any time",
            "Your old username is released and claimable by others",
          ].map((rule) => (
            <div key={rule} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
              <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
              {rule}
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
