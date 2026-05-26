import Header from "@/components/Header";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Scale, 
  DollarSign, 
  CheckCircle,
  Shield,
  Mail
} from "lucide-react";

const AffiliateDisclosure = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Affiliate Disclosure – ZIVO"
        description="ZIVO may earn a commission when users book through partner links. Learn about our affiliate relationships."
        canonical="https://hizivo.com/affiliate-disclosure"
      />
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              <Scale className="w-3 h-3 mr-1" />
              Transparency
            </Badge>
            <h1 className="font-display text-4xl font-bold mb-4">
              Affiliate Disclosure
            </h1>
            <p className="text-sm text-muted-foreground">
              Effective Date: February 1, 2026
            </p>
          </motion.div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* What ZIVO Is */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <p className="text-lg">
                  <strong>ZIVO</strong> is a travel search and comparison platform.
                </p>
                <p className="text-muted-foreground">
                  ZIVO does not sell travel products, issue tickets, or process payments.
                  All bookings and payments are completed on third-party partner websites.
                </p>
              </CardContent>
            </Card>

            {/* Affiliate Links */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Affiliate Links</h2>
                </div>
                <p className="text-muted-foreground">
                  Some links on ZIVO are affiliate links.
                  This means ZIVO may earn a commission when users book through partner links.
                </p>
              </CardContent>
            </Card>

            {/* What This Does NOT Do */}
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-bold">This commission does NOT:</h2>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span className="text-muted-foreground">Increase the price you pay</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span className="text-muted-foreground">Affect the travel options shown</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span className="text-muted-foreground">Influence booking decisions</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* How Commissions Help */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Supporting ZIVO</h2>
                </div>
                <p className="text-muted-foreground">
                  Affiliate commissions help us maintain and improve the ZIVO platform.
                </p>
                <p className="text-muted-foreground">
                  ZIVO only partners with trusted travel providers.
                  Each partner operates under its own terms and privacy policies.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Questions?</h3>
                    <p className="text-muted-foreground mb-3">
                      If you have any questions, please contact us:
                    </p>
                    <p className="text-sm">
                      Email: <a href="mailto:info@hizivo.com" className="text-primary hover:underline">info@hizivo.com</a>
                    </p>
                    <p className="text-sm">
                      Website: <button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl("https://hizivo.com"))} className="text-primary hover:underline">https://hizivo.com</button>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliateDisclosure;
