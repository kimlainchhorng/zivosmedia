/**
 * Grocery Terms of Service — legally aligned policy page
 */
import { ArrowLeft, FileText, ShieldCheck, Truck, Clock, AlertTriangle, Scale, Ban, Gavel, Globe } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { DELIVERY_MIN_FEE, DELIVERY_MAX_FEE, SERVICE_FEE_PCT, SERVICE_FEE_MIN, SERVICE_FEE_MAX, MARKUP_THRESHOLD, formatFee } from "@/config/groceryPricing";

const sections = [
  {
    icon: FileText,
    title: "Agreement to Terms",
    content: `By placing an order through the ZIVO Grocery marketplace, you agree to these Terms of Service. ZIVO connects you with a personal shopper (driver) who will visit the selected store, purchase the items you've requested, and deliver them to your specified address. ZIVO is not a retailer and does not sell or manufacture any products. ZIVO acts solely as a technology platform facilitating the transaction between you and independent contractors.`,
  },
  {
    icon: Truck,
    title: "How It Works",
    content: `When you place a grocery order, a ZIVO driver is assigned to fulfill it. The driver visits the store, shops for your items based on your order, and delivers them to your door. Prices shown are estimates based on store listings at the time of search and may differ slightly from in-store prices. Your final charge reflects the actual prices at checkout plus applicable fees.`,
  },
  {
    icon: Scale,
    title: "Pricing & Fees",
    content: `• Delivery Fee: Distance-based pricing from ${formatFee(DELIVERY_MIN_FEE)} to ${formatFee(DELIVERY_MAX_FEE)}, based on distance and estimated time
• Service Fee: ${SERVICE_FEE_PCT}% of order subtotal (min ${formatFee(SERVICE_FEE_MIN)}, max ${formatFee(SERVICE_FEE_MAX)})
• Platform Fee: 5% on orders under $${MARKUP_THRESHOLD}, 3% on orders $${MARKUP_THRESHOLD}+
• Driver Tip: Optional, 100% goes to your driver — ZIVO never takes a cut
• Item Prices: Based on real-time store data; final price may vary slightly from estimates
• All fees are itemized and shown before you confirm your order
• Promotional codes may reduce fees; terms apply per promotion

For full pricing details, see our Pricing & Fees page.`,
  },
  {
    icon: ShieldCheck,
    title: "Quality Guarantee",
    content: `We stand behind the quality of your delivery. If items arrive damaged, spoiled, or are incorrect, you may request a refund or credit for those items within 24 hours of delivery. Photo evidence is required for all quality claims. Our team reviews each request and typically resolves issues within 1–2 business days. ZIVO reserves the right to deny claims that appear fraudulent or excessive.`,
  },
  {
    icon: Clock,
    title: "Delivery Times & Availability",
    content: `Delivery times are estimates based on driver availability, store hours, and order complexity. While we aim for timely delivery, times may vary during peak hours, holidays, or severe weather. ZIVO is not responsible for delays caused by store inventory changes, traffic, or circumstances beyond our control. Delivery is currently available in select U.S. markets.`,
  },
  {
    icon: AlertTriangle,
    title: "Substitutions & Out-of-Stock Items",
    content: `If an item is out of stock, your driver or our system will follow your substitution preference:
• Contact Me: Driver contacts you for approval before substituting
• Best Match: Driver selects a similar item at a comparable price
• Refund: You receive a refund for the unavailable item

You can set your default substitution preference during checkout. Substituted items at a higher price require your approval unless you selected "Best Match."`,
  },
  {
    icon: Ban,
    title: "Order Cancellation",
    content: `You may cancel an order free of charge before a driver is assigned. Once a driver is assigned, cancellation fees apply as a percentage of the order subtotal (excluding fees and tip):
• Before driver assigned: No fee
• Driver assigned but not started: 15%
• Driver actively shopping: 25%
• Items purchased and en-route: 50%

Cancellation fees compensate drivers for their time and effort. ZIVO reserves the right to waive fees at its sole discretion.`,
  },
  {
    icon: FileText,
    title: "Account & Eligibility",
    content: `You must be 18 years or older to use the ZIVO Grocery service. You are responsible for maintaining the security of your account credentials and all activity under your account. Orders containing age-restricted items (alcohol, tobacco where permitted) require valid government-issued ID verification upon delivery. ZIVO reserves the right to refuse or cancel orders that violate these terms or applicable law.`,
  },
  {
    icon: Scale,
    title: "Limitation of Liability",
    content: `ZIVO acts as a marketplace platform connecting customers with independent drivers. We are not responsible for the quality, safety, or legality of products purchased from retail stores. To the maximum extent permitted by law, ZIVO's aggregate liability for any claims arising from or related to the service shall not exceed the total fees (delivery + service + platform fees) you paid for the specific order giving rise to the claim. Product liability rests with the original manufacturer and retailer.`,
  },
  {
    icon: Gavel,
    title: "Dispute Resolution",
    content: `Any dispute arising from these Terms or the ZIVO Grocery service shall first be addressed through our customer support at support@hizivo.com. If unresolved within 30 days, disputes shall be resolved through binding arbitration administered under the rules of the American Arbitration Association (AAA), except that either party may seek injunctive relief in a court of competent jurisdiction. You agree to waive any right to participate in a class action lawsuit or class-wide arbitration.`,
  },
  {
    icon: Globe,
    title: "Governing Law",
    content: `These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of law principles. ZIVO's failure to enforce any provision shall not constitute a waiver of that provision.`,
  },
  {
    icon: FileText,
    title: "Changes to Terms",
    content: `ZIVO may update these Terms of Service at any time. Continued use of the grocery delivery service after changes constitutes acceptance of the updated terms. Material changes will be communicated via email or in-app notification at least 7 days before taking effect. Last updated: March 2026.`,
  },
];

export default function GroceryTerms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-2xl border-b border-border/20">
        <div className="flex items-center gap-3 px-4 py-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60"><ArrowLeft className="h-5 w-5" /></motion.button>
          <div>
            <h1 className="text-base font-bold">Grocery Terms of Service</h1>
            <p className="text-[10px] text-muted-foreground">Last updated March 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-primary/5 border border-primary/15">
          <p className="text-[13px] text-foreground/80 leading-relaxed">
            These terms govern your use of the ZIVO Grocery delivery marketplace. By using this service, you agree to the following terms and conditions. Please also review our{" "}
            <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> and{" "}
            <Link to="/grocery/fees" className="text-primary underline">Pricing & Fees</Link>.
          </p>
        </motion.div>

        {sections.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-border/20 bg-card overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/10 bg-muted/10">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-[14px] font-bold text-foreground">{s.title}</h2>
            </div>
            <div className="px-4 py-3">
              <p className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-line">{s.content}</p>
            </div>
          </motion.div>
        ))}

        <div className="text-center pt-4 space-y-2">
          <p className="text-[11px] text-muted-foreground">Questions? Contact <span className="text-primary font-semibold">support@hizivo.com</span></p>
          <p className="text-[9px] text-muted-foreground/50">
            See also: <Link to="/terms" className="text-primary/60 underline">General Terms</Link> · <Link to="/privacy" className="text-primary/60 underline">Privacy Policy</Link> · <Link to="/grocery/fees" className="text-primary/60 underline">Pricing & Fees</Link> · <Link to="/grocery/returns" className="text-primary/60 underline">Returns Policy</Link>
          </p>
        </div>
      </div>
      <ZivoMobileNav />
    </div>
  );
}
