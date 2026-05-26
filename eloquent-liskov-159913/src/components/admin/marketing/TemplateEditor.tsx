/**
 * TemplateEditor — Channel-aware template form.
 */
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertTemplate, type MarketingTemplate } from "@/hooks/useMarketingTemplates";

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  template?: MarketingTemplate | null;
}

export default function TemplateEditor({ open, onClose, storeId, template }: Props) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("push");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const upsert = useUpsertTemplate(storeId);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setChannel(template.channel);
      setSubject(template.subject || "");
      setBody(template.body || "");
    } else {
      setName(""); setChannel("push"); setSubject(""); setBody("");
    }
  }, [template, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await upsert.mutateAsync({ id: template?.id, name, channel: channel as any, subject, body });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{template ? "Edit template" : "New template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Welcome push" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="inapp">In-app</SelectItem>
                <SelectItem value="ad">Ad creative</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {channel !== "sms" && (
            <div>
              <Label className="text-xs">Subject / Title</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="mt-1"
              maxLength={channel === "sms" ? 160 : undefined}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Use {`{{first_name}}`}, {`{{order_total}}`} as variables
              {channel === "sms" && ` · ${body.length}/160`}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || upsert.isPending}>
              {upsert.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
