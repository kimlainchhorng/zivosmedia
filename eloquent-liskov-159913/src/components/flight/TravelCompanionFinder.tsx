import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  MessageCircle,
  Plane,
  MapPin,
  Calendar,
  Shield,
  Star,
  ArrowLeftRight,
  Heart,
  Send,
  Coffee,
  Briefcase,
  Camera,
  Globe,
  Check,
  X,
  Sparkles,
  UserPlus,
  Bell,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Traveler {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
  rating: number;
  tripCount: number;
  flightNumber: string;
  seatLocation: string;
  interests: string[];
  lookingFor: ("seat_swap" | "meetup" | "lounge_share" | "ground_transport")[];
  bio: string;
  languages: string[];
  responseRate: number;
  memberSince: string;
}

interface SeatSwapRequest {
  id: string;
  fromTraveler: Traveler;
  currentSeat: string;
  desiredSeat: string;
  reason: string;
  status: "pending" | "accepted" | "declined";
}

interface TravelCompanionFinderProps {
  flightNumber: string;
  currentSeat: string;
  departureDate: Date;
  route: { from: string; to: string };
  onConnectionMade?: (travelerId: string, type: string) => void;
}

const mockTravelers: Traveler[] = [];

const interestIcons: Record<string, typeof Coffee> = {
  Photography: Camera,
  Tech: Globe,
  Coffee: Coffee,
  Business: Briefcase,
  Yoga: Heart,
  Reading: Globe,
  Food: Coffee,
  Travel: Plane,
  Music: Heart,
  Art: Sparkles,
  Wine: Coffee,
  Architecture: Globe,
};

const TravelCompanionFinder = ({
  flightNumber,
  currentSeat,
  departureDate,
  route,
  onConnectionMade,
}: TravelCompanionFinderProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedTraveler, setSelectedTraveler] = useState<Traveler | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [connections, setConnections] = useState<string[]>([]);
  const [seatSwapRequests, setSeatSwapRequests] = useState<SeatSwapRequest[]>([]);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [swapReason, setSwapReason] = useState("");
  const [travelers, setTravelers] = useState<Traveler[]>(mockTravelers);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Load companions on the same flight from feedback_submissions
  useEffect(() => {
    if (!flightNumber) return;
    supabase
      .from("feedback_submissions" as any)
      .select("id, message, created_at")
      .eq("category", "flight_companion")
      .eq("status", "pending")
      .then(({ data }) => {
        if (!data) return;
        const companions: Traveler[] = [];
        for (const row of data) {
          try {
            const p = JSON.parse((row as any).message);
            if (p.flight_number !== flightNumber) continue;
            companions.push({
              id: (row as any).id,
              name: p.name || "Fellow Traveler",
              avatar: p.avatar || "",
              verified: false,
              rating: p.rating ?? 4.5,
              tripCount: p.trip_count ?? 1,
              flightNumber: p.flight_number,
              seatLocation: p.seat || "—",
              interests: p.interests ?? [],
              lookingFor: p.looking_for ?? ["meetup"],
              bio: p.bio || "",
              languages: p.languages ?? ["English"],
              responseRate: 90,
              memberSince: new Date((row as any).created_at).getFullYear().toString(),
            });
          } catch { /* skip malformed rows */ }
        }
        setTravelers(companions);
      });
  }, [flightNumber]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        flight_number: flightNumber,
        seat: currentSeat,
        name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Anonymous",
        looking_for: ["meetup"],
        bio: "",
        interests: [],
      };
      const { error } = await supabase.from("feedback_submissions" as any).insert({
        category: "flight_companion",
        message: JSON.stringify(payload),
        status: "pending",
        user_id: user?.id,
      });
      if (error) throw error;
      setRegistered(true);
      toast.success("You're now visible to other travelers on this flight!");
    } catch {
      toast.error("Failed to register. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  const handleConnect = (traveler: Traveler) => {
    setConnections((prev) => [...prev, traveler.id]);
    onConnectionMade?.(traveler.id, "connect");
  };

  const handleSendMessage = () => {
    if (!selectedTraveler || !message.trim()) return;
    // In real app, send message via API
    setShowMessageDialog(false);
    setMessage("");
    handleConnect(selectedTraveler);
  };

  const handleSeatSwapRequest = (traveler: Traveler) => {
    if (!swapReason.trim()) return;
    
    const newRequest: SeatSwapRequest = {
      id: `swap_${Date.now()}`,
      fromTraveler: traveler,
      currentSeat,
      desiredSeat: traveler.seatLocation,
      reason: swapReason,
      status: "pending",
    };
    
    setSeatSwapRequests((prev) => [...prev, newRequest]);
    setShowSwapDialog(false);
    setSwapReason("");
    onConnectionMade?.(traveler.id, "seat_swap");
  };

  const filteredTravelers =
    filterType === "all"
      ? travelers
      : travelers.filter((t) => t.lookingFor.includes(filterType as typeof t.lookingFor[number]));

  const isConnected = (travelerId: string) => connections.includes(travelerId);

  return (
    <div className="space-y-6">
      {/* Header with visibility toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Travel Companions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Flight {flightNumber} • {route.from} → {route.to}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            {isVisible ? (
              <Eye className="h-4 w-4 text-muted-foreground" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
            <span className="text-muted-foreground">
              {isVisible ? "Visible" : "Hidden"}
            </span>
          </div>
        </div>
      </div>

      {/* Your profile card */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Your Profile</span>
                <Badge variant="outline" className="text-[10px]">
                  Seat {currentSeat}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isVisible
                  ? "Other travelers can find and connect with you"
                  : "You're browsing anonymously"}
              </p>
            </div>
            {registered ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 gap-1">
                <Check className="h-3 w-3" /> Visible
              </Badge>
            ) : (
              <Button size="sm" disabled={registering} onClick={handleRegister} className="gap-1">
                <UserPlus className="h-3.5 w-3.5" />
                {registering ? "Joining…" : "Join"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {[
            { id: "all", label: "All Travelers", icon: Users },
            { id: "seat_swap", label: "Seat Swaps", icon: ArrowLeftRight },
            { id: "meetup", label: "Meetups", icon: Coffee },
            { id: "lounge_share", label: "Lounge Share", icon: Sparkles },
            { id: "ground_transport", label: "Share Ride", icon: MapPin },
          ].map((filter) => {
            const Icon = filter.icon;
            return (
              <Button
                key={filter.id}
                variant={filterType === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(filter.id)}
                className="gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {filter.label}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Empty state */}
      {filteredTravelers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No travel companions found yet</p>
          <p className="text-xs mt-1">Be the first to join — click <strong>Join</strong> above so other passengers on flight {flightNumber} can find you.</p>
        </div>
      )}

      {/* Travelers Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {filteredTravelers.map((traveler) => {
            const connected = isConnected(traveler.id);
            
            return (
              <motion.div
                key={traveler.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className={`overflow-hidden transition-all hover:shadow-md ${connected ? "border-primary/50" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={traveler.avatar} />
                        <AvatarFallback className="text-lg">
                          {traveler.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        {/* Name & badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{traveler.name}</h3>
                          {traveler.verified && (
                            <Badge variant="secondary" className="text-[10px] gap-0.5 bg-blue-500/10 text-blue-600">
                              <Shield className="h-3 w-3" />
                              Verified
                            </Badge>
                          )}
                          {connected && (
                            <Badge className="text-[10px] gap-0.5">
                              <Check className="h-3 w-3" />
                              Connected
                            </Badge>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {traveler.rating}
                          </span>
                          <span className="flex items-center gap-1">
                            <Plane className="h-3 w-3" />
                            {traveler.tripCount} trips
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {traveler.seatLocation}
                          </span>
                        </div>

                        {/* Bio */}
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {traveler.bio}
                        </p>

                        {/* Interests */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {traveler.interests.map((interest) => {
                            const Icon = interestIcons[interest] || Heart;
                            return (
                              <Badge key={interest} variant="outline" className="text-[10px] gap-1">
                                <Icon className="h-3 w-3" />
                                {interest}
                              </Badge>
                            );
                          })}
                        </div>

                        {/* Looking for */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {traveler.lookingFor.map((item) => (
                            <Badge
                              key={item}
                              variant="secondary"
                              className="text-[10px] bg-primary/10 text-primary"
                            >
                              {item === "seat_swap" && "Seat Swap"}
                              {item === "meetup" && "Meetup"}
                              {item === "lounge_share" && "Lounge Share"}
                              {item === "ground_transport" && "Share Ride"}
                            </Badge>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          {!connected ? (
                            <>
                              <Button
                                size="sm"
                                className="gap-1.5"
                                onClick={() => {
                                  setSelectedTraveler(traveler);
                                  setShowMessageDialog(true);
                                }}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                Message
                              </Button>
                              {traveler.lookingFor.includes("seat_swap") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5"
                                  onClick={() => {
                                    setSelectedTraveler(traveler);
                                    setShowSwapDialog(true);
                                  }}
                                >
                                  <ArrowLeftRight className="h-3.5 w-3.5" />
                                  Request Swap
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button size="sm" variant="secondary" className="gap-1.5">
                              <MessageCircle className="h-3.5 w-3.5" />
                              View Chat
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pending Requests */}
      {seatSwapRequests.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Pending Seat Swap Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {seatSwapRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-xl bg-background border"
              >
                <div className="flex items-center gap-3">
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {request.currentSeat} ↔ {request.desiredSeat}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested from {request.fromTraveler.name}
                    </p>
                  </div>
                </div>
                <Badge variant={request.status === "pending" ? "secondary" : "default"}>
                  {request.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-md">
          {selectedTraveler && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {selectedTraveler.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  Message {selectedTraveler.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Textarea
                  placeholder={`Hi ${selectedTraveler.name.split(" ")[0]}! I noticed we're on the same flight...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  Messages are monitored for safety
                </div>
                <Button className="w-full gap-2" onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                  Send Message
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Seat Swap Dialog */}
      <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <DialogContent className="max-w-md">
          {selectedTraveler && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Request Seat Swap
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Your seat</p>
                    <p className="font-bold text-lg">{currentSeat}</p>
                  </div>
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Their seat</p>
                    <p className="font-bold text-lg">{selectedTraveler.seatLocation.split(" ")[0]}</p>
                  </div>
                </div>
                
                <Textarea
                  placeholder="Why would you like to swap? (e.g., traveling with family, prefer window seat)"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  rows={3}
                />
                
                <Button
                  className="w-full gap-2"
                  onClick={() => handleSeatSwapRequest(selectedTraveler)}
                >
                  <Send className="h-4 w-4" />
                  Send Swap Request
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TravelCompanionFinder;
