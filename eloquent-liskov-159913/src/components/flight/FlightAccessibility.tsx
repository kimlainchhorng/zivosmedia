import { Accessibility, Check, Headphones, Plane, Users, Eye, Ear, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const accessibilityFeatures = [
  { icon: Users, title: "Mobility Assistance", description: "Complimentary wheelchair service at all airports" },
  { icon: Eye, title: "Visual Assistance", description: "Audio descriptions and screen reader support" },
  { icon: Ear, title: "Hearing Support", description: "Visual alerts and sign language support available" },
  { icon: Heart, title: "Medical Support", description: "Special medical equipment accommodations" },
];

const FlightAccessibility = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-secondary text-foreground border-border">
            <Accessibility className="w-3 h-3 mr-1" /> Accessibility
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Travel Made Accessible
          </h2>
          <p className="text-muted-foreground">
            We're committed to making travel accessible for everyone
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {accessibilityFeatures.map((feature) => (
            <div
              key={feature.title}
              className="p-5 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl"
            >
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="p-6 bg-secondary border border-border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
              <Headphones className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <p className="font-bold">Need Special Assistance?</p>
              <p className="text-sm text-muted-foreground">Our dedicated team is available 24/7 to help</p>
            </div>
          </div>
          <Button className="bg-secondary">
            Request Assistance
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FlightAccessibility;
