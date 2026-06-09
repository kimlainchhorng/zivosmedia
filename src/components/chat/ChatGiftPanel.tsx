/**
 * ChatGiftPanel - Telegram-style premium gift modal for 1:1 chat.
 * Shows premium gift plans first, then expands into the existing Z-Coin gift
 * catalog so the workflow remains send-ready.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Check from "lucide-react/dist/esm/icons/check";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Coins from "lucide-react/dist/esm/icons/coins";
import CreditCard from "lucide-react/dist/esm/icons/credit-card";
import Crown from "lucide-react/dist/esm/icons/crown";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Plus from "lucide-react/dist/esm/icons/plus";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Star from "lucide-react/dist/esm/icons/star";
import X from "lucide-react/dist/esm/icons/x";
import Zap from "lucide-react/dist/esm/icons/zap";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { giftCatalog, getLevelColor, type GiftItem } from "@/config/giftCatalog";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { useChatGifts } from "@/hooks/useChatGifts";
import { useGiftAnimationQueue } from "@/hooks/useGiftAnimationQueue";

const GiftAnimationOverlay = lazy(() => import("@/components/live/GiftAnimationOverlay"));

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenWallet?: () => void;
  recipientId: string;
  recipientName?: string;
  recipientAvatar?: string | null;
}

const PREMIUM_PLANS = [
  { id: "three-months", label: "3 months", price: "$11.99", coins: 1000, checkoutPlan: "monthly", badge: null },
  { id: "six-months", label: "6 months", price: "$15.99", coins: 1500, checkoutPlan: "chat", badge: "-33%" },
  { id: "one-year", label: "1 year", price: "$28.99", coins: 2500, checkoutPlan: "annual", badge: "-40%" },
] as const;

type PremiumPlan = (typeof PREMIUM_PLANS)[number];
type PremiumPaymentMethod = "card" | "coins";

const TABS = [
  { id: "popular", label: "Popular", icon: Sparkles, items: giftCatalog.gifts.slice(0, 24) },
  { id: "animated", label: "Animated", icon: Zap, items: giftCatalog.interactive },
  { id: "exclusive", label: "Exclusive", icon: Crown, items: giftCatalog.exclusive },
] as const;

const COMBO_STEPS = [1, 2, 5, 10];

const initialsFor = (name?: string) =>
  (name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export default function ChatGiftPanel({ open, onClose, onOpenWallet, recipientId, recipientName = "this chat", recipientAvatar }: Props) {
  const { balance, refresh: refreshCoinBalance } = useCoinBalance();
  const { sendGift, sending } = useChatGifts();
  const { activeGift, comboCount, enqueue, onComplete } = useGiftAnimationQueue();
  const navigate = useNavigate();

  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("popular");
  const [selected, setSelected] = useState<GiftItem | null>(null);
  const [combo, setCombo] = useState(1);
  const [note, setNote] = useState("");
  const [showAllGifts, setShowAllGifts] = useState(false);
  const [selectedPremiumPlanId, setSelectedPremiumPlanId] = useState<PremiumPlan["id"]>("six-months");
  const [selectedPremiumMethod, setSelectedPremiumMethod] = useState<PremiumPaymentMethod>("card");
  const [premiumLoading, setPremiumLoading] = useState<string | null>(null);
  const [premiumCoinLoading, setPremiumCoinLoading] = useState<string | null>(null);
  const [pendingPremiumGift, setPendingPremiumGift] = useState<{
    plan: PremiumPlan;
    method: PremiumPaymentMethod;
  } | null>(null);
  const holdTimer = useRef<number | null>(null);

  const items = useMemo(() => TABS.find((item) => item.id === tab)?.items ?? [], [tab]);
  const selectedPremiumPlan =
    PREMIUM_PLANS.find((plan) => plan.id === selectedPremiumPlanId) ?? PREMIUM_PLANS[1];
  const totalCost = (selected?.coins ?? 0) * combo;
  const insufficient = totalCost > balance;
  const selectedPremiumCoinInsufficient =
    selectedPremiumMethod === "coins" && selectedPremiumPlan.coins > balance;
  const pendingCoinInsufficient =
    pendingPremiumGift?.method === "coins" ? pendingPremiumGift.plan.coins > balance : false;

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setCombo(1);
      setNote("");
      setShowAllGifts(false);
      setSelectedPremiumPlanId("six-months");
      setSelectedPremiumMethod("card");
      setPremiumLoading(null);
      setPremiumCoinLoading(null);
      setPendingPremiumGift(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const startHold = () => {
    if (!selected) return;
    let index = 0;
    holdTimer.current = window.setInterval(() => {
      index = (index + 1) % COMBO_STEPS.length;
      setCombo(COMBO_STEPS[index]);
    }, 600);
  };

  const endHold = () => {
    if (holdTimer.current) {
      window.clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const handleSend = async () => {
    if (!selected || sending || insufficient) return;
    try {
      enqueue?.({ name: selected.name, coins: selected.coins });
    } catch {
      // Local animation is best effort.
    }
    const result = await sendGift(recipientId, selected, { combo, note: note.trim() || undefined });
    if (result.ok) {
      setCombo(1);
      setNote("");
      onClose();
    }
  };

  const handlePremiumCheckout = async (plan: PremiumPlan) => {
    if (premiumLoading || premiumCoinLoading) return;
    setPremiumLoading(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-zivo-plus-checkout", {
        body: {
          plan: plan.checkoutPlan,
          gift_recipient_id: recipientId,
          gift_recipient_name: recipientName,
          gift_duration: plan.id,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");

      const { isAllowedCheckoutUrl } = await import("@/lib/urlSafety");
      if (!isAllowedCheckoutUrl(data.url)) throw new Error("Invalid checkout URL");

      const { openExternalUrl } = await import("@/lib/openExternalUrl");
      await openExternalUrl(data.url);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Could not start premium gift checkout");
    } finally {
      setPremiumLoading(null);
    }
  };

  const handlePremiumCoinGift = async (plan: PremiumPlan) => {
    if (premiumLoading || premiumCoinLoading) return;
    setPremiumCoinLoading(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("chat-send-premium-gift", {
        body: {
          recipient_id: recipientId,
          recipient_name: recipientName,
          duration: plan.id,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`${plan.label} of ZIVO Premium sent`);
      await refreshCoinBalance();
      setPendingPremiumGift(null);
      onClose();
    } catch (err: any) {
      const message = err?.message || "Could not send premium gift";
      if (message.toLowerCase().includes("insufficient")) {
        toast.error("Not enough coins - top up first");
      } else {
        toast.error(message);
      }
    } finally {
      setPremiumCoinLoading(null);
    }
  };

  const openWallet = () => {
    if (onOpenWallet) {
      onOpenWallet();
      return;
    }
    navigate("/wallet");
  };

  if (typeof document === "undefined") return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="chat-gift-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1700] flex items-center justify-center bg-black/35 px-4 py-4 backdrop-blur-sm"
              onMouseDown={onClose}
              role="presentation"
            >
              <motion.div
                key="chat-gift-modal"
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                transition={{ type: "spring", damping: 28, stiffness: 360 }}
                onMouseDown={(event) => event.stopPropagation()}
                className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[420px] flex-col overflow-hidden rounded-[2rem] bg-background text-foreground shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label={`Gift Premium to ${recipientName}`}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                  aria-label="Close gift modal"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="overflow-y-auto px-3 pb-5 pt-8 text-center">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden">
                    {Array.from({ length: 28 }).map((_, index) => (
                      <span
                        key={index}
                        className="absolute h-1 w-1 rounded-full bg-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.85)]"
                        style={{
                          left: `${10 + ((index * 29) % 82)}%`,
                          top: `${16 + ((index * 17) % 70)}%`,
                          transform: `scale(${index % 4 === 0 ? 1.7 : index % 3 === 0 ? 1.25 : 1})`,
                        }}
                      />
                    ))}
                  </div>

                  <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400/20 via-amber-300/15 to-rose-400/15 blur-xl" />
                    <Avatar
                      className="relative h-24 w-24 border-4 border-background shadow-xl"
                      aria-label={`${recipientName} avatar`}
                    >
                      <AvatarImage src={recipientAvatar || undefined} alt={`${recipientName} avatar`} />
                      <AvatarFallback className="bg-gradient-to-br from-slate-900 to-slate-700 text-lg font-bold text-white">
                        {initialsFor(recipientName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <h2 className="relative text-2xl font-extrabold tracking-normal text-foreground">Gift Premium</h2>
                  <p className="relative mx-auto mt-2 max-w-[330px] text-[15px] leading-snug text-foreground/85">
                    Give {recipientName} access to exclusive features with ZIVO Premium.
                    <button
                      type="button"
                      onClick={() => navigate("/zivo-plus")}
                      className="ml-1 inline-flex items-center text-primary"
                    >
                      See Features <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </p>

                  <div className="relative mt-4 rounded-2xl border border-border/50 bg-muted/35 px-4 py-3 text-left">
                    <p className="text-[12px] font-extrabold uppercase tracking-normal text-muted-foreground">
                      What they get
                    </p>
                    <div className="mt-3 grid gap-2 text-[13px] font-medium text-foreground/85">
                      {["Premium features unlock instantly after payment", "Gift receipt appears in this chat", "Recipient gets a membership notification"].map((feature) => (
                        <div key={feature} className="flex items-start gap-2">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative mt-5">
                    <p className="mb-2 text-left text-[12px] font-extrabold uppercase tracking-normal text-muted-foreground">
                      Choose duration
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {PREMIUM_PLANS.map((plan) => {
                        const isSelectedPlan = selectedPremiumPlan.id === plan.id;
                        return (
                          <button
                            type="button"
                            key={plan.id}
                            onClick={() => setSelectedPremiumPlanId(plan.id)}
                            className={cn(
                              "relative min-h-[150px] overflow-hidden rounded-lg bg-muted/60 px-2 pb-3 pt-4 text-center transition active:scale-[0.98]",
                              isSelectedPlan ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:bg-muted/80",
                            )}
                            aria-label={`Select ${plan.label} premium gift plan`}
                          >
                            {plan.badge && (
                              <div className="absolute -right-8 top-0 w-24 rotate-45 bg-violet-500 py-1 text-[10px] font-extrabold text-white shadow-sm">
                                {plan.badge}
                              </div>
                            )}
                            <div className="flex h-full min-h-[118px] flex-col items-center justify-center gap-2">
                              <div>
                                <p className="text-[15px] font-extrabold leading-tight text-foreground">{plan.label}</p>
                                <p className="text-[13px] font-medium text-foreground/80">Premium</p>
                              </div>
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[12px] font-bold text-primary">
                                {plan.price}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-500">
                                <Star className="h-3.5 w-3.5 fill-current" />
                                {plan.coins.toLocaleString()}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="relative mt-4 rounded-2xl border border-border/50 bg-background/70 p-3 text-left shadow-sm">
                    <p className="text-[12px] font-extrabold uppercase tracking-normal text-muted-foreground">
                      Choose payment
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPremiumMethod("card")}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition active:scale-[0.98]",
                          selectedPremiumMethod === "card"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 bg-muted/40 text-foreground hover:bg-muted/60",
                        )}
                        aria-label={`Pay ${selectedPremiumPlan.price} by card`}
                      >
                        <span className="flex items-center gap-2 text-sm font-extrabold">
                          <CreditCard className="h-4 w-4" />
                          Card
                        </span>
                        <span className="mt-1 block text-xs font-semibold text-muted-foreground">{selectedPremiumPlan.price}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPremiumMethod("coins")}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition active:scale-[0.98]",
                          selectedPremiumMethod === "coins"
                            ? "border-amber-500 bg-amber-500/10 text-amber-600"
                            : "border-border/50 bg-muted/40 text-foreground hover:bg-muted/60",
                        )}
                        aria-label={`Pay ${selectedPremiumPlan.coins} coins`}
                      >
                        <span className="flex items-center gap-2 text-sm font-extrabold">
                          <Star className="h-4 w-4 fill-current" />
                          Coins
                        </span>
                        <span className={cn("mt-1 block text-xs font-semibold", selectedPremiumCoinInsufficient ? "text-destructive" : "text-muted-foreground")}>
                          {selectedPremiumPlan.coins.toLocaleString()} · balance {balance.toLocaleString()}
                        </span>
                      </button>
                    </div>
                    <div className="mt-3 rounded-xl bg-muted/40 px-3 py-2 text-xs leading-snug text-muted-foreground">
                      {selectedPremiumMethod === "card"
                        ? "Secure checkout opens next. After payment, the gift is delivered in this chat."
                        : "Coins are debited immediately and the recipient gets Premium right away."}
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        if (selectedPremiumCoinInsufficient) {
                          openWallet();
                          return;
                        }
                        setPendingPremiumGift({ plan: selectedPremiumPlan, method: selectedPremiumMethod });
                      }}
                      disabled={premiumLoading !== null || premiumCoinLoading !== null}
                      className={cn(
                        "mt-3 h-11 w-full rounded-full font-extrabold shadow-md",
                        selectedPremiumMethod === "card"
                          ? "bg-foreground text-background hover:bg-foreground/90"
                          : "bg-gradient-to-r from-amber-500 to-sky-500 text-white shadow-amber-500/20 hover:from-amber-600 hover:to-sky-600",
                      )}
                    >
                      {selectedPremiumCoinInsufficient
                        ? "Top up coins"
                        : selectedPremiumMethod === "card"
                        ? `Review ${selectedPremiumPlan.label} checkout`
                        : `Review ${selectedPremiumPlan.label} coin gift`}
                    </Button>
                  </div>

                  <AnimatePresence>
                    {pendingPremiumGift && (
                      <motion.div
                        key="premium-gift-confirm"
                        initial={{ opacity: 0, height: 0, y: -6 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -6 }}
                        className="relative -mx-3 mt-4 overflow-hidden border-y border-border/50 bg-muted/45 px-4 py-3 text-left"
                        data-testid="premium-gift-confirm"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                            {pendingPremiumGift.method === "card" ? <CreditCard className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-foreground">Confirm Premium Gift</p>
                            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                              {pendingPremiumGift.plan.label} for {recipientName}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                              {pendingPremiumGift.method === "card" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-primary shadow-sm">
                                  <CreditCard className="h-3.5 w-3.5" />
                                  {pendingPremiumGift.plan.price}
                                </span>
                              ) : (
                                <>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-amber-600 shadow-sm">
                                    <Star className="h-3.5 w-3.5 fill-current" />
                                    {pendingPremiumGift.plan.coins.toLocaleString()}
                                  </span>
                                  <span className={cn("inline-flex rounded-full px-2.5 py-1", pendingCoinInsufficient ? "bg-destructive/10 text-destructive" : "bg-background text-muted-foreground")}>
                                    Balance {balance.toLocaleString()}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                              {pendingPremiumGift.method === "card"
                                ? "You will review and pay in secure checkout, then return to this chat."
                                : "Coins are debited immediately and the gift is delivered in chat."}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPendingPremiumGift(null)}
                            disabled={premiumCoinLoading !== null || premiumLoading !== null}
                            className="h-9 flex-1 rounded-full"
                          >
                            Cancel
                          </Button>
                          {pendingPremiumGift.method === "card" ? (
                            <Button
                              type="button"
                              onClick={() => void handlePremiumCheckout(pendingPremiumGift.plan)}
                              disabled={premiumLoading !== null}
                              className="h-9 flex-1 rounded-full bg-foreground font-semibold text-background hover:bg-foreground/90"
                            >
                              {premiumLoading === pendingPremiumGift.plan.id ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening</>
                              ) : (
                                <>Continue</>
                              )}
                            </Button>
                          ) : pendingCoinInsufficient ? (
                            <Button
                              type="button"
                              onClick={openWallet}
                              className="h-9 flex-1 rounded-full bg-amber-500 font-semibold text-white hover:bg-amber-600"
                            >
                              Top up
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={() => void handlePremiumCoinGift(pendingPremiumGift.plan)}
                              disabled={premiumCoinLoading !== null}
                              className="h-9 flex-1 rounded-full bg-gradient-to-r from-amber-500 to-sky-500 font-semibold text-white shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-sky-600"
                            >
                              {premiumCoinLoading === pendingPremiumGift.plan.id ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending</>
                              ) : (
                                <>Send Gift</>
                              )}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative mt-5">
                    <h3 className="text-2xl font-extrabold tracking-normal text-foreground">Send a Gift</h3>
                    <p className="mx-auto mt-2 max-w-[340px] text-[15px] leading-snug text-foreground/85">
                      Give {recipientName} gifts that can be kept on the profile or converted to Z-Coins.
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={openWallet}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-[12px] font-bold text-amber-600"
                    >
                      <Coins className="h-3.5 w-3.5" />
                      {balance.toLocaleString()}
                    </button>
                    <button
                      type="button"
                      onClick={openWallet}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[12px] font-semibold text-muted-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Top up
                    </button>
                  </div>

                  {!showAllGifts ? (
                    <div className="mt-4 rounded-2xl border border-border/50 bg-background/70 p-3">
                      <p className="text-sm font-bold text-foreground">Pick a coin gift</p>
                      <p className="mx-auto mt-1 max-w-[300px] text-xs leading-snug text-muted-foreground">
                        Browse the catalog, add an optional note, then send or top up if your balance is short.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAllGifts(true)}
                        className="mt-3 rounded-full bg-muted px-4 py-2 text-[13px] font-semibold text-muted-foreground transition hover:bg-muted/80"
                      >
                        Browse gifts
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 text-left">
                      <div className="mb-3 flex gap-1 overflow-x-auto px-1">
                        {TABS.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                              tab === item.id ? "bg-ig-gradient text-white" : "bg-muted text-muted-foreground",
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {items.map((gift) => {
                          const isSelected = selected?.name === gift.name;
                          return (
                            <button
                              type="button"
                              key={gift.name}
                              onClick={() => {
                                setSelected(gift);
                                setCombo(1);
                              }}
                              className={cn(
                                "relative aspect-square rounded-xl bg-gradient-to-br p-1.5 text-center transition active:scale-95",
                                gift.bg,
                                isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                              )}
                            >
                              <span className="block text-3xl leading-none">{gift.icon || "Gift"}</span>
                              <span className="mt-1 block truncate text-[9px] font-bold text-white drop-shadow-sm">{gift.name}</span>
                              <span className={cn("mt-0.5 flex items-center justify-center gap-0.5 text-[9px] font-extrabold", getLevelColor(gift.level))}>
                                <Coins className="h-2.5 w-2.5" />
                                {gift.coins}
                              </span>
                              {gift.badge && (
                                <span className="absolute right-1 top-1 rounded-full bg-black/45 px-1 py-0.5 text-[7px] font-bold text-white">
                                  {gift.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {selected && (
                  <div className="border-t border-border/40 bg-background/95 px-4 pb-4 pt-3 backdrop-blur-md">
                    <Input
                      value={note}
                      onChange={(event) => setNote(event.target.value.slice(0, 100))}
                      placeholder="Add a note (optional)"
                      className="h-10 rounded-full text-sm"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1">
                        {COMBO_STEPS.map((count) => (
                          <button
                            type="button"
                            key={count}
                            onClick={() => setCombo(count)}
                            className={cn(
                              "h-9 w-10 rounded-full text-[11px] font-bold transition",
                              combo === count ? "bg-ig-gradient text-white" : "bg-muted text-muted-foreground",
                            )}
                          >
                            x{count}
                          </button>
                        ))}
                      </div>
                      <Button
                        onClick={insufficient ? openWallet : handleSend}
                        onMouseDown={startHold}
                        onMouseUp={endHold}
                        onMouseLeave={endHold}
                        onTouchStart={startHold}
                        onTouchEnd={endHold}
                        disabled={sending}
                        className={cn(
                          "h-10 flex-1 rounded-full font-semibold text-white shadow-md",
                          insufficient
                            ? "bg-amber-500 shadow-amber-500/20 hover:bg-amber-600"
                            : "bg-gradient-to-r from-amber-500 to-sky-500 shadow-amber-500/20 hover:from-amber-600 hover:to-sky-600",
                        )}
                      >
                        {sending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending</>
                        ) : insufficient ? (
                          <><Plus className="mr-1 h-4 w-4" /> Top up {(totalCost - balance).toLocaleString()}</>
                        ) : (
                          <>Send {combo > 1 && `x${combo} `}<Coins className="mx-1 h-4 w-4" />{totalCost.toLocaleString()}</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <Suspense fallback={null}>
        {activeGift && (
          <GiftAnimationOverlay
            activeGift={activeGift}
            comboCount={comboCount}
            onComplete={onComplete}
          />
        )}
      </Suspense>
    </>
  );
}
