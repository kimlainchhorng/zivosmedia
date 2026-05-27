import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mail, Plane, Bell, CheckCircle, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FlightNewsletterSectionProps {
  className?: string;
}

export default function FlightNewsletterSection({ className }: FlightNewsletterSectionProps) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      toast({
        title: "Welcome to ZIVO Flights!",
        description: "You'll receive exclusive airfare deals and price alerts.",
      });
    }
  };

  const benefits = [
    { icon: TrendingDown, text: "Price drop alerts" },
    { icon: Bell, text: "Flash sale notifications" },
    { icon: Plane, text: "New route announcements" },
  ];

  return (
    <section className={cn("py-10 sm:py-16", className)}>
      <div className="container mx-auto px-4">
        <Card className="relative overflow-hidden border-0 via-card bg-secondary">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <CardContent className="p-6 sm:p-10 relative">
            <div className="max-w-2xl mx-auto text-center">
              <Badge className="mb-4 px-4 py-2 bg-secondary text-foreground border-border">
                <Mail className="w-4 h-4 mr-2" />
                Newsletter
              </Badge>
              
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Never Miss a
                <span className="ml-2 text-accent-foreground">
                  Cheap Flight
                </span>
              </h2>
              
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Join 1M+ travelers and get instant alerts when prices drop on your favorite routes.
              </p>

              {!isSubscribed ? (
                <>
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 h-12 bg-background/50 border-border/50"
                      required
                    />
                    <Button 
                      type="submit"
                      className="h-12 px-8 hover:opacity-90 touch-manipulation active:scale-[0.98] bg-secondary"
                    >
                      Subscribe
                    </Button>
                  </form>

                  <div className="flex flex-wrap justify-center gap-4">
                    {benefits.map((benefit) => (
                      <div key={benefit.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <benefit.icon className="w-4 h-4 text-foreground" />
                        <span>{benefit.text}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-lg font-semibold text-emerald-500">You're subscribed!</p>
                  <p className="text-sm text-muted-foreground">Check your inbox for the latest deals.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
