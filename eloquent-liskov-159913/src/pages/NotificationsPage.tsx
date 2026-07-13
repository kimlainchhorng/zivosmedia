import { useState, useMemo, useCallback, useEffect } from 'react';
import SEOHead from '@/components/SEOHead';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Bell, Package, Gift, Headphones, Clock, ArrowLeft, UserPlus, Check, X, Heart, MessageCircle as MessageCircleIcon, Share2, AtSign, Flame, Settings2, Trash2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationItem from '@/components/notifications/NotificationItem';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useSocialNotifications } from '@/hooks/useSocialNotifications';
import type { SocialNotification } from '@/hooks/useSocialNotifications';
import VerifiedBadge from '@/components/VerifiedBadge';
import { isBlueVerified } from '@/lib/verification';
import DegradedDataBanner from '@/components/reliability/DegradedDataBanner';
import LoadFailureCard from '@/components/reliability/LoadFailureCard';

type NotificationCategory = 'all' | 'chat' | 'social' | 'orders' | 'promos' | 'support' | 'delays';

interface FriendRequest {
  id: string;
  user_id: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    is_verified?: boolean | null;
  };
}

/* ── Soft Card ── */
const GlassCard3D = ({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm ${className}`}>
    {glow && <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/15 via-transparent to-primary/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
    <div className="relative z-10">{children}</div>
  </div>
);

/* ── Friend Request Card ── */
const FriendRequestCard = ({ request, onAccept, onDecline }: { request: FriendRequest; onAccept: () => void; onDecline: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -100, scale: 0.95 }}
    transition={{ duration: 0.3 }}
  >
    <div className="relative rounded-2xl overflow-hidden shadow-md ring-1 ring-border/20">
      <div className="absolute inset-0 bg-card/70 backdrop-blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-primary/[0.01]" />
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-blue-400 to-blue-300 rounded-l-2xl" />
      <div className="relative z-10 p-4 flex items-center gap-3">
        <Avatar className="w-11 h-11 border-2 border-blue-500/20 shadow-md">
          <AvatarImage src={request.profile?.avatar_url || ''} />
          <AvatarFallback className="bg-blue-500/10 text-blue-600 font-bold text-sm">
            {(request.profile?.full_name || '?')[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate inline-flex items-center gap-1">
            <span className="truncate">{request.profile?.full_name || 'Unknown User'}</span>
            {isBlueVerified(request.profile?.is_verified) && <VerifiedBadge size={13} interactive={false} />}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Sent you a friend request · {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onAccept}
            className="w-9 h-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-lg shadow-rose-500/25 touch-manipulation hover:opacity-90 transition-opacity"
          >
            <Check className="w-4 h-4" strokeWidth={3} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onDecline}
            className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shadow-sm touch-manipulation hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  </motion.div>
);

/* ── Social Notification Item ── */
const SOCIAL_NOTIF_ICONS: Record<string, typeof Heart> = {
  like: Heart, comment: MessageCircleIcon, reply: MessageCircleIcon,
  share: Share2, follow: UserPlus, mention: AtSign, story_reaction: Flame,
};
const SOCIAL_NOTIF_COLORS: Record<string, string> = {
  like: "text-red-500", comment: "text-blue-500", reply: "text-blue-400",
  share: "text-green-500", follow: "text-primary", mention: "text-purple-500", story_reaction: "text-orange-500",
};

const SocialNotifItem = ({ notif, index, onClick }: { notif: SocialNotification; index: number; onClick: () => void }) => {
  const Icon = SOCIAL_NOTIF_ICONS[notif.type] || Heart;
  const color = SOCIAL_NOTIF_COLORS[notif.type] || "text-primary";
  const timeAgo = (() => { try { return formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }); } catch { return ""; } })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <GlassCard3D glow={!notif.is_read}>
        <button type="button" onClick={onClick} className="w-full flex items-center gap-3 p-3 text-left touch-manipulation">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={notif.actor_avatar || undefined} />
              <AvatarFallback className="text-xs font-bold">{notif.actor_name?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div className={cn("absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-card flex items-center justify-center", color)}>
              <Icon className="h-3 w-3" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-[13px] leading-snug inline-flex items-baseline gap-1 flex-wrap", !notif.is_read && "font-semibold")}>
              <span>{notif.message}</span>
              {isBlueVerified(notif.actor_is_verified) && <VerifiedBadge size={11} interactive={false} className="self-center" />}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo}</p>
          </div>
          {!notif.is_read && (
            <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
          )}
        </button>
      </GlassCard3D>
    </motion.div>
  );
};

const SwipeableNotificationRow = ({
  notification,
  index,
  onClick,
  onMarkAsRead,
  onDelete,
}: {
  notification: any;
  index: number;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
}) => {
  const [dragging, setDragging] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -120, scale: 0.96 }}
      transition={{ delay: index * 0.025, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl"
    >
      <div className="absolute inset-0 flex items-stretch justify-between rounded-2xl">
        <div className="flex w-28 items-center justify-start gap-2 bg-emerald-500 px-4 text-white">
          <CheckCheck className="h-4 w-4" />
          <span className="text-xs font-bold">Read</span>
        </div>
        <div className="flex w-28 items-center justify-end gap-2 bg-destructive px-4 text-destructive-foreground">
          <span className="text-xs font-bold">Delete</span>
          <Trash2 className="h-4 w-4" />
        </div>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -112, right: 96 }}
        dragElastic={0.04}
        onDragStart={() => setDragging(true)}
        onDragEnd={(_event, info) => {
          if (info.offset.x < -82 || info.velocity.x < -520) {
            onDelete();
          } else if (info.offset.x > 76 || info.velocity.x > 520) {
            onMarkAsRead();
          }
          window.setTimeout(() => setDragging(false), 40);
        }}
        whileTap={{ scale: 0.992 }}
        className="relative"
      >
        <NotificationItem
          notification={notification}
          onMarkAsRead={onMarkAsRead}
          onClick={() => {
            if (!dragging) onClick();
          }}
        />
      </motion.div>
    </motion.div>
  );
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NotificationCategory>('all');
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loadingFR, setLoadingFR] = useState(false);
  
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error,
    markAsRead, 
    markAllAsRead,
    fetchNotifications,
    deleteNotifications,
  } = useNotifications(100);

  const {
    notifications: socialNotifs,
    unreadCount: socialUnread,
    markAsRead: markSocialRead,
    markAllAsRead: markAllSocialRead,
  } = useSocialNotifications(50);

  // Fetch pending friend requests
  const fetchFriendRequests = useCallback(async () => {
    if (!user) return;
    setLoadingFR(true);
    try {
      const { data, error } = await (supabase as any)
        .from('friendships')
        .select('id, user_id, created_at')
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Fetch profiles for each request
      if (data?.length) {
        const userIds = data.map((r: any) => r.user_id);
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('user_id, full_name, avatar_url, is_verified')
          .in('user_id', userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setFriendRequests(data.map((r: any) => ({
          ...r,
          profile: profileMap.get(r.user_id) || null,
        })));
      } else {
        setFriendRequests([]);
      }
    } catch (err) {
      console.error('Error fetching friend requests:', err);
    } finally {
      setLoadingFR(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFriendRequests();
  }, [fetchFriendRequests]);

  const handleAcceptFriend = async (request: FriendRequest) => {
    try {
      const { error } = await (supabase as any)
        .from('friendships')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
      setFriendRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success(`You are now friends with ${request.profile?.full_name || 'this user'}!`);

      // Notify the requester that their friend request was accepted
      try {
        const { data: myProfile } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user?.id).single();
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: request.user_id,
            notification_type: "friend_request_accepted",
            title: "Friend Request Accepted 🎉",
            body: `${myProfile?.full_name || "Someone"} accepted your friend request`,
            data: { type: "friend_accepted", sender_id: user?.id, avatar_url: myProfile?.avatar_url, action_url: `/user/${user?.id}` },
          },
        });
      } catch {}
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept request');
    }
  };

  const handleDeclineFriend = async (request: FriendRequest) => {
    try {
      const { error } = await (supabase as any)
        .from('friendships')
        .update({ status: 'declined' })
        .eq('id', request.id);
      if (error) throw error;
      setFriendRequests(prev => prev.filter(r => r.id !== request.id));
      toast('Friend request declined');
    } catch (err) {
      console.error(err);
      toast.error('Failed to decline request');
    }
  };

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([fetchNotifications(), fetchFriendRequests()]);
  }, [fetchNotifications, fetchFriendRequests]);

  const handleDeleteNotification = useCallback((id: string) => {
    void deleteNotifications([id]);
    toast.success('Notification deleted');
  }, [deleteNotifications]);

  const handleClearRead = useCallback(() => {
    const readIds = notifications.filter(n => n.is_read).map(n => n.id);
    if (readIds.length === 0) {
      toast('No read notifications to clear');
      return;
    }
    void deleteNotifications(readIds);
    toast.success(`Cleared ${readIds.length} read notification${readIds.length === 1 ? '' : 's'}`);
  }, [deleteNotifications, notifications]);

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
    markAllSocialRead();
  }, [markAllAsRead, markAllSocialRead]);

  // Templates produced by the in-DB social triggers
  // (see 20260430010000_social_notifications_and_comment_hearts.sql).
  const isSocialTemplate = (t?: string | null) =>
    !!t && (t === "social_reaction" || t === "social_repost" || t === "social_comment" || t === "social_mention" || t === "channel_post" || t.startsWith("social_"));

  const isChatTemplate = (t?: string | null, c?: string | null) =>
    c === 'chat' || t === 'chat_message' || t === 'bot_reply';

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter(n => {
      switch (activeTab) {
        case 'chat':    return isChatTemplate(n.template, n.category);
        case 'social':  return isSocialTemplate(n.template) || n.category === 'social';
        case 'orders':  return n.category === 'transactional' || n.category === 'order';
        case 'promos':  return n.category === 'marketing';
        case 'support': return n.category === 'operational';
        case 'delays':  return n.template?.toLowerCase().includes('delay') || n.title?.toLowerCase().includes('delay');
        default:        return true;
      }
    });
  }, [notifications, activeTab]);

  const hasAnyVisibleNotificationData =
    notifications.length > 0 || friendRequests.length > 0 || socialNotifs.length > 0;
  const hasNotificationsRefreshError = Boolean(error) && hasAnyVisibleNotificationData;
  const shouldShowNotificationsRecovery = Boolean(error) && !isLoading && !hasAnyVisibleNotificationData;

  const categoryCounts = useMemo(() => {
    const counts = { all: 0, chat: 0, social: friendRequests.length + socialUnread, orders: 0, promos: 0, support: 0, delays: 0 };
    notifications.forEach(n => {
      if (!n.is_read) {
        counts.all++;
        if (n.category === 'transactional' || n.category === 'order') counts.orders++;
        else if (n.category === 'marketing') counts.promos++;
        else if (n.category === 'operational') counts.support++;
        if (n.template?.toLowerCase().includes('delay') || n.title?.toLowerCase().includes('delay')) counts.delays++;
        if (isChatTemplate(n.template, n.category)) counts.chat++;
        // Trigger-generated social notifications (reactions/reposts/mentions/comments)
        if (isSocialTemplate(n.template) || n.category === 'social') counts.social++;
      }
    });
    counts.all += friendRequests.length + socialUnread;
    return counts;
  }, [notifications, friendRequests, socialUnread]);

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) markAsRead([notification.id]);
    if (notification.action_url) {
      let url = notification.action_url as string;
      // Remap legacy /dispatch/support/:id to /support/tickets/:id
      const dispatchMatch = url.match(/^\/dispatch\/support\/(.+)$/);
      if (dispatchMatch) {
        url = `/support/tickets/${dispatchMatch[1]}`;
      }
      if (url.startsWith('/')) navigate(url);
      else import('@/lib/openExternalUrl').then(({ openExternalUrl: oe }) => oe(url));
    }
  };

  const getEmptyMessage = (tab: NotificationCategory) => {
    const msgs: Record<NotificationCategory, string> = {
      all: "No notifications yet. You'll see updates here.",
      chat: "No new messages.",
      social: "No friend requests or social activity.",
      orders: "No order updates yet.",
      promos: "No promotions right now.",
      support: "No support messages.",
      delays: "No delay alerts. Your orders are on time!",
    };
    return msgs[tab];
  };

  const getEmptyIcon = (tab: NotificationCategory) => {
    const icons: Record<NotificationCategory, typeof Bell> = {
      all: Bell, chat: MessageCircleIcon, social: UserPlus, orders: Package, promos: Gift, support: Headphones, delays: Clock,
    };
    const Icon = icons[tab];
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4 shadow-inner border border-primary/10"
      >
        <Icon className="w-9 h-9 text-primary/30" />
      </motion.div>
    );
  };

  const tabs: { value: NotificationCategory; label: string; icon: typeof Bell }[] = [
    { value: 'all', label: t('notif.all'), icon: Bell },
    { value: 'chat', label: 'Chat', icon: MessageCircleIcon },
    { value: 'social', label: 'Social', icon: UserPlus },
    { value: 'orders', label: t('notif.orders'), icon: Package },
    { value: 'promos', label: t('notif.promos'), icon: Gift },
    { value: 'support', label: t('notif.support'), icon: Headphones },
    { value: 'delays', label: t('notif.delays'), icon: Clock },
  ];
  const notificationTitle = t('notif.title') || 'Notifications';

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="zivo-shell-mobile bg-background relative overflow-hidden safe-area-bottom">
      <SEOHead title="Notifications – ZIVO" description="View your travel alerts, order updates, and promotional offers." noIndex={true} />

      {/* ── Background ── */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--muted)/0.45),transparent_260px)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/[0.04] to-transparent" />
      </div>

      {/* ── Scrollable Content ── */}
      <div className="relative z-10 min-h-screen overflow-y-auto pb-24 scroll-smooth no-scrollbar">
        <div className="mx-auto max-w-2xl space-y-3.5 px-4 pt-[76px] lg:pt-[78px]">
          {/* ── Page Header ── */}
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-foreground transition-colors hover:bg-muted"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h1 className="block min-w-[8rem] text-xl font-bold tracking-tight text-ig-gradient sm:text-2xl">
                      {notificationTitle}
                    </h1>
                    {categoryCounts.all > 0 && (
                      <Badge className="h-5 min-w-[22px] rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                        {categoryCounts.all > 99 ? '99+' : categoryCounts.all}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 block text-xs font-medium text-muted-foreground">
                    {categoryCounts.all > 0 ? `${categoryCounts.all} unread updates` : 'All caught up'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => navigate("/account/notifications")}
                  aria-label="Notification settings"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
                {categoryCounts.all > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-xl px-2.5 text-xs font-bold text-primary hover:bg-primary/8 sm:px-3"
                    onClick={handleMarkAllRead}
                  >
                    <CheckCheck className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t('notif.read_all')}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── Category Tab Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 20, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: '1000px' }}
          >
            <GlassCard3D className="sticky top-[66px] z-30 lg:top-[66px]">
              <div className="flex gap-1.5 overflow-x-auto p-1.5 no-scrollbar">
                {tabs.map(tab => {
                  const isActive = activeTab === tab.value;
                  return (
                    <motion.button
                      key={tab.value}
                      whileHover={{ scale: 1.05, y: -1 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        "relative flex min-w-[4.9rem] items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold transition-colors touch-manipulation",
                        isActive 
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="truncate">{tab.label}</span>
                      {categoryCounts[tab.value] > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <Badge 
                            className={cn(
                              "absolute -right-0.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-0 px-1 text-[9px] shadow-sm",
                              tab.value === 'delays' 
                                ? "bg-destructive text-destructive-foreground shadow-destructive/30" 
                                : isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-primary text-primary-foreground shadow-primary/30"
                            )}
                          >
                            {categoryCounts[tab.value] > 9 ? '9+' : categoryCounts[tab.value]}
                          </Badge>
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </GlassCard3D>
          </motion.div>

          {notifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-3 gap-2"
            >
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="rounded-2xl border border-border/55 bg-card px-3 py-2.5 text-left shadow-sm active:scale-[0.98]"
              >
                <CheckCheck className="mb-1 h-4 w-4 text-primary" />
                <p className="text-[11px] font-bold leading-tight">Mark all</p>
                <p className="text-[9px] text-muted-foreground">Read</p>
              </button>
              <button
                type="button"
                onClick={handleClearRead}
                className="rounded-2xl border border-border/55 bg-card px-3 py-2.5 text-left shadow-sm active:scale-[0.98]"
              >
                <Trash2 className="mb-1 h-4 w-4 text-destructive" />
                <p className="text-[11px] font-bold leading-tight">Clear read</p>
                <p className="text-[9px] text-muted-foreground">Delete old</p>
              </button>
              <button
                type="button"
                onClick={() => navigate("/account/notifications")}
                className="rounded-2xl border border-border/55 bg-card px-3 py-2.5 text-left shadow-sm active:scale-[0.98]"
              >
                <Settings2 className="mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-[11px] font-bold leading-tight">Rules</p>
                <p className="text-[9px] text-muted-foreground">Controls</p>
              </button>
            </motion.div>
          )}

          {filteredNotifications.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold text-muted-foreground">
                Swipe right to mark read · swipe left to delete
              </p>
              <span className="text-[11px] font-bold text-foreground">{filteredNotifications.length}</span>
            </div>
          )}

          {/* ── Friend Requests Section (shown on 'all' and 'social' tabs) ── */}
          {(activeTab === 'all' || activeTab === 'social') && friendRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                Friend Requests
                <Badge className="bg-blue-500 text-white text-[9px] h-4 px-1.5 border-0">
                  {friendRequests.length}
                </Badge>
              </p>
              <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {friendRequests.map((req) => (
                    <FriendRequestCard
                      key={req.id}
                      request={req}
                      onAccept={() => handleAcceptFriend(req)}
                      onDecline={() => handleDeclineFriend(req)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {hasNotificationsRefreshError && (
            <DegradedDataBanner
              className="py-1"
              message="Showing cached notifications. Refresh failed."
              onRetry={() => void handlePullRefresh()}
              trackingContext="notifications"
            />
          )}

          {shouldShowNotificationsRecovery && (
            <LoadFailureCard
              className="px-0 py-2"
              title="Notifications refresh failed"
              description="We couldn&apos;t load your latest notifications right now. Retry to reconnect and restore updates."
              onRetry={() => void handlePullRefresh()}
              onSecondary={() => navigate('/feed')}
              secondaryLabel="Go Feed"
              trackingContext="notifications"
            />
          )}

          {/* ── Notification List ── */}
          {(activeTab !== 'social' || filteredNotifications.length > 0) && (
            <>
              {isLoading && !shouldShowNotificationsRecovery ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="relative rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-card/50 backdrop-blur-xl" />
                        <div className="relative h-20 animate-pulse" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : activeTab !== 'social' && filteredNotifications.length === 0 && friendRequests.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 30, rotateX: 8 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ perspective: '800px' }}
                >
                  <GlassCard3D className="shadow-xl">
                    <div className="p-10 text-center">
                      {getEmptyIcon(activeTab)}
                      <h3 className="font-bold text-base mb-1">All caught up</h3>
                      <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                        {getEmptyMessage(activeTab)}
                      </p>
                    </div>
                  </GlassCard3D>
                </motion.div>
              ) : filteredNotifications.length > 0 ? (
                <div className="space-y-2.5">
                  <AnimatePresence mode="popLayout">
                    {filteredNotifications.map((notification, i) => (
                      <SwipeableNotificationRow
                        key={notification.id}
                        notification={notification}
                        index={i}
                        onMarkAsRead={() => void markAsRead([notification.id])}
                        onDelete={() => handleDeleteNotification(notification.id)}
                        onClick={() => handleNotificationClick(notification)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : null}
            </>
          )}

          {/* Social Notifications (likes, comments, shares, follows) */}
          {(activeTab === 'all' || activeTab === 'social') && socialNotifs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {activeTab === 'social' && (
                <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-red-500" />
                  Activity
                </p>
              )}
              <div className="space-y-2">
                {socialNotifs.map((sn, i) => (
                  <SocialNotifItem
                    key={sn.id}
                    notif={sn}
                    index={i}
                    onClick={() => {
                      if (!sn.is_read) markSocialRead([sn.id]);
                      if (sn.entity_type === 'post' && sn.entity_id) navigate(`/feed`);
                      else if (sn.entity_type === 'user' && sn.entity_id) navigate(`/u/${sn.entity_id}`);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Social tab empty state — only when ALL three social sources are empty:
              friend requests, legacy socialNotifs, and the trigger-generated
              social_* notifications surfaced via filteredNotifications. */}
          {activeTab === 'social' && friendRequests.length === 0 && socialNotifs.length === 0 && filteredNotifications.length === 0 && !loadingFR && (
            <motion.div
              initial={{ opacity: 0, y: 30, rotateX: 8 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ perspective: '800px' }}
            >
              <GlassCard3D className="shadow-xl">
                <div className="p-10 text-center">
                  {getEmptyIcon('social')}
                  <h3 className="font-bold text-base mb-1">No activity yet</h3>
                  <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                    When people like, comment, or share your posts, you'll see it here.
                  </p>
                </div>
              </GlassCard3D>
            </motion.div>
          )}

          {/* ── Weekly Summary (3D Glass) ── */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotateX: 8 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: '800px' }}
          >
            <GlassCard3D glow className="shadow-xl shadow-primary/[0.06] group">
              <div className="p-4">
                <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-primary" /> This Week's Summary
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(() => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    const thisWeek = notifications.filter(n => new Date(n.created_at) >= weekAgo);
                    return [
                      { label: "This week", value: String(thisWeek.length), icon: Bell },
                      { label: "Unread", value: String(unreadCount), icon: CheckCheck },
                      { label: "Actions", value: String(thisWeek.filter(n => n.action_url).length), icon: ArrowLeft },
                    ];
                  })().map(s => {
                    const SummaryIcon = s.icon;
                    return (
                      <motion.div
                        key={s.label}
                        whileHover={{ scale: 1.03, y: -1 }}
                        className="rounded-xl border border-border/40 bg-muted/25 p-3 text-center"
                      >
                        <SummaryIcon className={cn("mx-auto mb-1 h-4 w-4 text-primary", s.label === "Actions" && "rotate-180")} />
                        <p className="text-base font-bold text-foreground">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </GlassCard3D>
          </motion.div>

          {/* ── Manage notifications CTA (replaces fake toggles) ── */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotateX: 8 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: '800px' }}
            className="pb-4"
          >
            <GlassCard3D className="shadow-xl">
              <button type="button"
                onClick={() => navigate("/account/notifications")}
                className="w-full p-4 text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">Manage notifications</p>
                  <p className="text-[11px] text-muted-foreground">Choose what you get notified about and how</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-muted-foreground/60 rotate-180 shrink-0" />
              </button>
            </GlassCard3D>
          </motion.div>
        </div>
      </div>

      <MobileBottomNav />
    </PullToRefresh>
  );
};

export default NotificationsPage;
