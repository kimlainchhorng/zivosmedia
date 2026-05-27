/**
 * DatingPage — Interest-based profile matching & discovery
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SafeCaption from "@/components/social/SafeCaption";
import { ArrowLeft, Heart, X, MapPin, Sparkles, MessageCircle } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

export default function DatingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["dating-profiles", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, avatar_url, bio, city, country, is_verified")
        .neq("id", user?.id || "")
        .limit(30);
      if (error) throw error;
      return (data || []).sort(() => Math.random() - 0.5);
    },
    enabled: !!user,
  });

  const currentProfile = profiles[currentIndex];

  const likeMutation = useMutation({
    mutationFn: async ({ targetId, action }: { targetId: string; action: "like" | "skip" }) => {
      if (!user?.id) return;
      await (supabase as any)
        .from("user_connections")
        .upsert(
          { user_id: user.id, target_user_id: targetId, connection_type: `dating_${action}`, created_at: new Date().toISOString() },
          { onConflict: "user_id,target_user_id" }
        );
      if (action === "like") {
        const { data: mutual } = await (supabase as any)
          .from("user_connections")
          .select("id")
          .eq("user_id", targetId)
          .eq("target_user_id", user.id)
          .eq("connection_type", "dating_like")
          .maybeSingle();
        if (mutual) {
          toast.success("It's a match! 🎉 Say hi in chat.", { duration: 5000 });
        }
      }
    },
  });

  const handleSwipe = useCallback((dir: "left" | "right") => {
    setDirection(dir);
    if (currentProfile) {
      if (dir === "right") {
        toast.success(`Liked ${currentProfile.full_name}!`, { icon: "❤️" });
        likeMutation.mutate({ targetId: currentProfile.id, action: "like" });
      } else {
        likeMutation.mutate({ targetId: currentProfile.id, action: "skip" });
      }
    }
    setTimeout(() => {
      setDirection(null);
      setCurrentIndex((prev) => prev + 1);
    }, 300);
  }, [currentProfile, likeMutation]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      handleSwipe("right");
    } else if (info.offset.x < -100) {
      handleSwipe("left");
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead
        title="Meet People – ZIVO | Connect & Date Nearby"
        description="Meet new people, make friends, and find connections near you on ZIVO. Swipe, match, and chat in one place."
        canonical="/dating"
        ogImage="/og-dating.jpg"
      />
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold flex-1 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-foreground" /> Discover
          </h1>
        </div>
      </div>

      <div className="px-4 py-6 flex flex-col items-center">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground text-sm">Finding people near you...</div>
        ) : !currentProfile ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground">No more profiles</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later for new people</p>
            <button type="button"
              onClick={() => { setCurrentIndex(0); queryClient.invalidateQueries({ queryKey: ["dating-profiles"] }); }}
              className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        ) : (
          <>
            {/* Card Stack */}
            <div className="relative w-full max-w-[340px] aspect-[3/4]">
              {/* Next card preview */}
              {profiles[currentIndex + 1] && (
                <div className="absolute inset-0 rounded-3xl bg-card border border-border/30 scale-[0.95] opacity-50" />
              )}

              {/* Current card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentProfile.id}
                  style={{ x, rotate }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={handleDragEnd}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={direction === "right" ? { x: 300, opacity: 0, rotate: 15 } : { x: -300, opacity: 0, rotate: -15 }}
                  transition={{ type: "spring", damping: 20 }}
                  className="absolute inset-0 bg-card rounded-3xl border border-border/30 overflow-hidden cursor-grab active:cursor-grabbing shadow-xl"
                >
                  {/* LIKE / NOPE overlays */}
                  <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-6 z-10 px-4 py-2 rounded-xl border-4 border-emerald-500 rotate-[-20deg]">
                    <span className="text-2xl font-black text-emerald-500">LIKE</span>
                  </motion.div>
                  <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-6 z-10 px-4 py-2 rounded-xl border-4 border-destructive rotate-[20deg]">
                    <span className="text-2xl font-black text-destructive">NOPE</span>
                  </motion.div>

                  {/* Avatar area */}
                  <div className="h-[60%] bg-gradient-to-b from-primary/10 to-background flex items-center justify-center">
                    <Avatar className="h-32 w-32 border-4 border-background shadow-2xl">
                      <AvatarImage src={currentProfile.avatar_url} />
                      <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold">
                        {currentProfile.full_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-foreground">{currentProfile.full_name}</h2>
                      {isBlueVerified(currentProfile.is_verified) && (
                        <VerifiedBadge size={16} interactive={false} />
                      )}
                    </div>

                    {(currentProfile.city || currentProfile.country) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <MapPin className="h-3 w-3" />
                        {[currentProfile.city, currentProfile.country].filter(Boolean).join(", ")}
                      </p>
                    )}

                    {currentProfile.bio && (
                      <p className="text-sm text-foreground/80 line-clamp-3">
                        <SafeCaption text={currentProfile.bio} />
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-5 mt-8">
              <button type="button"
                onClick={() => handleSwipe("left")}
                className="h-14 w-14 rounded-full bg-card border-2 border-destructive/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <X className="h-7 w-7 text-destructive" />
              </button>

              <button type="button"
                onClick={() => {
                  if (currentProfile) {
                    navigate(`/chat`, { state: { recipientId: currentProfile.id } });
                  }
                }}
                className="h-11 w-11 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <MessageCircle className="h-5 w-5 text-primary" />
              </button>

              <button type="button"
                onClick={() => handleSwipe("right")}
                className="h-14 w-14 rounded-full bg-card border-2 border-emerald-500/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <Heart className="h-7 w-7 text-emerald-500" />
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground mt-4">
              {currentIndex + 1} of {profiles.length} · Swipe right to like, left to pass
            </p>
          </>
        )}
      </div>

      <ZivoMobileNav />
    </div>
  );
}
