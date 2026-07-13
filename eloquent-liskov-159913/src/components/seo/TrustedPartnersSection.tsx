import { Badge } from "@/components/ui/badge";
import { Shield, Plane } from "lucide-react";

const partners = [
  { name: "Delta" },
  { name: "United" },
  { name: "American" },
  { name: "British Airways" },
  { name: "Lufthansa" },
  { name: "Emirates" },
  { name: "Air France" },
  { name: "Qatar Airways" },
  { name: "Singapore Airlines" },
  { name: "Cathay Pacific" },
  { name: "JetBlue" },
  { name: "Southwest" },
];

export default function TrustedPartnersSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <Badge className="mb-4 px-4 py-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <Shield className="w-4 h-4 mr-2" />
            Trusted Partners
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
            Book with Confidence
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We partner with the world's leading airlines and travel agencies 
            to bring you the best prices and secure booking.
          </p>
        </div>

        {/* Partner Logos Grid */}
        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md"
            >
              <Plane className="w-4 h-4 text-foreground" />
              <span className="font-medium text-sm">{partner.name}</span>
            </div>
          ))}
        </div>

        {/* Additional Trust Signals */}
        <div className="mt-10 text-center">
          <div className="inline-flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-foreground" />
              <span>500+ Airlines</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Secure Redirects</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
