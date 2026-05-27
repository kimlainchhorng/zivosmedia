import { Calendar, MapPin, Clock, Plus, GripVertical, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const defaultItinerary = [
  { id: 1, time: "09:00", activity: "Arrive at LAX", location: "Los Angeles Airport", duration: "—" },
  { id: 2, time: "10:30", activity: "Check-in at Hotel", location: "The Grand Plaza", duration: "30 min" },
  { id: 3, time: "12:00", activity: "Lunch at Nobu", location: "Malibu", duration: "1.5 hr" },
  { id: 4, time: "14:30", activity: "Beach Walk", location: "Santa Monica", duration: "2 hr" },
  { id: 5, time: "18:00", activity: "Sunset at Griffith", location: "Observatory", duration: "1.5 hr" },
  { id: 6, time: "20:00", activity: "Dinner Reservation", location: "Spago Beverly Hills", duration: "2 hr" },
];

const TripPlanner = () => {
  const [itinerary, setItinerary] = useState(defaultItinerary);

  const removeItem = (id: number) => {
    setItinerary(prev => prev.filter(item => item.id !== id));
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-secondary text-foreground border-border">
            <Calendar className="w-3 h-3 mr-1" /> Trip Planner
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Plan Your Day
          </h2>
          <p className="text-muted-foreground">Organize your itinerary</p>
        </div>

        <div className="bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 p-6">
          {/* Day Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
            <div>
              <h3 className="font-bold text-lg">Day 1</h3>
              <p className="text-sm text-muted-foreground">Saturday, March 15</p>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" /> Add Activity
            </Button>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-[52px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />

            <div className="space-y-4">
              {itinerary.map((item, index) => (
                <div 
                  key={item.id}
                  className="relative flex items-start gap-4 group"
                >
                  {/* Drag Handle */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Time */}
                  <div className="w-12 text-right">
                    <span className="text-sm font-medium">{item.time}</span>
                  </div>

                  {/* Timeline Dot */}
                  <div className="relative z-10 w-3 h-3 rounded-full bg-primary border-2 border-background mt-1.5" />

                  {/* Content */}
                  <div className="flex-1 bg-muted/30 rounded-xl p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{item.activity}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" /> {item.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" /> {item.duration}
                        </Badge>
                        <button type="button" 
                          onClick={() => removeItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{itinerary.length} Activities</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>~11 hours planned</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span>4 Locations</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TripPlanner;
