/**
 * RideMarketplace — Ride bidding, driver auctions, preferred drivers, ride requests
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Star, Clock, MapPin, DollarSign, ThumbsUp, Users, ArrowUpDown, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const driverBids = [
  { id: "1", name: "Marcus T.", rating: 4.9, trips: 2340, vehicle: "Tesla Model 3", bid: 18.50, eta: 3, avatar: "MT", preferred: true },
  { id: "2", name: "Sarah K.", rating: 4.8, trips: 1890, vehicle: "Toyota Camry", bid: 14.75, eta: 5, avatar: "SK", preferred: false },
  { id: "3", name: "James R.", rating: 4.95, trips: 5200, vehicle: "BMW 5 Series", bid: 22.00, eta: 2, avatar: "JR", preferred: true },
  { id: "4", name: "Priya M.", rating: 4.7, trips: 980, vehicle: "Honda Accord", bid: 12.50, eta: 7, avatar: "PM", preferred: false },
];

const rideRequests = [
  { id: "r1", from: "Downtown", to: "Airport", time: "2:30 PM", budget: "$20-25", responses: 4, expires: 12 },
  { id: "r2", from: "Mall", to: "University", time: "Now", budget: "$8-12", responses: 7, expires: 5 },
  { id: "r3", from: "Hotel District", to: "Convention Center", time: "6:00 PM", budget: "$15-18", responses: 2, expires: 25 },
];

export default function RideMarketplace() {
  const navigate = useNavigate();
  const [selectedBid, setSelectedBid] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"price" | "rating" | "eta">("price");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqFrom, setReqFrom] = useState("");
  const [reqTo, setReqTo] = useState("");
  const [reqBudget, setReqBudget] = useState("");

  const sorted = [...driverBids].sort((a, b) => {
    if (sortBy === "price") return a.bid - b.bid;
    if (sortBy === "rating") return b.rating - a.rating;
    return a.eta - b.eta;
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="bids">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="bids">Driver Bids</TabsTrigger>
          <TabsTrigger value="preferred">Preferred</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="bids" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sort:</span>
            {(["price", "rating", "eta"] as const).map((s) => (
              <Button key={s} size="sm" variant={sortBy === s ? "default" : "outline"} className="h-7 text-xs" onClick={() => setSortBy(s)}>
                {s === "price" ? "Price" : s === "rating" ? "Rating" : "ETA"}
              </Button>
            ))}
          </div>

          <AnimatePresence>
            {sorted.map((driver, i) => (
              <motion.div key={driver.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`cursor-pointer transition-all ${selectedBid === driver.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedBid(driver.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">{driver.avatar}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{driver.name}</span>
                            {driver.preferred && <Badge variant="secondary" className="text-[10px] h-4">⭐ Preferred</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {driver.rating}
                            <span>·</span>
                            <span>{driver.trips.toLocaleString()} trips</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{driver.vehicle}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary">${driver.bid.toFixed(2)}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" /> {driver.eta} min
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {selectedBid && (
            <Button className="w-full" onClick={() => {
              const driver = driverBids.find(d => d.id === selectedBid);
              navigate("/rides/hub", { state: { preferredDriverId: driver?.id, preferredDriverName: driver?.name, bidAmount: driver?.bid } });
            }}>
              Accept Bid — ${driverBids.find(d => d.id === selectedBid)?.bid.toFixed(2)}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="preferred" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">Drivers you've favorited for priority matching.</p>
          {driverBids.filter(d => d.preferred).map((driver) => (
            <Card key={driver.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">{driver.avatar}</div>
                  <div>
                    <span className="font-bold text-sm">{driver.name}</span>
                    <div className="text-xs text-muted-foreground">{driver.vehicle} · {driver.rating} ★</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/rides/hub", { state: { preferredDriverId: driver.id, preferredDriverName: driver.name } })}>
                  Request
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">Post a ride request and let drivers compete for your trip.</p>
          {rideRequests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> {req.from} → {req.to}
                  </div>
                  <Badge variant="outline" className="text-xs">{req.time}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Budget: {req.budget}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {req.responses} bids</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(1 - req.expires / 30) * 100} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground">{req.expires}m left</span>
                </div>
              </CardContent>
            </Card>
          ))}
          <AnimatePresence>
            {showRequestForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <Card className="mb-2">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">New Ride Request</p>
                      <button type="button" onClick={() => setShowRequestForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                    </div>
                    <Input placeholder="From (pickup location)" value={reqFrom} onChange={e => setReqFrom(e.target.value)} className="h-9 text-sm" />
                    <Input placeholder="To (destination)" value={reqTo} onChange={e => setReqTo(e.target.value)} className="h-9 text-sm" />
                    <Input placeholder="Your budget (e.g. $15-20)" value={reqBudget} onChange={e => setReqBudget(e.target.value)} className="h-9 text-sm" />
                    <Button className="w-full" disabled={!reqFrom.trim() || !reqTo.trim()} onClick={() => {
                      toast.success(`Request posted: ${reqFrom} → ${reqTo}`);
                      setShowRequestForm(false);
                      setReqFrom(""); setReqTo(""); setReqBudget("");
                    }}>
                      Post Request
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          <Button className="w-full" variant="outline" onClick={() => setShowRequestForm(v => !v)}>
            <Gavel className="w-4 h-4 mr-2" /> Post New Request
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
