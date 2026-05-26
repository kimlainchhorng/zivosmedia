import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSmartBack } from "@/lib/smartBack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Check, X, ChevronLeft } from "lucide-react";

export default function NewChannelPage() {
  const nav = useNavigate();
  const goBack = useSmartBack("/channels");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [userHasEditedHandle, setUserHasEditedHandle] = useState(false);

  useEffect(() => {
    if (!userHasEditedHandle && name.trim()) {
      setHandle(name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32));
    }
  }, [name, userHasEditedHandle]);
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!handle.trim()) {
      setAvailable(null);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("channels")
        .select("id")
        .eq("handle", handle.toLowerCase())
        .maybeSingle();
      setAvailable(!data);
    }, 300);
    return () => clearTimeout(t);
  }, [handle]);

  const submit = async () => {
    let finalHandle = handle.trim().toLowerCase();
    if (!finalHandle && name.trim()) {
      finalHandle = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32);
      setHandle(finalHandle);
    }

    if (!name.trim() || !finalHandle) {
      toast.error("Name and handle are required");
      return;
    }
    if (available === false) {
      toast.error("Handle is taken");
      return;
    }
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in required");
      setSubmitting(false);
      return;
    }
    const { data, error } = await supabase
      .from("channels")
      .insert({
        name: name.trim(),
        handle: handle.toLowerCase().trim(),
        description: desc.trim() || null,
        is_public: isPublic,
        owner_id: u.user.id,
      } as any)
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Channel created");
    nav(`/c/${(data as any).handle}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">New channel</h1>
      </header>
      <div className="mx-auto max-w-lg p-4">
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My channel" />
        </div>
        <div>
          <Label>Handle</Label>
          <div className="relative">
            <Input
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase());
                setUserHasEditedHandle(true);
              }}
              placeholder="myhandle"
            />
            {available !== null && (
              <span className="absolute right-3 top-2.5">
                {available ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-destructive" />}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">@{handle || "yourhandle"}</p>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Public</Label>
            <p className="text-xs text-muted-foreground">Anyone can find and view</p>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>
        <Button onClick={submit} disabled={submitting} className="w-full">
          Create channel
        </Button>
      </div>
      </div>
    </div>
  );
}
