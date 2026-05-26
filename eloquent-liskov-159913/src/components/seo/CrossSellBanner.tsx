import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hotel, Car, Ticket, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const crossSellItems = [
  {
    title: "Add a Hotel",
    description: "Save on accommodation",
    icon: Hotel,
    href: "/hotels",
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-500",
  },
  {
    title: "Rent a Car",
    description: "Explore on your terms",
    icon: Car,
    href: "/rent-car",
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-500",
  },
  {
    title: "Travel Extras",
    description: "Tours, eSIM, transfers & more",
    icon: Ticket,
    href: "/extras",
    color: "from-purple-500 to-violet-600",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-500",
  },
];

export default function CrossSellBanner() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="font-bold text-xl mb-6 text-center">Complete Your Trip</h2>
        
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {crossSellItems.map((item) => (
            <Link key={item.href} to={item.href} className="group">
              <Card className="h-full border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-200 group-hover:-translate-y-1">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
                    item.color
                  )}>
                    <item.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    Explore
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Affiliate Note */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          ZIVO may earn a commission when users book through partner links.
        </p>
      </div>
    </section>
  );
}
