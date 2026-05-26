import { useNavigate } from "react-router-dom";
import Car from "lucide-react/dist/esm/icons/car";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import Zap from "lucide-react/dist/esm/icons/zap";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Package from "lucide-react/dist/esm/icons/package";
import { QuickAction } from "@/components/ui/premium-card";
import { QuickRepeatOrders, RecentlyViewed } from "@/components/ui/personalization";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const quickActions = [
  { id: "ride", icon: Car, label: "Book a Ride", description: "Go anywhere", href: "/rides/hub", color: "rides" as const },
  { id: "eats", icon: UtensilsCrossed, label: "Order Food", description: "Delivered fast", href: "/eats", color: "eats" as const },
  { id: "flight", icon: Plane, label: "Book Flight", description: "500+ destinations", href: "/flights", color: "sky" as const },
  { id: "hotel", icon: Hotel, label: "Find Hotel", description: "Best rates guaranteed", href: "/hotels", color: "amber" as const },
  { id: "car", icon: Car, label: "Rent a Car", description: "Pickup anywhere", href: "/rent-car", color: "rides" as const },
  { id: "extras", icon: Package, label: "Delivery", description: "Send packages", href: "/delivery", color: "eats" as const },
];

const defaultRecentItems = [
  { id: "1", title: "Pizza Palace", subtitle: "Italian", type: "restaurant" as const },
  { id: "2", title: "Grand Plaza", subtitle: "New York", type: "hotel" as const },
  { id: "3", title: "Home → Work", subtitle: "Daily commute", type: "ride" as const },
];

const defaultRepeatOrders = [
  { id: "1", title: "Burger Joint", items: ["Double Stack", "Fries", "Coke"], price: "$24.99", lastOrdered: "2 days ago" },
  { id: "2", title: "Sakura Sushi", items: ["Dragon Roll", "Miso Soup"], price: "$32.50", lastOrdered: "Last week" },
];

const QuickActionsSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch real recent activity for logged-in users
  const { data: recentActivity } = useQuery({
    queryKey: ["home-recent-activity", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const [trips, foodOrders, hotels] = await Promise.all([
        supabase.from("trips").select("id, pickup_address, created_at").eq("rider_id", user.id).order("created_at", { ascending: false }).limit(2),
        supabase.from("food_orders").select("id, restaurants(name), created_at").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(2),
        supabase.from("hotel_bookings").select("id, hotels(name, city), created_at").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(1),
      ]);

      const items: any[] = [];
      trips.data?.forEach(t => items.push({ id: t.id, title: t.pickup_address?.slice(0, 20) || "Ride", subtitle: "Recent trip", type: "ride" as const }));
      foodOrders.data?.forEach((o: any) => items.push({ id: o.id, title: o.restaurants?.name || "Order", subtitle: "Food order", type: "restaurant" as const }));
      hotels.data?.forEach((h: any) => items.push({ id: h.id, title: h.hotels?.name || "Hotel", subtitle: h.hotels?.city || "Stay", type: "hotel" as const }));
      
      return items.slice(0, 3);
    },
    enabled: !!user?.id,
  });

  // Fetch repeat food orders
  const { data: repeatFoodOrders } = useQuery({
    queryKey: ["home-repeat-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data } = await supabase
        .from("food_orders")
        .select("id, total_amount, items, restaurants(name), created_at")
        .eq("customer_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(2);
      
      return data?.map((order: any) => {
        const items = Array.isArray(order.items) ? order.items.slice(0, 3).map((i: any) => i.name || "Item") : [];
        const daysAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: order.id,
          title: order.restaurants?.name || "Restaurant",
          items,
          price: `$${order.total_amount?.toFixed(2) || "0.00"}`,
          
          lastOrdered: daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`
        };
      }) || [];
    },
    enabled: !!user?.id,
  });

  const recentItems = recentActivity?.length ? recentActivity : defaultRecentItems;
  const repeatOrders = repeatFoodOrders?.length ? repeatFoodOrders : defaultRepeatOrders;
  
  return (
    <section className="py-10 sm:py-14 lg:py-24 relative" aria-label="Quick actions">
      <div className="container mx-auto px-4 relative z-10">
        <div className="space-y-8 sm:space-y-12">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative p-2.5 sm:p-3.5 rounded-full bg-foreground">
                <Zap className="w-5 h-5 sm:w-7 sm:h-7 text-background" />
              </div>
              <div>
                <h2 className="font-display text-xl sm:text-2xl lg:text-4xl font-bold">Quick Actions</h2>
                <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">One tap to get started</p>
              </div>
            </div>
          </div>

          {/* Quick Action Grid - improved mobile layout */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {quickActions.map((action, index) => (
              <div
                key={action.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-200"
                style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
              >
                <QuickAction
                  icon={<action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />}
                  label={action.label}
                  description={action.description}
                  onClick={() => navigate(action.href)}
                  color={action.color}
                  badge={(action as any).badge}
                />
              </div>
            ))}
          </div>

          {/* Recent + Repeat Orders - improved mobile stacking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <div className="animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: '200ms' }}>
              <RecentlyViewed 
                items={recentItems} 
                onItemClick={() => {}}
              />
            </div>
            <div className="animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '200ms' }}>
              <QuickRepeatOrders 
                orders={repeatOrders}
                onReorder={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuickActionsSection;
