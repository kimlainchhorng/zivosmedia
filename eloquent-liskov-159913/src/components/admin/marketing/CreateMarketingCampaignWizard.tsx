/**
 * CreateMarketingCampaignWizard — 5-step wizard with live device preview.
 * Persists to marketing_campaigns; "Send now" calls send-marketing-campaign edge fn.
 */
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, MessageSquare, Smartphone, Layers, ChevronRight, ChevronLeft, Check, Send, Users, Calendar, FileText, AlertCircle, Save } from "lucide-react";
import { useMarketingSegments } from "@/hooks/useMarketingSegments";
import SegmentPicker from "./SegmentPicker";
import TemplatePicker from "./TemplatePicker";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Channel = "push" | "email" | "sms" | "inapp" | "multi";
type ScheduleMode = "now" | "once" | "recurring" | "triggered";

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  onCreated?: () => void;
  defaultChannel?: Channel;
}

const CHANNELS: { id: Channel; icon: any; label: string; desc: string }[] = [
  { id: "push", icon: Bell, label: "Push", desc: "Mobile + web push" },
  { id: "email", icon: Mail, label: "Email", desc: "Rich HTML" },
  { id: "sms", icon: MessageSquare, label: "SMS", desc: "160-char text" },
  { id: "inapp", icon: Smartphone, label: "In-app", desc: "Banner / card" },
  { id: "multi", icon: Layers, label: "Multi-channel", desc: "Sequential" },
];

export default function CreateMarketingCampaignWizard({ open, onClose, storeId, onCreated, defaultChannel }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState<Channel>(defaultChannel ?? "push");

  // Apply preselected channel whenever the dialog opens with a new value
  useEffect(() => {
    if (open && defaultChannel) {
      setChannel(defaultChannel);
    }
  }, [open, defaultChannel]);
  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("now");
  const [sendDate, setSendDate] = useState("");
  const [trigger, setTrigger] = useState("cart_abandoned");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: segments } = useMarketingSegments(storeId);

  const reset = () => {
    setStep(1); setChannel("push"); setName(""); setSegmentId(""); setSubject(""); setBody("");
    setDeepLink(""); setScheduleMode("now"); setSendDate(""); setConfirmed(false);
  };

  const close = () => { reset(); onClose(); };

  const next = () => setStep((s) => Math.min(5, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const canNext = () => {
    if (step === 1) return !!channel && !!name.trim();
    if (step === 2) return true;
    if (step === 3) {
      if (channel === "email") return !!subject && !!body;
      return !!body;
    }
    if (step === 4) return scheduleMode === "now" || scheduleMode === "triggered" || !!sendDate;
    return true;
  };

  const handleSubmit = async (asDraft = false) => {
    if (!asDraft && !confirmed) { toast.error("Confirm before sending"); return; }
    setSubmitting(true);
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id ?? null;

      const channelToFlags = (c: Channel) => ({
        push_enabled: c === "push" || c === "inapp" || c === "multi",
        email_enabled: c === "email" || c === "multi",
        sms_enabled: c === "sms" || c === "multi",
      });

      let status: string;
      if (asDraft) status = "draft";
      else if (scheduleMode === "now") status = "sending";
      else if (scheduleMode === "triggered") status = "active";
      else status = "scheduled";

      const payload: any = {
        name: name || `Campaign ${new Date().toLocaleString()}`,
        campaign_type: scheduleMode === "triggered" ? "triggered" : "broadcast",
        target_restaurant_id: storeId,
        target_segment_id: segmentId && segmentId !== "all" ? segmentId : null,
        title: subject || null,
        notification_title: subject || null,
        notification_body: body || null,
        message: body || null,
        sms_message: channel === "sms" || channel === "multi" ? body : null,
        ...channelToFlags(channel),
        status,
        is_recurring: scheduleMode === "recurring",
        recurrence_interval: scheduleMode === "recurring" ? "weekly" : null,
        trigger_type: scheduleMode === "triggered" ? trigger : null,
        trigger_config: scheduleMode === "triggered" ? { trigger } : null,
        start_date: sendDate || null,
        next_run_at: sendDate || null,
        created_by: userId,
      };

      const { data: inserted, error } = await supabase
        .from("marketing_campaigns")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      // Fire send-marketing-campaign edge fn (best-effort) when sending now
      if (status === "sending" && inserted) {
        supabase.functions
          .invoke("send-marketing-campaign", { body: { campaign_id: inserted.id } })
          .catch(() => {/* non-fatal: campaign queued for cron */});
      }

      qc.invalidateQueries({ queryKey: ["store-marketing-overview", storeId] });
      qc.invalidateQueries({ queryKey: ["marketing-campaigns", storeId] });

      toast.success(
        asDraft
          ? "Saved as draft"
          : status === "sending"
          ? "Campaign sending"
          : status === "scheduled"
          ? "Campaign scheduled"
          : "Automation activated"
      );
      onCreated?.();
      close();
    } catch (e: any) {
      toast.error(e.message || "Failed to save campaign");
    } finally {
      setSubmitting(false);
    }
  };

  const smsCost = Math.ceil(body.length / 160) * 0.015 * (segments?.find((s) => s.id === segmentId)?.member_count || 100);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-base">New campaign · Step {step} of 5</DialogTitle>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr,260px] flex-1 min-h-0">
          {/* Form */}
          <div className="p-4 overflow-y-auto" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.15 }}>
                {step === 1 && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Campaign name</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring Sale Push" className="mt-1" />
                    </div>
                    <Label className="text-xs">Channel</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CHANNELS.map((c) => {
                        const I = c.icon;
                        const sel = channel === c.id;
                        return (
                          <button type="button"
                            key={c.id}
                            onClick={() => setChannel(c.id)}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                            }`}
                          >
                            <I className={`w-4 h-4 mb-1 ${sel ? "text-primary" : "text-muted-foreground"}`} />
                            <div className="text-xs font-semibold">{c.label}</div>
                            <div className="text-[10px] text-muted-foreground">{c.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3" aria-live="polite">
                    <SegmentPicker
                      storeId={storeId}
                      value={segmentId && segmentId !== "all" ? segmentId : null}
                      onChange={(v) => setSegmentId(v ?? "all")}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Build new segments in the Audience tab to target by tags, last-order date, total spend, etc.
                    </p>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3" aria-live="polite">
                    <Label className="text-xs flex items-center gap-1"><FileText className="w-3 h-3" /> Content</Label>
                    <details className="rounded-lg border bg-muted/30">
                      <summary className="cursor-pointer text-[11px] px-2.5 py-1.5 font-medium hover:bg-muted/50">
                        Use a template
                      </summary>
                      <div className="p-2.5 border-t">
                        <TemplatePicker
                          storeId={storeId}
                          channel={channel === "multi" ? undefined : channel}
                          onPick={(t) => {
                            if (t.subject) setSubject(t.subject);
                            if (t.body) setBody(t.body);
                            toast.success(`Template "${t.name}" applied`);
                          }}
                        />
                      </div>
                    </details>
                    {channel === "email" && (
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Subject</Label>
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" placeholder="Your spring deal is here" />
                      </div>
                    )}
                    {(channel === "push" || channel === "inapp") && (
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Title</Label>
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" placeholder="Don't miss out!" />
                      </div>
                    )}
                    <div>
                      <Label className="text-[11px] text-muted-foreground">{channel === "sms" ? "Message" : "Body"}</Label>
                      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="mt-1" placeholder="Your message..." maxLength={channel === "sms" ? 160 : 500} />
                      {channel === "sms" && (
                        <div className="text-[10px] text-muted-foreground mt-1 flex justify-between">
                          <span>{body.length} / 160 chars</span>
                          <span>≈ ${smsCost.toFixed(2)} estimated</span>
                        </div>
                      )}
                    </div>
                    {(channel === "push" || channel === "inapp") && (
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Deep link (optional)</Label>
                        <Input value={deepLink} onChange={(e) => setDeepLink(e.target.value)} className="mt-1" placeholder="/products/featured" />
                      </div>
                    )}
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-3">
                    <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Schedule</Label>
                    <RadioGroup value={scheduleMode} onValueChange={(v) => setScheduleMode(v as ScheduleMode)}>
                      {[
                        { v: "now", l: "Send now" },
                        { v: "once", l: "Schedule once" },
                        { v: "recurring", l: "Recurring" },
                        { v: "triggered", l: "Triggered (event-based)" },
                      ].map((o) => (
                        <div key={o.v} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/40 cursor-pointer">
                          <RadioGroupItem value={o.v} id={o.v} />
                          <Label htmlFor={o.v} className="text-sm flex-1 cursor-pointer">{o.l}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {(scheduleMode === "once" || scheduleMode === "recurring") && (
                      <Input type="datetime-local" value={sendDate} onChange={(e) => setSendDate(e.target.value)} />
                    )}
                    {scheduleMode === "triggered" && (
                      <Select value={trigger} onValueChange={setTrigger}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cart_abandoned">Cart abandoned (1h)</SelectItem>
                          <SelectItem value="first_order">First order placed</SelectItem>
                          <SelectItem value="birthday">Customer birthday</SelectItem>
                          <SelectItem value="inactivity_30">Inactive 30+ days</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-3">
                    <div className="rounded-lg border p-3 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Channel</span><span className="font-medium capitalize">{channel}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Audience</span><span className="font-medium">{segments?.find((s) => s.id === segmentId)?.member_count.toLocaleString() || "All"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-medium capitalize">{scheduleMode}</span></div>
                      {channel === "sms" && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Est. cost</span><span className="font-medium">${smsCost.toFixed(2)}</span></div>
                      )}
                    </div>
                    {channel === "email" && body.length < 30 && (
                      <div className="rounded-lg border-amber-300 border bg-amber-50 dark:bg-amber-950/20 p-2 text-[11px] flex gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Short body may trigger spam filters. Consider adding more context.</span>
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Switch checked={confirmed} onCheckedChange={setConfirmed} />
                      I confirm the audience and message are correct.
                    </label>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Live preview */}
          <div className="hidden md:flex flex-col bg-muted/30 border-l p-4 items-center justify-center">
            <div className="w-[200px] h-[400px] rounded-[2rem] border-4 border-foreground/80 bg-background overflow-hidden flex flex-col shadow-xl">
              <div className="h-6 bg-foreground/80" />
              <div className="flex-1 p-2 overflow-hidden">
                <div className="rounded-lg bg-card border p-2 shadow-sm">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-4 h-4 rounded bg-primary/20" />
                    <span className="text-[8px] text-muted-foreground">YOUR STORE · now</span>
                  </div>
                  <div className="text-[10px] font-bold leading-tight">{subject || "Your title"}</div>
                  <div className="text-[9px] text-muted-foreground line-clamp-3 mt-0.5">{body || "Your message preview..."}</div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">Live preview</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-3 border-t bg-muted/20">
          <Button variant="ghost" size="sm" onClick={step === 1 ? close : prev}>
            {step === 1 ? "Cancel" : <><ChevronLeft className="w-4 h-4 mr-1" />Back</>}
          </Button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={() => handleSubmit(true)} disabled={submitting}>
                <Save className="w-4 h-4 mr-1" /> Draft
              </Button>
            )}
            {step < 5 ? (
              <Button size="sm" onClick={next} disabled={!canNext()}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleSubmit(false)} disabled={!confirmed || submitting}>
                {submitting ? "Sending..." : <>{scheduleMode === "now" ? <Send className="w-4 h-4 mr-1" /> : <Check className="w-4 h-4 mr-1" />} {scheduleMode === "now" ? "Send now" : "Schedule"}</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
