import { useState } from "react";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Check, 
  X,
  Clock,
  CreditCard,
  Plane,
  Hotel,
  Car,
  MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GroupMember {
  id: string;
  name: string;
  email: string;
  status: "confirmed" | "pending" | "declined";
  paid: boolean;
  services: ("flight" | "hotel" | "car")[];
}

interface GroupBookingManagerProps {
  tripName?: string;
  totalCost?: number;
  className?: string;
}

const serviceIcons = {
  flight: Plane,
  hotel: Hotel,
  car: Car,
};

const GroupBookingManager = ({ 
  tripName = "Paris Adventure 2024",
  totalCost = 4500,
  className 
}: GroupBookingManagerProps) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  const confirmedCount = members.filter(m => m.status === "confirmed").length;
  const paidCount = members.filter(m => m.paid).length;
  const perPersonCost = Math.round(totalCost / members.length);
  const totalPaid = paidCount * perPersonCost;

  const handleInvite = () => {
    if (newEmail.trim() && newEmail.includes("@")) {
      const newMember: GroupMember = {
        id: Date.now().toString(),
        name: newEmail.split("@")[0],
        email: newEmail.trim(),
        status: "pending",
        paid: false,
        services: ["flight", "hotel"],
      };
      setMembers(prev => [...prev, newMember]);
      setNewEmail("");
      setShowInvite(false);
      toast.success(`Invitation sent to ${newEmail}`);
    }
  };

  const handleRemove = (id: string) => {
    if (id !== "1") {
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success("Member removed from group");
    }
  };

  const handleSendReminder = (member: GroupMember) => {
    toast.success(`Reminder sent to ${member.name}`);
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary">
              <Users className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{tripName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {members.length} travelers • ${perPersonCost}/person
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInvite(!showInvite)}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Invite
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-4">
        {/* Invite Form */}
        {showInvite && (
          <div className="p-3 rounded-xl bg-muted/30 space-y-2">
            <div className="flex gap-2">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter email to invite..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <Button size="sm" onClick={handleInvite}>
                <Mail className="w-4 h-4 mr-1" />
                Send
              </Button>
            </div>
          </div>
        )}

        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Group confirmation</span>
            <span className="font-medium">{confirmedCount}/{members.length} confirmed</span>
          </div>
          <Progress value={(confirmedCount / members.length) * 100} className="h-2" />
          
          <div className="flex justify-between text-sm mt-3">
            <span className="text-muted-foreground">Payment collected</span>
            <span className="font-medium">${totalPaid.toLocaleString()}/${totalCost.toLocaleString()}</span>
          </div>
          <Progress value={(totalPaid / totalCost) * 100} className="h-2" />
        </div>

        {/* Members List */}
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                member.status === "confirmed" 
                  ? "bg-emerald-500/5 border-emerald-500/20" 
                  : member.status === "declined"
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-muted/30 border-border"
              )}
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className={cn(
                  "text-xs",
                  member.id === "1" && "bg-primary text-primary-foreground"
                )}>
                  {member.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  {member.id === "1" && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      Organizer
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {member.services.map((service) => {
                    const Icon = serviceIcons[service];
                    return (
                      <Icon key={service} className="w-3 h-3 text-muted-foreground" />
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Badge */}
                <Badge 
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    member.status === "confirmed" && "bg-emerald-500/10 text-emerald-500",
                    member.status === "pending" && "bg-amber-500/10 text-amber-500",
                    member.status === "declined" && "bg-destructive/10 text-destructive"
                  )}
                >
                  {member.status}
                </Badge>

                {/* Payment Status */}
                {member.paid ? (
                  <Badge className="bg-emerald-500 text-primary-foreground text-xs">
                    <CreditCard className="w-3 h-3 mr-1" />
                    Paid
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Unpaid
                  </Badge>
                )}

                {/* Actions */}
                {member.id !== "1" && (
                  <div className="flex items-center gap-1">
                    {member.status === "pending" && (
                      <button type="button"
                        onClick={() => handleSendReminder(member)}
                        className="p-1.5 rounded-xl hover:bg-primary/10 transition-all duration-200 hover:scale-110"
                        title="Send reminder"
                      >
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </button>
                    )}
                    <button type="button"
                      onClick={() => handleRemove(member.id)}
                      className="p-1.5 rounded-xl hover:bg-destructive/10 transition-all duration-200 hover:scale-110"
                      title="Remove member"
                    >
                      <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Group Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            <MessageSquare className="w-4 h-4 mr-2" />
            Group Chat
          </Button>
          <Button 
            className="flex-1 bg-secondary"
            disabled={confirmedCount < members.length}
          >
            {confirmedCount === members.length ? "Finalize Booking" : "Awaiting Confirmations"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupBookingManager;
