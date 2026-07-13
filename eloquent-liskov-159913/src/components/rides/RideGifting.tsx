/**
 * RideGifting — Ride gifting, vouchers, corporate gift cards, event packages
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Send, Copy, CreditCard, Users, Calendar, PartyPopper, Heart, Star, CheckCircle, ChevronRight, Plus, Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab = "send" | "vouchers" | "events";

const giftAmounts = [10, 25, 50, 100];

const voucherDesigns = [
  { id: "birthday", label: "Birthday", emoji: "🎂", gradient: "from-muted to-muted", border: "border-pink-500/20" },
  { id: "thankyou", label: "Thank You", emoji: "🙏", gradient: "from-muted to-muted", border: "border-sky-500/20" },
  { id: "congrats", label: "Congrats", emoji: "🎉", gradient: "from-amber-500/10 to-orange-500/10", border: "border-amber-500/20" },
  { id: "holiday", label: "Holiday", emoji: "🎄", gradient: "from-emerald-500/10 to-red-500/10", border: "border-emerald-500/20" },
];

const eventPackages = [
  { id: "wedding", name: "Wedding Package", desc: "10 rides for guests, premium vehicles", price: "$250", rides: 10, icon: Heart, popular: true },
  { id: "corporate", name: "Corporate Event", desc: "20 rides for attendees, any vehicle", price: "$400", rides: 20, icon: CreditCard, popular: false },
  { id: "party", name: "Party Night", desc: "5 round-trip rides, late night included", price: "$150", rides: 5, icon: PartyPopper, popular: true },
  { id: "conference", name: "Conference Shuttle", desc: "15 rides between venues, scheduled", price: "$350", rides: 15, icon: Users, popular: false },
];

const sentGifts = [
  { id: "1", to: "Mom", amount: 50, design: "birthday", status: "redeemed", date: "Feb 14" },
  { id: "2", to: "Alex C.", amount: 25, design: "thankyou", status: "sent", date: "Mar 1" },
  { id: "3", to: "Team", amount: 100, design: "congrats", status: "partially", date: "Mar 5" },
];

export default function RideGifting() {
  const [activeTab, setActiveTab] = useState<Tab>("send");
  const [giftAmount, setGiftAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [selectedDesign, setSelectedDesign] = useState("birthday");
  const [sending, setSending] = useState(false);

  const tabs = [
    { id: "send" as const, label: "Send Gift", icon: Gift },
    { id: "vouchers" as const, label: "My Gifts", icon: Star },
    { id: "events" as const, label: "Events", icon: Calendar },
  ];

  const handleSendGift = () => {
    if (!recipientName.trim()) { toast.error("Enter recipient name"); return; }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success(`$${giftAmount} ride gift sent to ${recipientName}! 🎁`);
      setRecipientName("");
      setRecipientEmail("");
      setMessage("");
    }, 1500);
  };

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
          {activeTab === "send" && (
            <div className="space-y-4">
              {/* Gift preview */}
              <div className={cn("rounded-2xl border p-5 text-center relative overflow-hidden bg-gradient-to-br", voucherDesigns.find(d => d.id === selectedDesign)?.gradient, voucherDesigns.find(d => d.id === selectedDesign)?.border)}>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent rounded-full" />
                <span className="text-4xl">{voucherDesigns.find(d => d.id === selectedDesign)?.emoji}</span>
                <p className="text-3xl font-black text-foreground mt-2">${giftAmount}</p>
                <p className="text-xs text-muted-foreground">ZIVO Ride Gift</p>
                {recipientName && <p className="text-sm font-bold text-foreground mt-2">For {recipientName}</p>}
                {message && <p className="text-[11px] text-muted-foreground mt-1 italic">"{message}"</p>}
              </div>

              {/* Design selector */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {voucherDesigns.map(d => (
                  <button type="button" key={d.id} onClick={() => setSelectedDesign(d.id)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl border shrink-0 transition-all", selectedDesign === d.id ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card")}>
                    <span>{d.emoji}</span>
                    <span className="text-[10px] font-bold text-foreground">{d.label}</span>
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Amount</h3>
                <div className="grid grid-cols-4 gap-2">
                  {giftAmounts.map(amt => (
                    <button type="button" key={amt} onClick={() => { setGiftAmount(amt); setCustomAmount(""); }} className={cn("py-2.5 rounded-xl text-sm font-bold border transition-all", giftAmount === amt && !customAmount ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-foreground border-border/40")}>
                      ${amt}
                    </button>
                  ))}
                </div>
                <Input placeholder="Custom amount" value={customAmount} onChange={e => { const v = e.target.value.replace(/[^\d]/g, ""); setCustomAmount(v); if (v) setGiftAmount(parseInt(v) || 0); }} className="h-10 rounded-xl text-sm font-mono" inputMode="numeric" />
              </div>

              {/* Recipient */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Recipient</h3>
                <Input placeholder="Name" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="h-11 rounded-xl text-sm" />
                <Input placeholder="Email (optional)" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} className="h-11 rounded-xl text-sm" type="email" />
                <Input placeholder="Add a message (optional)" value={message} onChange={e => setMessage(e.target.value)} className="h-11 rounded-xl text-sm" />
              </div>

              <Button className="w-full h-12 rounded-2xl text-sm font-bold gap-2" disabled={sending || giftAmount <= 0} onClick={handleSendGift}>
                {sending ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <><Send className="w-4 h-4" /> Send ${giftAmount} Gift</>}
              </Button>
            </div>
          )}

          {activeTab === "vouchers" && (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground px-1">Gifts you've sent</p>
              {sentGifts.map((gift, i) => {
                const design = voucherDesigns.find(d => d.id === gift.design);
                return (
                  <motion.div key={gift.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl bg-card border border-border/40 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br", design?.gradient)}>
                        {design?.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">To: {gift.to}</span>
                          <span className="text-[10px] text-muted-foreground">{gift.date}</span>
                        </div>
                        <p className="text-sm font-black text-foreground">${gift.amount}</p>
                      </div>
                      <Badge className={cn("text-[8px] font-bold border-0 capitalize", gift.status === "redeemed" ? "bg-emerald-500/10 text-emerald-500" : gift.status === "sent" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500")}>
                        {gift.status}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}

              <div className="rounded-xl bg-muted/20 border border-border/30 p-4 text-center">
                <Gift className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">Total gifted: $175</p>
                <p className="text-[10px] text-muted-foreground">3 gifts sent · 1 redeemed</p>
              </div>
            </div>
          )}

          {activeTab === "events" && (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground px-1">Bulk ride packages for special events</p>
              {eventPackages.map((pkg, i) => {
                const Icon = pkg.icon;
                return (
                  <motion.div key={pkg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl bg-card border border-border/40 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{pkg.name}</span>
                          {pkg.popular && <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[8px] font-bold">Popular</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{pkg.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-foreground">{pkg.price}</span>
                        <span className="text-[10px] text-muted-foreground">{pkg.rides} rides included</span>
                      </div>
                      <Button size="sm" className="h-8 text-[10px] rounded-lg font-bold px-4" onClick={() => toast.success(`${pkg.name} added to cart!`)}>
                        Book
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
