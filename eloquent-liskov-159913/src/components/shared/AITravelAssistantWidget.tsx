import { useState } from "react";
import { 
  Bot, 
  Send, 
  Sparkles,
  Lightbulb,
  MapPin,
  Calendar,
  DollarSign,
  Plane
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AITravelAssistantWidgetProps {
  className?: string;
  destination?: string;
  departureCity?: string;
}

interface Suggestion {
  id: string;
  icon: typeof Lightbulb;
  text: string;
  category: "tip" | "deal" | "info";
}

const AITravelAssistantWidget = ({ 
  className,
  destination = "Paris",
  departureCity = "New York"
}: AITravelAssistantWidgetProps) => {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { 
      role: "assistant", 
      text: `Hi! I'm your AI travel assistant. I can help you plan your trip to ${destination}. Ask me anything about flights, hotels, local tips, or the best time to visit!` 
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const quickSuggestions: Suggestion[] = [
    { id: "1", icon: Calendar, text: `Best time to visit ${destination}?`, category: "info" },
    { id: "2", icon: DollarSign, text: "Find cheapest flights", category: "deal" },
    { id: "3", icon: MapPin, text: "Must-see attractions", category: "tip" },
    { id: "4", icon: Plane, text: "Direct flight options", category: "info" },
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        "best time": `The best time to visit ${destination} is during spring (April-June) or fall (September-November). You'll enjoy mild weather, fewer crowds, and lower prices compared to peak summer.`,
        "cheapest": `Based on historical data, flights from ${departureCity} to ${destination} are typically 20-30% cheaper when booked 6-8 weeks in advance. Tuesday and Wednesday departures tend to be the most affordable.`,
        "attractions": `Top attractions in ${destination}: 1) Eiffel Tower 2) Louvre Museum 3) Notre-Dame Cathedral 4) Montmartre 5) Champs-Élysées. Book museum tickets online to skip the lines!`,
        "direct": `There are 12 daily direct flights from ${departureCity} to ${destination}. Major carriers include Air France, Delta, and United. Flight time is approximately 7h 30m.`
      };

      const lowerText = text.toLowerCase();
      let response = `Great question! Based on your interest in ${destination}, I recommend checking our price calendar for the best deals. Would you like me to set up a price alert for this route?`;
      
      for (const [key, value] of Object.entries(responses)) {
        if (lowerText.includes(key)) {
          response = value;
          break;
        }
      }

      setMessages(prev => [...prev, { role: "assistant", text: response }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-4 h-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
          </div>
          <h3 className="font-semibold text-sm">AI Travel Assistant</h3>
        </div>
        <Badge className="bg-gradient-to-r from-primary/20 text-primary border-0">
          <Sparkles className="w-3 h-3 mr-1" />
          Powered by AI
        </Badge>
      </div>

      {/* Chat Messages */}
      <div className="h-48 overflow-y-auto space-y-3 mb-4 pr-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-2",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3 h-3 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] p-3 rounded-xl text-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 border border-border/30"
              )}
            >
              {message.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-3 h-3 text-primary" />
            </div>
            <div className="bg-muted/50 border border-border/30 p-3 rounded-xl">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Suggestions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickSuggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button type="button"
              key={suggestion.id}
              onClick={() => handleSend(suggestion.text)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/30 border border-border/30 text-xs hover:bg-muted/50 transition-all duration-200"
            >
              <Icon className="w-3 h-3 text-primary" />
              {suggestion.text}
            </button>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
          placeholder="Ask anything about your trip..."
          className="flex-1 px-3 py-2 rounded-xl bg-muted/30 border border-border/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Button size="icon" aria-label="Send message" onClick={() => handleSend(input)} disabled={!input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AITravelAssistantWidget;
