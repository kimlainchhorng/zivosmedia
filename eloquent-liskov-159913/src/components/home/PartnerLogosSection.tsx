/**
 * PartnerLogosSection - Trust badges with token-based colors
 */
import Shield from "lucide-react/dist/esm/icons/shield";
import CreditCard from "lucide-react/dist/esm/icons/credit-card";
import Award from "lucide-react/dist/esm/icons/award";

const partners = [
  { name: "United Airlines", category: "Airlines" },
  { name: "Delta", category: "Airlines" },
  { name: "American Airlines", category: "Airlines" },
  { name: "Marriott", category: "Hotels" },
  { name: "Hilton", category: "Hotels" },
  { name: "Hyatt", category: "Hotels" },
  { name: "Hertz", category: "Car Rental" },
  { name: "Enterprise", category: "Car Rental" },
  { name: "Avis", category: "Car Rental" },
  { name: "Visa", category: "Payment" },
  { name: "Mastercard", category: "Payment" },
  { name: "PayPal", category: "Payment" },
];

const certifications = [
  { icon: Shield, label: "PCI DSS Certified", description: "Secure Payments" },
  { icon: Award, label: "ISO 27001", description: "Data Security" },
  { icon: CreditCard, label: "3D Secure", description: "Fraud Protection" },
];

const PartnerLogosSection = () => {
  return (
    <section className="py-12 md:py-16 border-y border-border/50 bg-gradient-to-b from-background to-muted/20" aria-label="Trusted partners and certifications">
      <div className="container mx-auto px-4">
        {/* Partner Logos */}
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-6">
            Trusted by leading travel brands worldwide
          </p>
          
          {/* Logo Marquee */}
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
            
            {/* First row */}
            <div className="flex gap-8 animate-marquee-left motion-reduce:animate-none mb-3">
              {[...partners, ...partners].map((partner, index) => (
                <div
                  key={`l-${index}`}
                  className="flex-shrink-0 px-6 py-3 rounded-xl bg-card/50 border border-border/30 text-muted-foreground font-medium text-sm whitespace-nowrap hover:text-foreground hover:border-primary/30 transition-all duration-200"
                >
                  {partner.name}
                </div>
              ))}
            </div>
            {/* Second row */}
            <div className="flex gap-8 animate-marquee-right motion-reduce:animate-none">
              {[...partners, ...partners].reverse().map((partner, index) => (
                <div
                  key={`r-${index}`}
                  className="flex-shrink-0 px-6 py-3 rounded-xl bg-card/50 border border-border/30 text-muted-foreground font-medium text-sm whitespace-nowrap hover:text-foreground hover:border-primary/30 transition-all duration-200"
                >
                  {partner.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Certification Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-10 border-t border-border/50">
          {certifications.map((cert, index) => {
            const Icon = cert.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card/50 border border-border/30 hover:border-primary/20 transition-colors duration-200"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
                >
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{cert.label}</div>
                  <div className="text-xs text-muted-foreground">{cert.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PartnerLogosSection;
