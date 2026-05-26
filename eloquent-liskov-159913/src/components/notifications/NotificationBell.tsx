/**
 * Notification Bell — header dropdown.
 * Reads from `notifications` (in_app channel). Realtime + optimistic mark-read
 * is handled inside useNotifications.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  MessageCircle,
  Heart,
  UserPlus,
  MessageSquare,
  Car,
  UtensilsCrossed,
  Hotel,
  Plane,
  ShoppingBag,
  Wallet,
  Gift,
  Megaphone,
  Sparkles,
  AtSign,
  Trash2,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem as DropdownItem,
  DropdownMenu as InnerDropdown,
  DropdownMenuTrigger as InnerDropdownTrigger,
  DropdownMenuContent as InnerDropdownContent,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { useWebPush } from '@/hooks/useWebPush';
import { Capacitor } from '@capacitor/core';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type Notif = {
  id: string;
  template: string;
  title: string;
  body: string;
  category: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

const ICONS: Record<string, { icon: any; tone: string }> = {
  chat_message:               { icon: MessageCircle,     tone: 'from-sky-500/20 to-sky-400/5 text-sky-500' },
  bot_reply:                  { icon: Sparkles,          tone: 'from-violet-500/20 to-violet-400/5 text-violet-500' },
  social_like:                { icon: Heart,             tone: 'from-rose-500/20 to-pink-400/5 text-rose-500' },
  social_comment:             { icon: MessageSquare,     tone: 'from-amber-500/20 to-orange-400/5 text-amber-500' },
  social_follow:              { icon: UserPlus,          tone: 'from-emerald-500/20 to-teal-400/5 text-emerald-500' },
  social_mention:             { icon: AtSign,            tone: 'from-blue-500/20 to-indigo-400/5 text-blue-500' },
  ride_:                      { icon: Car,               tone: 'from-indigo-500/20 to-blue-400/5 text-indigo-500' },
  eats_order_:                { icon: UtensilsCrossed,   tone: 'from-orange-500/20 to-red-400/5 text-orange-500' },
  lodge_booking_:             { icon: Hotel,             tone: 'from-fuchsia-500/20 to-pink-400/5 text-fuchsia-500' },
  flight_booking_:            { icon: Plane,             tone: 'from-cyan-500/20 to-sky-400/5 text-cyan-500' },
  marketplace_order_:         { icon: ShoppingBag,       tone: 'from-yellow-500/20 to-amber-400/5 text-yellow-600' },
  wallet_received:            { icon: Wallet,            tone: 'from-emerald-500/20 to-green-400/5 text-emerald-500' },
  creator_tip_received:       { icon: Gift,              tone: 'from-pink-500/20 to-rose-400/5 text-pink-500' },
  creator_new_subscriber:     { icon: Sparkles,          tone: 'from-violet-500/20 to-fuchsia-400/5 text-violet-500' },
  channel_post:               { icon: Megaphone,         tone: 'from-blue-500/20 to-indigo-400/5 text-blue-500' },
};

function pickIcon(template: string): { icon: any; tone: string } {
  if (ICONS[template]) return ICONS[template];
  for (const key of Object.keys(ICONS)) {
    if (key.endsWith('_') && template.startsWith(key)) return ICONS[key];
  }
  return { icon: Bell, tone: 'from-muted/40 to-muted/10 text-muted-foreground' };
}

function groupByDay(items: Notif[]) {
  const today: Notif[] = [];
  const earlier: Notif[] = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  for (const n of items) {
    if (new Date(n.created_at) >= startOfToday) today.push(n);
    else earlier.push(n);
  }
  return { today, earlier };
}

const FILTERS: { id: 'all' | 'social' | 'orders' | 'chat'; label: string }[] = [
  { id: 'all',    label: 'All' },
  { id: 'chat',   label: 'Chat' },
  { id: 'social', label: 'Social' },
  { id: 'orders', label: 'Orders' },
];

function passesFilter(n: Notif, f: typeof FILTERS[number]['id']): boolean {
  if (f === 'all') return true;
  if (f === 'chat') return n.template === 'chat_message' || n.template === 'bot_reply';
  if (f === 'social') return n.category === 'social' || n.template.startsWith('social_') || n.template === 'channel_post';
  if (f === 'orders') {
    return (
      n.template.startsWith('ride_') ||
      n.template.startsWith('eats_order_') ||
      n.template.startsWith('lodge_booking_') ||
      n.template.startsWith('flight_booking_') ||
      n.template.startsWith('marketplace_order_') ||
      n.template === 'wallet_received' ||
      n.template === 'creator_tip_received'
    );
  }
  return true;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<typeof FILTERS[number]['id']>('all');
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    clearAll,
    snoozeNotification,
  } = useNotifications(30);

  // Web push enable prompt — only on web (Capacitor handles native).
  const isNative = Capacitor.isNativePlatform();
  const webPush = useWebPush();
  const showEnablePrompt =
    !isNative &&
    webPush.isSupported &&
    (webPush.permission === 'default' ||
      (webPush.permission === 'granted' && !webPush.subscription));

  // Pulse the bell when unreadCount goes UP (new notification arrived).
  // Skip the very first render so we don't pulse on app boot.
  const prevUnreadRef = useRef<number | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    const prev = prevUnreadRef.current;
    if (prev !== null && unreadCount > prev) {
      setPulseKey((k) => k + 1);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const filtered = useMemo(
    () => (notifications as unknown as Notif[]).filter((n) => passesFilter(n, filter)),
    [notifications, filter],
  );
  const { today, earlier } = useMemo(() => groupByDay(filtered), [filtered]);

  const handleClick = (n: Notif) => {
    if (!n.is_read) markAsRead([n.id]);
    if (n.action_url) {
      let url = n.action_url;
      const dispatchMatch = url.match(/^\/dispatch\/support\/(.+)$/);
      if (dispatchMatch) url = `/support/tickets/${dispatchMatch[1]}`;
      if (url.startsWith('/')) navigate(url);
      else import('@/lib/openExternalUrl').then(({ openExternalUrl }) => openExternalUrl(url));
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        >
          <motion.span
            key={pulseKey}
            animate={
              pulseKey > 0
                ? { rotate: [0, -14, 12, -10, 8, -5, 0] }
                : { rotate: 0 }
            }
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            style={{ display: 'inline-flex', transformOrigin: '50% 10%' }}
          >
            <Bell className="h-5 w-5" />
          </motion.span>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-[5px] text-[10px] font-bold text-white shadow-lg shadow-rose-500/40 ring-2 ring-background"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[360px] md:w-[420px] p-0 overflow-hidden border-border/60 shadow-2xl rounded-2xl"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-primary/8 via-background to-background border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-sm tracking-tight">Notifications</h3>
              <p className="text-[11px] text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsRead();
                }}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all
              </Button>
            )}
          </div>

          {showEnablePrompt && (
            <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2.5">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-400/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold leading-tight">Push is off</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  Get instant alerts in your browser.
                </p>
              </div>
              <Button
                size="sm"
                className="h-7 text-[11px] px-2.5 shrink-0"
                disabled={webPush.isLoading}
                onClick={(e) => {
                  e.preventDefault();
                  webPush.subscribe();
                }}
              >
                {webPush.isLoading ? '…' : 'Enable'}
              </Button>
            </div>
          )}

          {/* Filter chips */}
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'h-7 px-3 rounded-full text-[11px] font-medium transition-all',
                  filter === f.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="h-[420px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
                <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-primary/70" />
                </div>
              </div>
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                We’ll let you know when something arrives.
              </p>
            </div>
          ) : (
            <div className="px-2 py-2">
              {today.length > 0 && (
                <Section
                  label="Today"
                  items={today}
                  onClick={handleClick}
                  onDelete={(id) => deleteNotifications([id])}
                  onSnooze={(id, ms) => snoozeNotification(id, ms)}
                />
              )}
              {earlier.length > 0 && (
                <Section
                  label="Earlier"
                  items={earlier}
                  onClick={handleClick}
                  onDelete={(id) => deleteNotifications([id])}
                  onSnooze={(id, ms) => snoozeNotification(id, ms)}
                />
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border/50 p-1.5 bg-muted/20 flex gap-1">
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
              onClick={(e) => {
                e.preventDefault();
                clearAll();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            className="flex-1 h-9 text-xs justify-center gap-1.5 hover:bg-background"
            onClick={() => {
              navigate('/notifications');
              setOpen(false);
            }}
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Section({
  label,
  items,
  onClick,
  onDelete,
  onSnooze,
}: {
  label: string;
  items: Notif[];
  onClick: (n: Notif) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string, durationMs: number) => void;
}) {
  return (
    <div className="mb-2">
      <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <div className="flex flex-col">
        {items.map((n, idx) => (
          <NotifRow
            key={n.id}
            n={n}
            onClick={onClick}
            onDelete={onDelete}
            onSnooze={onSnooze}
            delay={idx * 0.02}
          />
        ))}
      </div>
    </div>
  );
}

const SNOOZE_OPTIONS: { label: string; ms: number }[] = [
  { label: '1 hour',     ms: 1 * 60 * 60 * 1000 },
  { label: '4 hours',    ms: 4 * 60 * 60 * 1000 },
  { label: 'Tomorrow',   ms: 24 * 60 * 60 * 1000 },
  { label: 'Next week',  ms: 7 * 24 * 60 * 60 * 1000 },
];

function NotifRow({
  n,
  onClick,
  onDelete,
  onSnooze,
  delay,
}: {
  n: Notif;
  onClick: (n: Notif) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string, durationMs: number) => void;
  delay: number;
}) {
  const { icon: Icon, tone } = pickIcon(n.template);
  return (
    <motion.button
      type="button"
      onClick={() => onClick(n)}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.18 }}
      className={cn(
        'group relative w-full flex gap-3 items-start text-left rounded-xl px-3 py-3 transition-all',
        'hover:bg-muted/60',
        !n.is_read && 'bg-primary/[0.04]',
      )}
    >
      {!n.is_read && (
        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-primary to-primary/60" />
      )}

      <div
        className={cn(
          'shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center ring-1 ring-border/50',
          tone,
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-[13px] leading-snug line-clamp-1',
              n.is_read ? 'font-medium text-foreground/90' : 'font-semibold text-foreground',
            )}
          >
            {n.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {!n.is_read && (
              <span className="h-2 w-2 mt-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]" />
            )}
            <InnerDropdown>
              <InnerDropdownTrigger asChild>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  aria-label="More options"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </span>
              </InnerDropdownTrigger>
              <InnerDropdownContent
                align="end"
                onClick={(e) => e.stopPropagation()}
                className="w-44"
              >
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs">
                    <Clock className="h-3.5 w-3.5 mr-2" /> Snooze
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-36">
                    {SNOOZE_OPTIONS.map((o) => (
                      <DropdownItem
                        key={o.label}
                        className="text-xs cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSnooze(n.id, o.ms);
                        }}
                      >
                        {o.label}
                      </DropdownItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownItem
                  className="text-xs text-destructive focus:text-destructive cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(n.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownItem>
              </InnerDropdownContent>
            </InnerDropdown>
          </div>
        </div>
        {n.body && (
          <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">
            {n.body}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
    </motion.button>
  );
}

export default NotificationBell;
