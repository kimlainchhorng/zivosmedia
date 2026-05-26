import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Lock, 
  CreditCard, 
  RefreshCw,
  Award,
  CheckCircle,
  Headphones,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightTrustIndicatorsProps {
  className?: string;
}

export default function FlightTrustIndicators({ className }: FlightTrustIndicatorsProps) {
  const trustItems = [
    {
      icon: Shield,
      title: "Secure Booking",
      description: "256-bit SSL encryption protects your data",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      icon: Award,
      title: "Best Price Guarantee",
      description: "Find it cheaper, we'll refund the difference",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: RefreshCw,
      title: "Free Cancellation",
      description: "Cancel up to 24h before departure",
      color: "text-sky-500",
      bgColor: "bg-sky-500/10",
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Expert travel assistance anytime",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  const paymentMethods = [
    { name: "Visa", icon: "V" },
    { name: "Mastercard", icon: "M" },
    { name: "Amex", icon: "A" },
    { name: "PayPal", icon: "P" },
    { name: "Apple Pay", icon: "AP" },
    { name: "Google Pay", icon: "G" },
  ];

  const certifications = [
    { name: "IATA Accredited", badge: "IATA" },
    { name: "PCI DSS Compliant", badge: "PCI" },
    { name: "ATOL Protected", badge: "ATOL" },
  ];

  return (
    <section className={cn("py-12 border-t border-border/50 bg-card/30", className)}>
      <div className="container mx-auto px-4">
        {/* Trust Features Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-10">
          {trustItems.map((item, index) => (
            <div
              key={item.title}
              className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                item.bgColor
              )}>
                <item.icon className={cn("w-6 h-6", item.color)} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Payment & Certifications */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-border/50">
          {/* Payment Methods */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Secure Payments</span>
            </div>
            <div className="flex items-center gap-2">
              {paymentMethods.map((method) => (
                <div
                  key={method.name}
                  className="w-10 h-7 rounded bg-card border border-border/50 flex items-center justify-center text-xs"
                  title={method.name}
                >
                  {method.icon}
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div className="flex items-center gap-3">
            {certifications.map((cert) => (
              <Badge
                key={cert.name}
                variant="outline"
                className="text-xs font-semibold gap-1"
                title={cert.name}
              >
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                {cert.badge}
              </Badge>
            ))}
          </div>

          {/* Global Coverage */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="w-4 h-4" />
            <span>Serving 190+ countries</span>
          </div>
        </div>
      </div>
    </section>
  );
}
