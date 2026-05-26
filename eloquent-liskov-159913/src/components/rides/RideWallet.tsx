/**
 * RideWallet — Enhanced payment management with split fare, top-up, transaction history
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Plus, Tag, Gift, Wallet, Percent, Trash2, Zap, ArrowUpRight, ArrowDownLeft, Users, Send, Copy, CheckCircle, TrendingUp, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { useLocalPaymentMethods } from "@/hooks/useLocalPaymentMethods";
import { useCustomerWallet } from "@/hooks/useCustomerWallet";
import AddCardForm from "@/components/wallet/AddCardForm";

export default function RideWallet() {
  const [activeTab, setActiveTab] = useState<"methods" | "promos" | "wallet" | "split">("methods");

  const tabs = [
    { id: "methods" as const, label: "Cards", icon: CreditCard },
    { id: "wallet" as const, label: "Wallet", icon: Wallet },
    { id: "promos" as const, label: "Promos", icon: Tag },
    { id: "split" as const, label: "Split", icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all", activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {activeTab === "methods" && <PaymentMethodsTab />}
          {activeTab === "wallet" && <WalletTab />}
          {activeTab === "promos" && <PromosTab />}
          {activeTab === "split" && <SplitFareTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PaymentMethodsTab() {
  const { methods, deleteCard, setDefault } = useLocalPaymentMethods();
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-3">
      {methods.length === 0 && !showAddForm && (
        <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
          <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground">No payment methods</p>
          <p className="text-xs text-muted-foreground mt-1">Add a card to pay for rides</p>
        </div>
      )}

      {methods.map(pm => (
        <motion.div
          key={pm.id}
          layout
          className={cn("flex items-center gap-3 p-3.5 rounded-2xl border transition-all", pm.isDefault ? "border-primary/30 bg-primary/5 shadow-sm" : "border-border/40 bg-card")}
        >
          <button type="button" onClick={() => { setDefault(pm.id); toast.success(`${pm.brand} set as default`); }} className="flex items-center gap-3 flex-1 text-left touch-manipulation">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", pm.isDefault ? "bg-primary/10" : "bg-muted/50")}>
              <CreditCard className={cn("w-5 h-5", pm.isDefault ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{pm.brand}</p>
              <p className="text-[10px] text-muted-foreground">•••• {pm.last4} · Exp {String(pm.expMonth).padStart(2, "0")}/{String(pm.expYear).slice(-2)}</p>
            </div>
          </button>
          {pm.isDefault && <Badge className="bg-primary/10 text-primary border-0 text-[9px] font-bold">Default</Badge>}
          <button type="button" onClick={() => { deleteCard(pm.id); toast.success("Card removed"); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors" aria-label="Remove card">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      ))}

      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <AddCardForm onClose={() => setShowAddForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {!showAddForm && (
        <Button variant="outline" className="w-full h-12 rounded-2xl text-sm font-bold gap-2 border-dashed border-border/60" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4" /> Add Payment Method
        </Button>
      )}
    </div>
  );
}

function WalletTab() {
  const { balanceDollars, transactions } = useCustomerWallet();
  const walletBalance = balanceDollars || 0;
  const [topUpAmount, setTopUpAmount] = useState("");
  const [showTopUp, setShowTopUp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const topUpPresets = [10, 25, 50, 100];
  const visibleTransactions = showHistory ? transactions : transactions.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-emerald-500/10 border border-primary/20 p-5 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-bl from-emerald-500/15 to-transparent rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ZIVO Wallet</span>
          </div>
          <p className="text-3xl font-black text-foreground">${walletBalance.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Available credit balance</p>
          <div className="flex gap-2 mt-4">
            <Button size="sm" className="h-9 rounded-xl text-xs font-bold gap-1.5" onClick={() => setShowTopUp(!showTopUp)}>
              <Plus className="w-3.5 h-3.5" /> Top Up
            </Button>
            <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? "Hide" : "History"}
            </Button>
          </div>
        </div>
      </div>

      {/* Top-up section */}
      <AnimatePresence>
        {showTopUp && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl border border-primary/20 bg-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Banknote className="w-4 h-4 text-primary" /> Add Funds
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {topUpPresets.map(amt => (
                  <button type="button" key={amt} onClick={() => setTopUpAmount(String(amt))} className={cn("py-2.5 rounded-xl text-sm font-bold border transition-all", topUpAmount === String(amt) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-foreground border-border/40 hover:border-primary/30")}>
                    ${amt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Custom amount" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value.replace(/[^\d.]/g, ""))} className="h-11 rounded-xl text-sm font-mono" inputMode="decimal" />
                <Button className="h-11 px-5 rounded-xl font-bold" disabled={!topUpAmount || parseFloat(topUpAmount) <= 0} onClick={() => toast.info("Wallet top-up checkout is not available from this screen yet.")}>
                  Continue
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-apply */}
      <div className="rounded-2xl bg-card border border-border/40 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Auto-apply credits</p>
          <p className="text-[10px] text-muted-foreground">Automatically use wallet balance on rides</p>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[9px] font-bold">ON</Badge>
      </div>

      {/* Transaction history */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
          {showHistory ? "All Transactions" : "Recent"}
        </h3>
        {visibleTransactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/40 p-4 text-center">
            <p className="text-xs text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          visibleTransactions.map((tx, i) => {
            const isCredit = tx.amount_cents > 0;
            const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
            return (
              <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isCredit ? "bg-emerald-500/10" : "bg-red-500/10")}>
                  <Icon className={cn("w-4 h-4", isCredit ? "text-emerald-500" : "text-red-500")} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground">{tx.description || tx.type}</span>
                  <p className="text-[9px] text-muted-foreground">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "Recent"}</p>
                </div>
                <span className={cn("text-xs font-bold", isCredit ? "text-emerald-500" : "text-red-500")}>
                  {isCredit ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PromosTab() {
  const [promoInput, setPromoInput] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const appliedPromos: Array<{ code: string; discount: string; status: string; expires: string }> = [];

  const handleApplyPromo = () => {
    if (!promoInput.trim()) return;
    setApplyingPromo(true);
    setApplyingPromo(false);
    toast.info("Promo validation is not connected from this screen yet.");
    setPromoInput("");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" /> Apply Promo Code
        </h3>
        <div className="flex gap-2">
          <Input placeholder="Enter code" value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} className="h-11 rounded-xl text-sm font-bold uppercase" />
          <Button onClick={handleApplyPromo} disabled={!promoInput.trim() || applyingPromo} className="h-11 px-5 rounded-xl font-bold">
            {applyingPromo ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : "Apply"}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Your Promos</h3>
        {appliedPromos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/40 p-4 text-center">
            <p className="text-xs text-muted-foreground">No promos on this account yet</p>
          </div>
        ) : appliedPromos.map(p => (
          <div key={p.code} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", p.status === "active" ? "bg-emerald-500/10" : "bg-muted/50")}>
              <Percent className={cn("w-4 h-4", p.status === "active" ? "text-emerald-500" : "text-muted-foreground")} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">{p.code}</p>
              <p className="text-[10px] text-muted-foreground">{p.discount} · Exp {p.expires}</p>
            </div>
            <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[9px] font-bold capitalize">{p.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function SplitFareTab() {
  const [contacts, setContacts] = useState([
    { id: "1", name: "Alex M.", share: 50, status: "pending" },
  ]);
  const [newName, setNewName] = useState("");
  const [splitLink, setSplitLink] = useState("");

  const myShare = 100 - contacts.reduce((sum, c) => sum + c.share, 0);

  const addSplitter = () => {
    if (!newName.trim()) return;
    const evenShare = Math.floor(100 / (contacts.length + 2));
    const updated = contacts.map(c => ({ ...c, share: evenShare }));
    updated.push({ id: Date.now().toString(), name: newName.trim(), share: evenShare, status: "pending" });
    setContacts(updated);
    setNewName("");
    toast.success(`${newName.trim()} added to split`);
  };

  const generateLink = () => {
    const link = `${getPublicOrigin()}/split/${Date.now().toString(36)}`;
    setSplitLink(link);
    navigator.clipboard.writeText(link);
    toast.success("Split link copied!");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl to-primary/5 border border-border p-5 bg-secondary">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-foreground" />
          <h3 className="text-sm font-bold text-foreground">Split This Fare</h3>
        </div>

        {/* Share visualization */}
        <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-3">
          <motion.div className="bg-primary rounded-l-full" style={{ width: `${myShare}%` }} layout />
          {contacts.map((c, i) => (
            <motion.div key={c.id} className={cn("rounded-none", i === contacts.length - 1 ? "rounded-r-full" : "", ["bg-violet-500", "bg-emerald-500", "bg-amber-500"][i % 3])} style={{ width: `${c.share}%` }} layout />
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card/60">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">You</span>
            </div>
            <span className="flex-1 text-xs font-bold text-foreground">Your share</span>
            <span className="text-sm font-black text-primary">{myShare}%</span>
          </div>

          {contacts.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card/60">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", ["bg-violet-500/10", "bg-emerald-500/10", "bg-amber-500/10"][i % 3])}>
                <span className={cn("text-xs font-bold", ["text-violet-500", "text-emerald-500", "text-amber-500"][i % 3])}>{c.name[0]}</span>
              </div>
              <span className="flex-1 text-xs font-medium text-foreground">{c.name}</span>
              <Badge variant="outline" className={cn("text-[8px] font-bold", c.status === "accepted" ? "text-emerald-500 border-emerald-500/20" : "text-amber-500 border-amber-500/20")}>
                {c.status}
              </Badge>
              <span className="text-sm font-black text-foreground">{c.share}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add person */}
      <div className="flex gap-2">
        <Input placeholder="Add person's name" value={newName} onChange={e => setNewName(e.target.value)} className="h-11 rounded-xl text-sm" />
        <Button onClick={addSplitter} disabled={!newName.trim() || contacts.length >= 4} className="h-11 px-4 rounded-xl font-bold">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Share link */}
      <Button variant="outline" className="w-full h-12 rounded-2xl text-sm font-bold gap-2" onClick={generateLink}>
        <Send className="w-4 h-4" /> {splitLink ? "Link Copied!" : "Generate Split Link"}
      </Button>

      {splitLink && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/30">
          <span className="text-[10px] text-muted-foreground flex-1 font-mono truncate">{splitLink}</span>
          <button type="button" onClick={() => { navigator.clipboard.writeText(splitLink); toast.success("Copied!"); }}>
            <Copy className="w-3.5 h-3.5 text-primary" />
          </button>
        </div>
      )}
    </div>
  );
}
