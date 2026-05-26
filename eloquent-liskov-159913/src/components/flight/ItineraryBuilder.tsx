import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Map,
  Plus,
  Trash2,
  GripVertical,
  Plane,
  Building2,
  Car,
  Utensils,
  Camera,
  Clock,
  Calendar,
  MapPin,
  Edit2,
  Check,
  Sparkles,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Navigation
} from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface ItineraryItem {
  id: string;
  type: 'flight' | 'hotel' | 'activity' | 'transport' | 'dining';
  title: string;
  description?: string;
  time?: string;
  location?: string;
  duration?: string;
  confirmed: boolean;
}

interface ItineraryDay {
  id: string;
  date: Date;
  location: string;
  items: ItineraryItem[];
}

interface ItineraryBuilderProps {
  tripName?: string;
  startDate?: Date;
  className?: string;
}

const createItem = (type: ItineraryItem['type']): ItineraryItem => ({
  id: Math.random().toString(36).substring(2, 9),
  type,
  title: '',
  confirmed: false
});

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'flight': return Plane;
    case 'hotel': return Building2;
    case 'transport': return Car;
    case 'dining': return Utensils;
    case 'activity': return Camera;
    default: return MapPin;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'flight': return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
    case 'hotel': return 'bg-violet-500/20 text-violet-400 border-violet-500/40';
    case 'transport': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'dining': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'activity': return 'bg-pink-500/20 text-pink-400 border-pink-500/40';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const ItineraryBuilder = ({
  tripName = "My Trip",
  startDate = addDays(new Date(), 7),
  className
}: ItineraryBuilderProps) => {
  const [days, setDays] = useState<ItineraryDay[]>([
    {
      id: '1',
      date: startDate,
      location: 'London, UK',
      items: [
        { id: 'a1', type: 'flight', title: 'Arrive at Heathrow', time: '09:00', confirmed: true },
        { id: 'a2', type: 'transport', title: 'Uber to hotel', time: '10:30', duration: '45 min', confirmed: true },
        { id: 'a3', type: 'hotel', title: 'Check-in: The Savoy', time: '12:00', confirmed: true },
        { id: 'a4', type: 'activity', title: 'Tower of London', time: '14:00', duration: '3 hours', confirmed: false },
      ]
    },
    {
      id: '2',
      date: addDays(startDate, 1),
      location: 'London, UK',
      items: [
        { id: 'b1', type: 'dining', title: 'Breakfast at hotel', time: '08:00', confirmed: true },
        { id: 'b2', type: 'activity', title: 'British Museum', time: '10:00', duration: '4 hours', confirmed: false },
        { id: 'b3', type: 'dining', title: 'Lunch at Borough Market', time: '14:00', confirmed: false },
      ]
    },
  ]);

  const [expandedDay, setExpandedDay] = useState<string | null>(days[0].id);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const addDay = () => {
    const lastDay = days[days.length - 1];
    const newDay: ItineraryDay = {
      id: Math.random().toString(36).substring(2, 9),
      date: addDays(lastDay.date, 1),
      location: lastDay.location,
      items: []
    };
    setDays([...days, newDay]);
  };

  const addItemToDay = (dayId: string, type: ItineraryItem['type']) => {
    setDays(days.map(day => 
      day.id === dayId 
        ? { ...day, items: [...day.items, createItem(type)] }
        : day
    ));
  };

  const updateItem = (dayId: string, itemId: string, updates: Partial<ItineraryItem>) => {
    setDays(days.map(day => 
      day.id === dayId 
        ? { 
            ...day, 
            items: day.items.map(item => 
              item.id === itemId ? { ...item, ...updates } : item
            )
          }
        : day
    ));
  };

  const removeItem = (dayId: string, itemId: string) => {
    setDays(days.map(day => 
      day.id === dayId 
        ? { ...day, items: day.items.filter(item => item.id !== itemId) }
        : day
    ));
  };

  const reorderItems = (dayId: string, newItems: ItineraryItem[]) => {
    setDays(days.map(day => 
      day.id === dayId ? { ...day, items: newItems } : day
    ));
  };

  const totalActivities = days.reduce((acc, day) => acc + day.items.length, 0);
  const confirmedCount = days.reduce((acc, day) => 
    acc + day.items.filter(item => item.confirmed).length, 0
  );

  return (
    <Card className={cn("overflow-hidden border-border/50 bg-card/50 backdrop-blur", className)}>
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center bg-secondary">
              <Map className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{tripName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {days.length} days • {totalActivities} activities • {confirmedCount} confirmed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              {format(startDate, 'MMM d')} - {format(addDays(startDate, days.length - 1), 'MMM d, yyyy')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {days.map((day, dayIndex) => (
          <motion.div
            key={day.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/50 overflow-hidden"
          >
            {/* Day Header */}
            <button type="button"
              onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all duration-200 touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                  <span className="text-xs font-medium text-primary">Day</span>
                  <span className="text-lg font-bold leading-none">{dayIndex + 1}</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold">{format(day.date, 'EEEE, MMMM d')}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {day.location}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="outline">
                  {day.items.length} item{day.items.length !== 1 ? 's' : ''}
                </Badge>
                {expandedDay === day.id ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Day Content */}
            <AnimatePresence>
              {expandedDay === day.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    {/* Timeline Items */}
                    <Reorder.Group
                      axis="y"
                      values={day.items}
                      onReorder={(newItems) => reorderItems(day.id, newItems)}
                      className="space-y-2"
                    >
                      {day.items.map((item) => {
                        const Icon = getTypeIcon(item.type);
                        const isEditing = editingItem === item.id;
                        
                        return (
                          <Reorder.Item
                            key={item.id}
                            value={item}
                            className="list-none"
                          >
                            <div className={cn(
                              "flex items-start gap-3 p-3 rounded-xl group transition-all duration-200",
                              isEditing ? "bg-primary/10 border border-primary/30" : "bg-muted/30 hover:bg-muted/50"
                            )}>
                              <div className="cursor-grab active:cursor-grabbing mt-1 opacity-50 group-hover:opacity-100">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                                getTypeColor(item.type)
                              )}>
                                <Icon className="w-4 h-4" />
                              </div>

                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <Input
                                      value={item.title}
                                      onChange={(e) => updateItem(day.id, item.id, { title: e.target.value })}
                                      placeholder="Activity name"
                                      className="h-8"
                                    />
                                    <div className="flex gap-2">
                                      <Input
                                        value={item.time || ''}
                                        onChange={(e) => updateItem(day.id, item.id, { time: e.target.value })}
                                        placeholder="Time"
                                        className="h-8 w-24"
                                      />
                                      <Input
                                        value={item.duration || ''}
                                        onChange={(e) => updateItem(day.id, item.id, { duration: e.target.value })}
                                        placeholder="Duration"
                                        className="h-8 w-24"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className={cn(
                                      "font-medium",
                                      !item.title && "text-muted-foreground italic"
                                    )}>
                                      {item.title || 'Untitled'}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                      {item.time && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {item.time}
                                        </span>
                                      )}
                                      {item.duration && (
                                        <span>{item.duration}</span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button type="button"
                                  onClick={() => updateItem(day.id, item.id, { confirmed: !item.confirmed })}
                                  className={cn(
                                    "p-1.5 rounded-xl transition-all duration-200 active:scale-[0.90] touch-manipulation",
                                    item.confirmed 
                                      ? "text-emerald-400 bg-emerald-500/20" 
                                      : "text-muted-foreground hover:bg-muted"
                                  )}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button type="button"
                                  onClick={() => setEditingItem(isEditing ? null : item.id)}
                                  className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted transition-all duration-200 active:scale-[0.90] touch-manipulation"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button type="button"
                                  onClick={() => removeItem(day.id, item.id)}
                                  className="p-1.5 rounded-xl text-red-400 hover:bg-red-500/20 transition-all duration-200 active:scale-[0.90] touch-manipulation opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </Reorder.Item>
                        );
                      })}
                    </Reorder.Group>

                    {/* Add Activity Buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      {[
                        { type: 'activity' as const, icon: Camera },
                        { type: 'dining' as const, icon: Utensils },
                        { type: 'transport' as const, icon: Car },
                        { type: 'flight' as const, icon: Plane },
                        { type: 'hotel' as const, icon: Building2 },
                      ].map(({ type, icon: Icon }) => (
                        <Button
                          key={type}
                          variant="ghost"
                          size="sm"
                          onClick={() => addItemToDay(day.id, type)}
                          className="gap-1 text-xs"
                        >
                          <Plus className="w-3 h-3" />
                          <Icon className="w-3 h-3" />
                        </Button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* Add Day Button */}
        <Button
          variant="outline"
          onClick={addDay}
          className="w-full border-dashed gap-2 rounded-xl active:scale-[0.98] transition-all duration-200 touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          Add Day
        </Button>

        {/* Tips */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary border border-border">
          <Sparkles className="w-5 h-5 text-foreground mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Building Tips</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Drag items to reorder your schedule</li>
              <li>• Check off confirmed reservations</li>
              <li>• Add time estimates for better planning</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ItineraryBuilder;
