/**
 * FollowSuggestions — "People you may know" carousel
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { useState } from "react";
import { toast } from "sonner";
import { MutualFollowsBadge, useMutualFollows } from "./MutualFollowsBadge";

export default function FollowSuggestions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["follow-suggestions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get profiles excluding self and already-followed
      const { data: following } = await (supabase as any)
        .from("user_followers")
        .select("following_id")
        .eq("follower_id", user.id);
      const followingIds = (following || []).map((f: any) => f.following_id);
      const excludeIds = [user.id, ...followingIds];

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const followUser = async (targetId: string) => {
    if (!user) return;
    await (supabase as any).from("user_followers").insert({ follower_id: user.id, following_id: targetId });
    toast.success("Following!");
    setDismissed((p) => [...p, targetId]);
    try {
      const { data: sp } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single();
      await supabase.functions.invoke("send-push-notification", {
        body: { user_id: targetId, notification_type: "new_follower", title: "New Follower 🔔", body: `${sp?.full_name || "Someone"} started following you`, data: { type: "new_follower", follower_id: user.id, avatar_url: sp?.avatar_url, action_url: `/user/${user.id}` } },
      });
    } catch {}
  };

  const visible = suggestions.filter((s: any) => !dismissed.includes(s.id));
  const { data: mutualMap } = useMutualFollows(visible.map((s: any) => s.id));
  if (visible.length === 0) return null;

  return (
    <div className="py-4">
      <h3 className="text-sm font-semibold text-foreground px-4 mb-3">Suggested for you</h3>
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide">
        {visible.map((s: any) => (
          <div key={s.id} className="shrink-0 w-[140px] p-3 rounded-2xl bg-card border border-border/40 text-center relative">
            <button type="button"
              onClick={() => setDismissed((p) => [...p, s.id])}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
            <Avatar className="h-14 w-14 mx-auto mb-2 cursor-pointer" onClick={() => navigate(`/profile/${s.id}`)}>
              <AvatarImage src={optimizeAvatar(s.avatar_url, 56)} loading="lazy" />
              <AvatarFallback>{(s.full_name || "U")[0]}</AvatarFallback>
            </Avatar>
            <p className="text-xs font-medium text-foreground truncate mb-1 inline-flex items-center justify-center gap-1 w-full">
              <span className="truncate">{s.full_name || "User"}</span>
              {isBlueVerified(s.is_verified) && <VerifiedBadge size={11} interactive={false} />}
            </p>
            <MutualFollowsBadge mutual={mutualMap?.get(s.id)} className="mb-2 text-center" />
            <button type="button"
              onClick={() => followUser(s.id)}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
            >
              <UserPlus className="h-3 w-3" /> Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
