/**
 * Gift Cards Page
 * Buy, send, and redeem ZIVO gift cards
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, Send, Ticket, Copy, Check, Loader2, ShieldCheck, CreditCard, Wallet, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGiftCards, type GiftCard } from "@/hooks/useGiftCards";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { useI18n } from "@/hooks/useI18n";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";

const PRESET_AMOUNTS = [
  { cents: 1000, label: "$10" },
  { cents: 2500, label: "$25" },
  { cents: 5000, label: "$50" },
  { cents: 10000, label: "$100" },
];

export default function GiftCardsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { myGiftCards, cardsLoading, purchaseGiftCard, redeemGiftCard } = useGiftCards();

  // Buy tab state
  const [selectedAmount, setSelectedAmount] = useState(2500);
  const [customMode, setCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");

  // My cards filter
  type CardFilter = "all" | "active" | "redeemed" | "expired";
  const [cardFilter, setCardFilter] = useState<CardFilter>("all");

  // Custom amount validation
  const MIN_AMOUNT_CENTS = 500;   // $5
  const MAX_AMOUNT_CENTS = 50000; // $500
  const customAmountCents = useMemo(() => {
    const n = parseFloat(customAmount);
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100);
    return 0;
  }, [customAmount]);
  const customAmountValid = customAmountCents >= MIN_AMOUNT_CENTS && customAmountCents <= MAX_AMOUNT_CENTS;
  const effectiveAmount = customMode ? customAmountCents : selectedAmount;
  const canPurchase = customMode ? customAmountValid : true;

  // Redeem tab state
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemResult, setRedeemResult] = useState<{
    credited: number;
    newBalance: number;
  } | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handlePurchase = async (requireRecipient: boolean) => {
    if (requireRecipient && !recipientEmail) {
      toast.error("Please enter the recipient's email");
      return;
    }
    if (customMode && !customAmountValid) {
      toast.error(`Amount must be between $${MIN_AMOUNT_CENTS / 100} and $${MAX_AMOUNT_CENTS / 100}`);
      return;
    }

    const origin = window.location.origin;
    const result = await purchaseGiftCard.mutateAsync({
      amount_cents: effectiveAmount,
      recipient_email: recipientEmail || undefined,
      recipient_name: recipientName || undefined,
      message: message || undefined,
      sender_name: user?.user_metadata?.full_name || undefined,
      success_url: `${origin}/account/gift-cards/success`,
      cancel_url: `${origin}/account/gift-cards`,
    });

    if (result.url) {
      import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(result.url));
    }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      toast.error("Please enter a gift card code");
      return;
    }

    const result = await redeemGiftCard.mutateAsync(redeemCode.trim());
    if (result.success) {
      setRedeemResult({
        credited: result.credited_amount_dollars,
        newBalance: result.new_wallet_balance_dollars,
      });
      setRedeemCode("");
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Code copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCardStatus = (card: GiftCard): { label: string; color: string } => {
    if (card.current_balance <= 0) return { label: "Redeemed", color: "text-muted-foreground" };
    if (card.expires_at && new Date(card.expires_at) < new Date()) return { label: "Expired", color: "text-destructive" };
    if (card.is_active) return { label: "Active", color: "text-emerald-500" };
    return { label: "Pending", color: "text-amber-500" };
  };

  const AmountSelector = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {PRESET_AMOUNTS.map((amt) => (
          <button type="button"
            key={amt.cents}
            onClick={() => { setCustomMode(false); setSelectedAmount(amt.cents); }}
            className={`py-3 rounded-xl font-bold text-base transition-all ${
              !customMode && selectedAmount === amt.cents
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {amt.label}
          </button>
        ))}
        <button type="button"
          onClick={() => setCustomMode(true)}
          className={`py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1 ${
            customMode
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          Custom
        </button>
      </div>
      {customMode && (
        <div className="space-y-1.5">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">$</span>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              min={5}
              max={500}
              step={1}
              autoFocus
              className="h-12 pl-9 rounded-xl bg-muted border-border text-lg font-bold"
            />
          </div>
          <p className={`text-[11px] ${customAmount && !customAmountValid ? "text-rose-500" : "text-muted-foreground"}`}>
            {customAmount && !customAmountValid
              ? `Must be between $${MIN_AMOUNT_CENTS / 100} and $${MAX_AMOUNT_CENTS / 100}`
              : `Min $${MIN_AMOUNT_CENTS / 100} · Max $${MAX_AMOUNT_CENTS / 100}`}
          </p>
        </div>
      )}
    </div>
  );

  const RecipientFields = ({ required }: { required: boolean }) => (
    <div className="space-y-3">
      <Input
        placeholder="Recipient's name"
        value={recipientName}
        onChange={(e) => setRecipientName(e.target.value)}
        className="h-12 rounded-xl bg-muted border-border"
      />
      <Input
        placeholder={`Recipient's email${required ? " *" : " (optional)"}`}
        type="email"
        value={recipientEmail}
        onChange={(e) => setRecipientEmail(e.target.value)}
        className="h-12 rounded-xl bg-muted border-border"
      />
      <textarea
        placeholder="Add a personal message (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="w-full rounded-xl bg-muted border border-border p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <SEOHead title="Gift Cards — ZIVO" description="Buy, send, and redeem ZIVO gift cards" />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-6 py-4">
          <button type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">{t("gift.title")}</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/20 to-card border border-primary/30 rounded-3xl p-6 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-1">{t("gift.hero_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("gift.hero_desc")}</p>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="buy" className="space-y-4">
          <TabsList className="w-full bg-muted border border-border/50 rounded-xl h-12 p-1">
            <TabsTrigger value="buy" className="flex-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
              <CreditCard className="w-4 h-4" />
              {t("gift.buy")}
            </TabsTrigger>
            <TabsTrigger value="send" className="flex-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
              <Send className="w-4 h-4" />
              {t("gift.send")}
            </TabsTrigger>
            <TabsTrigger value="redeem" className="flex-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
              <Ticket className="w-4 h-4" />
              {t("gift.redeem")}
            </TabsTrigger>
          </TabsList>

          {/* Buy Tab */}
          <TabsContent value="buy" className="space-y-4">
            <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-5">
              <h3 className="font-bold">{t("gift.select_amount")}</h3>
              <AmountSelector />
              <RecipientFields required={false} />
              <Button
                onClick={() => handlePurchase(false)}
                disabled={purchaseGiftCard.isPending || !canPurchase}
                className="w-full h-12 rounded-xl font-bold"
              >
                {purchaseGiftCard.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-5 h-5 mr-2" />
                )}
                Purchase ${(effectiveAmount / 100).toFixed(effectiveAmount % 100 === 0 ? 0 : 2)} Gift Card
              </Button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4" />
                Secure payment powered by Stripe
              </div>
            </div>
          </TabsContent>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-4">
            <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-5">
              <h3 className="font-bold">Send a Gift Card</h3>
              <AmountSelector />
              <RecipientFields required={true} />

              {/* Preview */}
              {(recipientName || recipientEmail) && (
                <div className="bg-muted/50 border border-border/50 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-2">Preview</p>
                  <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
                    <Gift className="w-6 h-6 text-primary mb-2" />
                    <p className="font-bold">${(effectiveAmount / 100).toFixed(effectiveAmount % 100 === 0 ? 0 : 2)} ZIVO Gift Card</p>
                    {recipientName && <p className="text-sm text-muted-foreground">To: {recipientName}</p>}
                    {message && <p className="text-sm text-muted-foreground mt-2 italic">"{message}"</p>}
                  </div>
                </div>
              )}

              <Button
                onClick={() => handlePurchase(true)}
                disabled={purchaseGiftCard.isPending || !canPurchase}
                className="w-full h-12 rounded-xl font-bold"
              >
                {purchaseGiftCard.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Send className="w-5 h-5 mr-2" />
                )}
                Send ${(effectiveAmount / 100).toFixed(effectiveAmount % 100 === 0 ? 0 : 2)} Gift Card
              </Button>
            </div>
          </TabsContent>

          {/* Redeem Tab */}
          <TabsContent value="redeem" className="space-y-4">
            <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-5">
              <h3 className="font-bold">Redeem a Gift Card</h3>
              <Input
                placeholder="ZIVO-XXXX-XXXX"
                value={redeemCode}
                onChange={(e) => {
                  setRedeemCode(e.target.value.toUpperCase());
                  setRedeemResult(null);
                }}
                className="h-12 rounded-xl bg-muted border-border text-center font-mono text-lg tracking-wider"
                maxLength={14}
              />
              <Button
                onClick={handleRedeem}
                disabled={redeemGiftCard.isPending || !redeemCode.trim()}
                className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-primary-foreground"
              >
                {redeemGiftCard.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Ticket className="w-5 h-5 mr-2" />
                )}
                Redeem Gift Card
              </Button>

              {/* Success Result */}
              {redeemResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-lg font-bold text-emerald-500">
                    ${redeemResult.credited.toFixed(2)} Added!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    New wallet balance: ${redeemResult.newBalance.toFixed(2)}
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/account/wallet")}
                    className="mt-3 text-primary"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    View Wallet
                  </Button>
                </motion.div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* My Gift Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {(() => {
            // Categorize cards once
            const counts = { all: myGiftCards.length, active: 0, redeemed: 0, expired: 0 };
            const totalActiveBalance = myGiftCards.reduce((sum, c) => {
              const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
              const isRedeemed = c.current_balance <= 0;
              if (isExpired) counts.expired++;
              else if (isRedeemed) counts.redeemed++;
              else if (c.is_active) counts.active++;
              if (c.is_active && !isExpired && !isRedeemed) return sum + c.current_balance;
              return sum;
            }, 0);

            const visibleCards = myGiftCards.filter((c) => {
              const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
              const isRedeemed = c.current_balance <= 0;
              if (cardFilter === "all") return true;
              if (cardFilter === "expired") return isExpired;
              if (cardFilter === "redeemed") return isRedeemed && !isExpired;
              return c.is_active && !isExpired && !isRedeemed;
            });

            return (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-lg">My Gift Cards</h2>
                  {totalActiveBalance > 0 && (
                    <span className="text-xs text-muted-foreground">
                      <span className="font-bold text-emerald-500">${totalActiveBalance.toFixed(2)}</span> active
                    </span>
                  )}
                </div>

                {/* Status filter pills */}
                {myGiftCards.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 -mx-1 px-1">
                    {([
                      { key: "all", label: "All" },
                      { key: "active", label: "Active" },
                      { key: "redeemed", label: "Redeemed" },
                      { key: "expired", label: "Expired" },
                    ] as const).map((opt) => {
                      const c = counts[opt.key];
                      return (
                        <button type="button"
                          key={opt.key}
                          onClick={() => setCardFilter(opt.key)}
                          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            cardFilter === opt.key
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border/40 hover:border-primary/30"
                          }`}
                        >
                          {opt.label}
                          {c > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cardFilter === opt.key ? "bg-primary-foreground/20" : "bg-muted"}`}>
                              {c}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {cardsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : myGiftCards.length === 0 ? (
                  <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
                    <Gift className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No gift cards yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Buy or redeem a gift card to get started</p>
                  </div>
                ) : visibleCards.length === 0 ? (
                  <div className="bg-card border border-border/50 rounded-2xl p-6 text-center">
                    <p className="text-sm text-muted-foreground">No {cardFilter} gift cards</p>
                    <Button variant="link" size="sm" onClick={() => setCardFilter("all")} className="mt-1 text-xs">
                      Show all
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleCards.map((card) => {
                const status = getCardStatus(card);
                return (
                  <div
                    key={card.id}
                    className="bg-card border border-border/50 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-primary" />
                        <span className="font-mono text-sm">{card.code}</span>
                        <button type="button"
                          onClick={() => copyCode(card.code, card.id)}
                          className="p-1 rounded hover:bg-muted"
                        >
                          {copiedId === card.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        ${card.initial_balance.toFixed(2)} card
                        {card.recipient_email ? ` → ${card.recipient_email}` : ""}
                      </span>
                      <span className="font-bold">
                        ${card.current_balance.toFixed(2)} left
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {format(new Date(card.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                );
              })}
                  </div>
                )}
              </>
            );
          })()}
        </motion.div>
      </div>
    </div>
  );
}