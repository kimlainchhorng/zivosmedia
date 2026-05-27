import { Headphones, MessageSquare, Phone, Mail, Clock, ArrowRight, Bot, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const supportOptions = [
  { icon: MessageSquare, title: "Live Chat", description: "Instant support 24/7", wait: "< 1 min", color: "text-green-400", bgColor: "bg-green-500/10" },
  { icon: Phone, title: "Call Us", description: "+1 (888) ZIVO-FLY", wait: "< 3 min", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  { icon: Mail, title: "Email Support", description: "support@zivo.com", wait: "< 2 hrs", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  { icon: Bot, title: "AI Assistant", description: "Get instant answers", wait: "Instant", color: "text-amber-400", bgColor: "bg-amber-500/10" },
];

const FlightCustomerSupport = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-secondary text-foreground border-border">
            <Headphones className="w-3 h-3 mr-1" /> 24/7 Support
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            We're Here to Help
          </h2>
          <p className="text-muted-foreground">
            Get assistance anytime, anywhere
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {supportOptions.map((option) => (
            <div
              key={option.title}
              className="p-5 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl hover:border-border transition-all group cursor-pointer"
            >
              <div className={`w-14 h-14 ${option.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <option.icon className={`w-7 h-7 ${option.color}`} />
              </div>
              <h3 className="font-bold text-lg mb-1">{option.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
              <div className="flex items-center gap-1 text-xs text-green-400">
                <Clock className="w-3 h-3" />
                <span>Wait: {option.wait}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 border border-border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 bg-secondary">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <p className="font-bold">Need help booking?</p>
              <p className="text-sm text-muted-foreground">Our travel experts can help you find the perfect flight</p>
            </div>
          </div>
          <Button className="bg-secondary">
            Talk to Expert <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FlightCustomerSupport;
