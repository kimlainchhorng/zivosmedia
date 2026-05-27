/**
 * SendTestDialog — quick test-send for a specific marketing channel to the operator's account.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  channel: "push" | "email" | "sms" | "inapp";
}

const CHANNEL_LABELS = {
  push: "Push notification",
  email: "Email",
  sms: "SMS",
  inapp: "In-app banner",
};

export default function SendTestDialog({ open, onClose, storeId, channel }: Props) {
  const [title, setTitle] = useState(`[TEST] ${CHANNEL_LABELS[channel]}`);
  const [body, setBody] = useState("This is a test message from your store.");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Create ephemeral test campaign and immediately invoke the send fn in test mode
      const channelFlags = {
        push_enabled: channel === "push" || channel === "inapp",
        email_enabled: channel === "email",
        sms_enabled: channel === "sms",
      };

      const { data: campaign, error: campErr } = await supabase
        .from("marketing_campaigns")
        .insert({
          name: `Test ${channel} ${new Date().toISOString()}`,
          campaign_type: "test",
          target_restaurant_id: storeId,
          notification_title: title,
          notification_body: body,
          message: body,
          sms_message: channel === "sms" ? body : null,
          ...channelFlags,
          status: "draft",
          created_by: userId,
        })
        .select("id")
        .single();
      if (campErr) throw campErr;

      const { error: invokeErr } = await supabase.functions.invoke(
        "send-marketing-campaign",
        {
          body: {
            campaign_id: campaign.id,
            is_test: true,
            test_recipient_user_id: userId,
          },
        }
      );
      if (invokeErr) throw invokeErr;

      toast.success("Test sent to your account");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to send test");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send test {CHANNEL_LABELS[channel]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {(channel === "push" || channel === "email" || channel === "inapp") && (
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 h-9"
              />
            </div>
          )}
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="mt-1"
            />
            {channel === "sms" && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {body.length}/160 chars · {Math.ceil(body.length / 160)} segment
                {Math.ceil(body.length / 160) === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Test will be delivered only to your own account.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !body.trim()}>
            {sending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
