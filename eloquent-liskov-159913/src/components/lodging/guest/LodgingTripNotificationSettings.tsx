import { Bell, Loader2, MessageSquareText, PhoneOff } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useNotificationPreferences, useUpdateNotificationPreferences, useUserProfile } from "@/hooks/useNotificationPreferences";
import { useLodgingNotificationAudit } from "@/hooks/lodging/useLodgingNotificationAudit";
import { toast } from "sonner";

interface Props { reservationId: string; }

export default function LodgingTripNotificationSettings({ reservationId }: Props) {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const { data: profile } = useUserProfile();
  const updatePrefs = useUpdateNotificationPreferences();
  const { data: audit = [] } = useLodgingNotificationAudit(reservationId, "sms");
  const latest = audit[0];
  const phone = prefs?.phoneNumber || profile?.phone_e164 || profile?.phone || null;
  const verified = Boolean(prefs?.phoneVerified || profile?.phone_verified);
  const disabled = updatePrefs.isPending || !phone || !verified;

  const toggleSms = (checked: boolean) => {
    updatePrefs.mutate(
      { smsEnabled: checked, smsConsentAt: checked ? new Date().toISOString() : undefined },
      { onSuccess: () => toast.success(checked ? "SMS trip updates enabled" : "SMS trip updates disabled") },
    );
  };

  return (
    <Card id="trip-notifications" className="scroll-mt-24">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> Trip updates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="min-w-0 flex items-start gap-2">
            {phone ? <MessageSquareText className="mt-0.5 h-4 w-4 text-primary" /> : <PhoneOff className="mt-0.5 h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-sm font-semibold">SMS lodging updates</p>
              <p className="text-xs text-muted-foreground">{!phone ? "Phone missing" : !verified ? "Phone not verified" : prefs?.smsEnabled ? "SMS enabled" : "SMS disabled"}</p>
            </div>
          </div>
          {isLoading || updatePrefs.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Switch checked={Boolean(prefs?.smsEnabled)} onCheckedChange={toggleSms} disabled={disabled} />}
        </div>
        <div className="rounded-lg border bg-background p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">Latest delivery</span>
            <Badge variant={latest?.status === "failed" ? "destructive" : latest?.status === "sent" || latest?.status === "queued" ? "default" : "secondary"} className="capitalize">
              {latest?.status || "No SMS yet"}
            </Badge>
          </div>
          {latest ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {String(latest.event_type || "trip update").replace(/_/g, " ")} · {format(parseISO(latest.created_at), "MMM d, yyyy h:mm a")}{latest.skip_reason ? ` · ${latest.skip_reason.replace(/_/g, " ")}` : ""}{latest.error ? ` · ${latest.error}` : ""}
            </p>
          ) : <p className="mt-1 text-xs text-muted-foreground">Delivery status will appear after the next lodging trip notification.</p>}
        </div>
      </CardContent>
    </Card>
  );
}