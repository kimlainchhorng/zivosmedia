/**
 * Grocery Returns & Refund Policy — legally aligned
 */
import { ArrowLeft, RotateCcw, Camera, Clock, DollarSign, ShieldCheck, PackageX, AlertCircle, CheckCircle, Scale } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";

const REFUND_TABLE = [
  { issue: "Wrong item delivered", resolution: "Full refund or re-delivery", timeframe: "24 hours" },
  { issue: "Item damaged or spoiled", resolution: "Full refund or store credit", timeframe: "24 hours" },
  { issue: "Missing item from order", resolution: "Full refund for missing item", timeframe: "24 hours" },
  { issue: "Poor quality produce/meat", resolution: "Full refund or store credit", timeframe: "24 hours" },
  { issue: "Unwanted substitution", resolution: "Full refund for substituted item", timeframe: "48 hours" },
  { issue: "Entire order not delivered", resolution: "Full order refund", timeframe: "24 hours" },
  { issue: "Overcharged item", resolution: "Price difference refunded", timeframe: "48 hours" },
  { issue: "Expired product", resolution: "Full refund + investigation", timeframe: "24 hours" },
];

const STEPS = [
  { icon: AlertCircle, title: "Report the Issue", desc: "Go to your order history and tap 'Report a Problem' within 24 hours of delivery." },
  { icon: Camera, title: "Provide Evidence", desc: "Upload a clear photo showing the issue — damaged packaging, wrong item, spoilage, etc. Photo evidence is required for all claims." },
  { icon: Clock, title: "Review Period", desc: "Our team reviews your claim within 1–2 business days and may contact you for additional details." },
  { icon: CheckCircle, title: "Resolution", desc: "Approved refunds are processed to your original payment method within 3–5 business days." },
];

export default function GroceryReturns() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-2xl border-b border-border/20">
        <div className="flex items-center gap-3 px-4 py-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60"><ArrowLeft className="h-5 w-5" /></motion.button>
          <div>
            <h1 className="text-base font-bold">Returns & Refund Policy</h1>
            <p className="text-[10px] text-muted-foreground">ZIVO Grocery Delivery · Last updated March 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/[0.02] border border-primary/15 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-[15px] font-bold text-foreground">Freshness Guarantee</h2>
          </div>
          <p className="text-[13px] text-foreground/80 leading-relaxed">
            If you're not satisfied with the quality of your groceries, we'll work to make it right. Report any issues within 24 hours of delivery with photo evidence and we'll review your claim for a refund or credit.
          </p>
        </motion.div>

        {/* How to request refund */}
        <div className="space-y-2">
          <h3 className="text-[14px] font-bold text-foreground px-1">How to Request a Refund</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="p-4 rounded-2xl border border-border/20 bg-card space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">STEP {i + 1}</span>
                </div>
                <p className="text-[13px] font-bold text-foreground">{step.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Refund table */}
        <div className="space-y-2">
          <h3 className="text-[14px] font-bold text-foreground px-1">Refund Eligibility</h3>
          <div className="rounded-2xl border border-border/20 overflow-hidden">
            <div className="grid grid-cols-3 gap-0 bg-muted/20 px-4 py-2.5 border-b border-border/10">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Issue</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resolution</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Report Within</span>
            </div>
            {REFUND_TABLE.map((row, i) => (
              <motion.div
                key={row.issue}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className={`grid grid-cols-3 gap-0 px-4 py-3 ${i < REFUND_TABLE.length - 1 ? "border-b border-border/10" : ""}`}
              >
                <span className="text-[11px] font-semibold text-foreground/90">{row.issue}</span>
                <span className="text-[11px] text-muted-foreground">{row.resolution}</span>
                <span className="text-[11px] text-primary font-semibold">{row.timeframe}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Non-refundable */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border border-border/20 bg-card space-y-3">
          <div className="flex items-center gap-2">
            <PackageX className="h-4 w-4 text-destructive" />
            <h3 className="text-[13px] font-bold text-foreground">Non-Refundable Items</h3>
          </div>
          <ul className="text-[12px] text-muted-foreground space-y-1.5 ml-6 list-disc">
            <li>Items correctly delivered as ordered (change of mind)</li>
            <li>Items reported more than 48 hours after delivery</li>
            <li>Delivery, service, and platform fees (except for undelivered orders)</li>
            <li>Driver tips</li>
            <li>Gift cards and prepaid cards</li>
            <li>Claims submitted without supporting photo evidence</li>
            <li>Age-restricted items where ID was verified at delivery</li>
          </ul>
        </motion.div>

        {/* Refund processing */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border border-border/20 bg-card space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="text-[13px] font-bold text-foreground">Refund Processing</h3>
          </div>
          <div className="text-[12px] text-muted-foreground space-y-2 leading-relaxed">
            <p>• Refunds are processed to your original payment method</p>
            <p>• Credit/debit card refunds: 3–5 business days</p>
            <p>• ZIVO credits: Applied immediately to your account</p>
            <p>• Partial refunds available for partially affected orders</p>
            <p>• Repeated or excessive claims may require additional review and documentation</p>
          </div>
        </motion.div>

        {/* Abuse policy */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border border-border/20 bg-card space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[13px] font-bold text-foreground">Fraud & Abuse Prevention</h3>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            ZIVO monitors refund activity to maintain a fair marketplace. Accounts with unusually high or suspicious refund patterns may be subject to additional verification, reduced refund eligibility, or account suspension. All decisions are made at ZIVO's sole discretion and may be appealed by contacting support.
          </p>
        </motion.div>

        <div className="text-center pt-4 space-y-2">
          <p className="text-[11px] text-muted-foreground">Need help? Contact <span className="text-primary font-semibold">support@hizivo.com</span></p>
          <p className="text-[9px] text-muted-foreground/50">
            See also: <Link to="/grocery/terms" className="text-primary/60 underline">Terms of Service</Link> · <Link to="/grocery/fees" className="text-primary/60 underline">Pricing & Fees</Link>
          </p>
        </div>
      </div>
      <ZivoMobileNav />
    </div>
  );
}
