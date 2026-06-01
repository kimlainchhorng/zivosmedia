import { Package, Gift, Headphones, Clock, User, ChevronRight, Heart, Repeat2, MessageCircle, AtSign, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  user_id: string | null;
  order_id: string | null;
  channel: 'email' | 'in_app' | 'sms';
  category: 'transactional' | 'account' | 'operational' | 'marketing' | 'order' | 'social';
  template: string;
  title: string;
  body: string;
  action_url: string | null;
  status: 'queued' | 'sent' | 'failed' | 'read';
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, any>;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: () => void;
  onClick: () => void;
}

const formatMoneyInText = (value: string) =>
  value.replace(/\$([0-9]+(?:\.[0-9]+)?)/g, (_match, raw: string) => {
    const amount = Number(raw);
    if (!Number.isFinite(amount)) return `$${raw}`;
    return amount.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  });

const NotificationItem = ({ notification, onMarkAsRead, onClick }: NotificationItemProps) => {
  const isDelay = notification.template?.toLowerCase().includes('delay') || 
                  notification.title?.toLowerCase().includes('delay');

  const getCategoryConfig = () => {
    if (isDelay) {
      return {
        icon: Clock,
        label: 'Delay',
        badgeClass: 'bg-destructive/15 text-destructive border-destructive/20',
        iconBg: 'from-destructive/20 to-destructive/10',
        iconColor: 'text-destructive',
      };
    }
    // Trigger-generated social notifications get topic-specific icons + colors,
    // not the generic transactional Package box.
    switch (notification.template) {
      case 'social_reaction':
        return {
          icon: Heart,
          label: 'Reaction',
          badgeClass: 'bg-rose-500/12 text-rose-600 border-rose-500/20',
          iconBg: 'from-rose-500/20 to-rose-500/10',
          iconColor: 'text-rose-500',
        };
      case 'social_repost':
        return {
          icon: Repeat2,
          label: 'Repost',
          badgeClass: 'bg-emerald-500/12 text-emerald-600 border-emerald-500/20',
          iconBg: 'from-emerald-500/20 to-emerald-500/10',
          iconColor: 'text-emerald-500',
        };
      case 'social_comment':
        return {
          icon: MessageCircle,
          label: 'Comment',
          badgeClass: 'bg-blue-500/12 text-blue-600 border-blue-500/20',
          iconBg: 'from-blue-500/20 to-blue-500/10',
          iconColor: 'text-blue-500',
        };
      case 'social_mention':
        return {
          icon: AtSign,
          label: 'Mention',
          badgeClass: 'bg-violet-500/12 text-violet-600 border-violet-500/20',
          iconBg: 'from-violet-500/20 to-violet-500/10',
          iconColor: 'text-violet-500',
        };
    }
    switch (notification.category) {
      case 'transactional':
      case 'order':
        return {
          icon: Package,
          label: 'Order',
          badgeClass: 'bg-primary/12 text-primary border-primary/20',
          iconBg: 'from-primary/20 to-primary/10',
          iconColor: 'text-primary',
        };
      case 'social':
        return {
          icon: MessageCircle,
          label: 'Social',
          badgeClass: 'bg-blue-500/12 text-blue-600 border-blue-500/20',
          iconBg: 'from-blue-500/20 to-blue-500/10',
          iconColor: 'text-blue-500',
        };
      case 'marketing':
        return {
          icon: Gift,
          label: 'Promo',
          badgeClass: 'bg-emerald-500/12 text-emerald-600 border-emerald-500/20',
          iconBg: 'from-emerald-500/20 to-emerald-500/10',
          iconColor: 'text-emerald-500',
        };
      case 'operational':
        return {
          icon: Headphones,
          label: 'Support',
          badgeClass: 'bg-amber-500/12 text-amber-600 border-amber-500/20',
          iconBg: 'from-amber-500/20 to-amber-500/10',
          iconColor: 'text-amber-500',
        };
      case 'account':
        return {
          icon: User,
          label: 'Account',
          badgeClass: 'bg-blue-500/12 text-blue-600 border-blue-500/20',
          iconBg: 'from-blue-500/20 to-blue-500/10',
          iconColor: 'text-blue-500',
        };
      default:
        return {
          icon: Package,
          label: notification.category,
          badgeClass: 'bg-muted text-muted-foreground border-border/20',
          iconBg: 'from-muted/30 to-muted/20',
          iconColor: 'text-muted-foreground',
        };
    }
  };

  const config = getCategoryConfig();
  const Icon = config.icon;
  const rawTitle = notification.title?.trim() || "";
  const rawBody = formatMoneyInText(notification.body?.trim() || "");
  const looksLikePersonOnly = /^[\p{L}\s'.-]{2,40}$/u.test(rawTitle) && !/\b(commented|liked|driver|order|request|accepted|follow|mention|delay|promo|support)\b/i.test(rawTitle);
  const title = !rawTitle || (config.label === 'Order' && looksLikePersonOnly)
    ? `${config.label} activity`
    : rawTitle;
  const body = !rawBody || /^hi[!.]?$/i.test(rawBody) || rawBody.length < 3
    ? `Open to view the latest ${config.label.toLowerCase()} details.`
    : rawBody;

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group relative w-full overflow-hidden rounded-[1.15rem] border bg-card/95 px-3 py-2.5 text-left shadow-[0_1px_2px_hsl(var(--foreground)/0.05),0_10px_28px_hsl(var(--foreground)/0.04)] transition-colors hover:bg-muted/20",
        notification.is_read
          ? "border-border/55"
          : "border-primary/18 bg-primary/[0.018]"
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {!notification.is_read && (
        <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-primary/70" aria-hidden="true" />
      )}
      <div className="flex items-start gap-2.5">
        <div className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 ring-1 ring-border/50",
          notification.is_read ? "opacity-75" : "bg-primary/8 ring-primary/15"
        )}>
          <Icon className={cn("h-4 w-4", config.iconColor)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex min-w-0 items-center gap-2">
            <Badge
              variant="secondary"
              className={cn("h-4 rounded-full border px-1.5 text-[9px] font-semibold", config.badgeClass)}
            >
              {config.label}
            </Badge>
            <span className="ml-auto shrink-0 text-[11px] font-medium text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </span>
          </div>

          <h4 className={cn(
            "line-clamp-1 text-[14px] leading-snug",
            notification.is_read ? "font-semibold text-foreground/75" : "font-semibold text-foreground"
          )}>
            {title}
          </h4>

          <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-muted-foreground">
            {body}
          </p>
          {!notification.is_read && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead();
              }}
              className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/75 ring-1 ring-border/45 transition-colors active:scale-95"
            >
              <CheckCheck className="h-3 w-3 text-primary" />
              Mark read
            </button>
          )}
        </div>

        <div className="mt-3 flex h-5 w-5 shrink-0 items-center justify-center">
          {!notification.is_read && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
          )}
          {notification.is_read && notification.action_url && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/45 transition-transform group-hover:translate-x-0.5" />
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
