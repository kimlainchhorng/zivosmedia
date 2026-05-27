import { useEffect, useState } from "react";
import { CheckCircle, MapPin, Plane, Hotel, Car, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const bookingActivities = [
  { user: "Sarah M.", action: "booked a flight", destination: "Paris", type: "flight", time: "Just now" },
  { user: "James L.", action: "reserved", destination: "Grand Hyatt NYC", type: "hotel", time: "30s ago" },
  { user: "Emily C.", action: "rented a", destination: "BMW 3 Series", type: "car", time: "1 min ago" },
  { user: "Michael R.", action: "saved $450 on", destination: "Tokyo flights", type: "flight", time: "2 min ago" },
  { user: "Anna K.", action: "left a 5-star review for", destination: "Marriott Dubai", type: "hotel", time: "3 min ago" },
  { user: "David W.", action: "booked a flight", destination: "London", type: "flight", time: "4 min ago" },
  { user: "Lisa T.", action: "reserved", destination: "Tesla Model 3", type: "car", time: "5 min ago" },
  { user: "Chris P.", action: "found a deal on", destination: "Bali resorts", type: "hotel", time: "6 min ago" },
];

const SocialProofTicker = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let fadeTimeout: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setIsVisible(false);
      fadeTimeout = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % bookingActivities.length);
        setIsVisible(true);
      }, 300);
    }, 4000);

    return () => { clearInterval(interval); clearTimeout(fadeTimeout); };
  }, []);

  const activity = bookingActivities[currentIndex];

  const getIcon = (type: string) => {
    switch (type) {
      case "flight": return Plane;
      case "hotel": return Hotel;
      case "car": return Car;
      default: return CheckCircle;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "flight": return "from-primary to-teal-400";
      case "hotel": return "from-amber-500 to-orange-400";
      case "car": return "from-violet-500 to-purple-400";
      default: return "from-green-500 to-emerald-400";
    }
  };

  const Icon = getIcon(activity.type);

  return (
    <div className="fixed bottom-24 left-4 z-40 max-w-xs hidden md:block">
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-2xl bg-card/90 border border-border/50 backdrop-blur-xl shadow-lg",
          "transition-all duration-200",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
      >
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getColor(activity.type)} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            <span className="text-primary">{activity.user}</span> {activity.action}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{activity.destination}</span>
            <span>•</span>
            <span>{activity.time}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialProofTicker;
