/**
 * ReelAnalytics — Stats dashboard for a reel (views, retention, reach)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Heart, MessageCircle, Share2, TrendingUp, Users, Clock, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReelAnalyticsProps {
  postId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export default function ReelAnalytics({ postId, views, likes, comments, shares }: ReelAnalyticsProps) {
  const engagementRate = views > 0 ? (((likes + comments + shares) / views) * 100).toFixed(1) : "0";

  const stats = [
    { icon: Eye, label: "Views", value: views.toLocaleString(), color: "text-sky-500" },
    { icon: Heart, label: "Likes", value: likes.toLocaleString(), color: "text-rose-500" },
    { icon: MessageCircle, label: "Comments", value: comments.toLocaleString(), color: "text-amber-500" },
    { icon: Share2, label: "Shares", value: shares.toLocaleString(), color: "text-emerald-500" },
    { icon: TrendingUp, label: "Engagement", value: `${engagementRate}%`, color: "text-purple-500" },
  ];

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" /> Reel Analytics
      </h3>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="p-3 rounded-xl bg-card border border-border/40 text-center">
            <s.icon className={cn("h-4 w-4 mx-auto mb-1", s.color)} />
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Retention chart placeholder */}
      <div className="p-4 rounded-xl bg-card border border-border/40">
        <p className="text-xs font-medium text-foreground mb-2">Audience Retention</p>
        <div className="h-24 flex items-end gap-0.5">
          {Array.from({ length: 20 }).map((_, i) => {
            const h = Math.max(15, 100 - i * 4 + Math.random() * 10);
            return (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/30"
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">0:00</span>
          <span className="text-[10px] text-muted-foreground">End</span>
        </div>
      </div>
    </div>
  );
}
