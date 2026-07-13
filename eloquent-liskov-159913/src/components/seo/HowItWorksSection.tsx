import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  ArrowRight,
  MousePointer,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    step: 1,
    title: "Search",
    description: "Enter your travel details and search across 500+ airlines and travel sites.",
    icon: Search,
    color: "from-sky-500 to-blue-600",
  },
  {
    step: 2,
    title: "Compare",
    description: "Review prices, times, and options. Filter by stops, airlines, and more.",
    icon: MousePointer,
    color: "from-purple-500 to-violet-600",
  },
  {
    step: 3,
    title: "Book",
    description: "Click to book directly with the airline or travel site of your choice.",
    icon: ExternalLink,
    color: "from-emerald-500 to-teal-600",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4 px-4 py-2 bg-secondary text-foreground border-border">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Simple Process
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            How ZIVO Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Finding cheap flights is easy. Just search, compare, and book.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4 max-w-4xl mx-auto">
          {steps.map((item, index) => (
            <div key={item.step} className="flex items-center gap-4">
              <div className="relative">
                {/* Step Card */}
                <div className="w-64 p-6 rounded-2xl bg-card border border-border/50 text-center">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl bg-gradient-to-br mx-auto mb-4 flex items-center justify-center shadow-lg",
                    item.color
                  )}>
                    <item.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>

              {/* Arrow (not on last item) */}
              {index < steps.length - 1 && (
                <ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Clarification */}
        <p className="text-center text-sm text-muted-foreground mt-8 max-w-xl mx-auto">
          ZIVO is a search and comparison platform. We don't sell tickets directly — 
          we help you find the best prices and redirect you to trusted booking partners.
        </p>
      </div>
    </section>
  );
}
