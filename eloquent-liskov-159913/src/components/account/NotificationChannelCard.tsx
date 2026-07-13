/**
 * NotificationChannelCard Component
 * Reusable card for notification channel toggles
 */

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface NotificationChannelCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
  verified?: boolean;
  verificationRequired?: boolean;
  onVerify?: () => void;
  verifyLabel?: string;
  children?: ReactNode;
  className?: string;
  rateLimit?: string;
}

export function NotificationChannelCard({
  icon,
  title,
  description,
  enabled,
  onToggle,
  isLoading = false,
  verified,
  verificationRequired = false,
  onVerify,
  verifyLabel = "Verify",
  children,
  className,
  rateLimit,
}: NotificationChannelCardProps) {
  const showVerificationStatus = verificationRequired && verified !== undefined;

  return (
    <Card className={cn("overflow-hidden rounded-2xl border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{title}</h3>
                {showVerificationStatus && (
                  <Badge
                    variant={verified ? "default" : "secondary"}
                    className={cn(
                      "gap-1 text-xs",
                      verified
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    )}
                  >
                    {verified ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Not Verified
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
              {rateLimit && enabled && (
                <p className="text-xs text-muted-foreground mt-1">{rateLimit}</p>
              )}
            </div>
          </div>

          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={isLoading}
          />
        </div>

        {/* Verification Button */}
        {enabled && verificationRequired && !verified && onVerify && (
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={onVerify}
              disabled={isLoading}
              className="rounded-xl active:scale-[0.97] transition-all duration-200 touch-manipulation"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                verifyLabel
              )}
            </Button>
          </div>
        )}

        {/* Additional Content */}
        {children && (
          <div className="mt-3 pt-3 border-t">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
