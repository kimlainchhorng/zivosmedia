/**
 * GroupRidePlanner - Group ride coordination with invite, pickup order voting, shared ETA
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, MapPin, Clock, Vote, Check, X, Share2, ChevronRight, Crown, Copy, MessageSquare, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GroupMember {
  id: string;
  name: string;
  initials: string;
  status: "joined" | "pending" | "declined";
  location?: string;
  pickupVote?: number;
  eta?: number;
}

interface GroupRidePlannerProps {
  onStartRide?: () => void;
  onClose?: () => void;
}

const initialMembers: GroupMember[] = [
  { id: "1", name: "You", initials: "You", status: "joined", pickupVote: 1, eta: 0 },
];

export default function GroupRidePlanner({ onStartRide, onClose }: GroupRidePlannerProps) {
  const [members, setMembers] = useState(initialMembers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [destination, setDestination] = useState("Downtown Convention Center");
  const shareCode = "ZIVO-GRP-7842";

  const joinedCount = members.filter(m => m.status === "joined").length;
  const allJoined = members.every(m => m.status !== "pending");

  const addMember = () => {
    if (!inviteName.trim()) return;
    setMembers([...members, {
      id: Date.now().toString(),
      name: inviteName,
      initials: inviteName.slice(0, 2).toUpperCase(),
      status: "pending",
    }]);
    setInviteName("");
    setShowInvite(false);
    toast.success("Invite sent!");
  };

  const removeMember = (id: string) => {
    if (id === "1") return;
    setMembers(members.filter(m => m.id !== id));
  };

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 to-transparent border-b border-border/30 bg-secondary">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Users className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Group Ride</h3>
              <p className="text-[10px] text-muted-foreground">{joinedCount}/{members.length} joined</p>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Share code */}
        <button type="button"
          onClick={() => { navigator.clipboard?.writeText(shareCode); toast.success("Code copied!"); }}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/20"
        >
          <div className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-foreground" />
            <span className="text-xs text-muted-foreground">Invite code:</span>
            <span className="text-xs font-mono font-bold text-foreground">{shareCode}</span>
          </div>
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Destination */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/20">
          <MapPin className="w-4 h-4 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-muted-foreground">Going to</span>
            <p className="text-xs font-bold text-foreground truncate">{destination}</p>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="px-4 pb-3">
        <span className="text-xs font-bold text-foreground mb-2 block">Riders</span>
        <div className="space-y-2">
          {members.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                member.status === "joined" ? "bg-muted/10 border-border/20" :
                member.status === "pending" ? "bg-amber-500/5 border-amber-500/10" :
                "bg-red-500/5 border-red-500/10 opacity-50"
              )}
            >
              <div className="relative">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className={cn(
                    "text-[10px] font-bold",
                    member.id === "1" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                {member.id === "1" && (
                  <Crown className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">{member.name}</span>
                  <Badge variant="outline" className={cn(
                    "text-[8px] h-4 font-bold",
                    member.status === "joined" ? "text-emerald-500 border-emerald-500/20" :
                    member.status === "pending" ? "text-amber-500 border-amber-500/20" :
                    "text-red-500 border-red-500/20"
                  )}>
                    {member.status}
                  </Badge>
                </div>
                {member.location && (
                  <p className="text-[10px] text-muted-foreground truncate">{member.location}</p>
                )}
              </div>
              {member.eta !== undefined && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-muted-foreground">Pickup</span>
                  <p className="text-xs font-bold text-foreground">#{member.pickupVote}</p>
                </div>
              )}
              {member.id !== "1" && (
                <button type="button" onClick={() => removeMember(member.id)} className="p-1 rounded-full hover:bg-muted shrink-0">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Add member */}
        {!showInvite ? (
          <button type="button"
            onClick={() => setShowInvite(true)}
            className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/50 text-xs text-muted-foreground hover:border-border hover:bg-secondary transition-all mt-2"
          >
            <UserPlus className="w-4 h-4" /> Invite more riders
          </button>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 mt-2">
            <Input placeholder="Name or phone" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="h-9 text-xs" />
            <Button size="sm" className="h-9 shrink-0" onClick={addMember} disabled={!inviteName.trim()}>
              <UserPlus className="w-3.5 h-3.5" />
            </Button>
          </motion.div>
        )}
      </div>

      {/* Pickup order voting */}
      <div className="px-4 py-3 border-t border-border/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-foreground" /> Pickup Order
          </span>
          <Badge variant="outline" className="text-[9px] font-bold text-foreground border-border">
            Optimized route
          </Badge>
        </div>
        <Progress value={allJoined ? 100 : (joinedCount / members.length) * 100} className="h-1.5 mb-2" />
        <p className="text-[10px] text-muted-foreground text-center">
          {allJoined ? "All riders confirmed! Ready to go." : `Waiting for ${members.length - joinedCount} more`}
        </p>
      </div>

      {/* Start ride */}
      <div className="px-4 pb-4">
        <Button
          onClick={() => { onStartRide?.(); toast.success("Group ride started!"); }}
          disabled={!allJoined}
          className="w-full h-11 rounded-xl font-bold"
        >
          <Users className="w-4 h-4 mr-2" />
          {allJoined ? "Start Group Ride" : "Waiting for all riders..."}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
