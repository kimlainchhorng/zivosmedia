import { useEffect, useRef, useState, type FormEvent } from "react";
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

const HANDLE_RE = /^[a-z][a-z0-9_]{2,31}$/;

function sanitizeHandle(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export default function NewChannelPage() {
  const nav = useNavigate();
  const goBack = useSmartBack("/channels");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [userHasEditedHandle, setUserHasEditedHandle] = useState(false);
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const availabilityRequestRef = useRef(0);

  useEffect(() => {
    if (!userHasEditedHandle && name.trim()) {
      setHandle(sanitizeHandle(name.trim()));
    }
  }, [name, userHasEditedHandle]);

  useEffect(() => {
    const nextHandle = handle.trim();
    if (!nextHandle || !HANDLE_RE.test(nextHandle)) {
      setAvailable(null);
      return;
    }

    const requestId = availabilityRequestRef.current + 1;
    availabilityRequestRef.current = requestId;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase
        .from("channels")
        .select("id")
        .eq("handle", nextHandle)
        .maybeSingle();

      if (availabilityRequestRef.current === requestId) {
        setAvailable(!data);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [handle]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let finalHandle = handle.trim();
    if (!finalHandle && name.trim()) {
      finalHandle = sanitizeHandle(name.trim());
      setHandle(finalHandle);
    }

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!HANDLE_RE.test(finalHandle)) {
      toast.error("Handle must be 3-32 characters, start with a letter, and use only lowercase letters, numbers, or underscores");
      return;
    }

    if (available === false) {
      toast.error("Handle is taken");
      return;
    }

    setSubmitting(true);

    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("handle", finalHandle)
      .maybeSingle();

    if (existing) {
      setAvailable(false);
      toast.error("Handle was just taken");
      setSubmitting(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Sign in required");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.rpc("channel_create" as any, {
      p_name: name.trim(),
      p_handle: finalHandle,
      p_description: desc.trim(),
      p_is_public: isPublic,
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const created = data as { handle?: string } | null;
    toast.success("Channel created");
    nav(`/c/${created?.handle ?? finalHandle}`);
  };

  const handleValid = HANDLE_RE.test(handle);
  const nameValid = name.trim().length > 0;
  const canSubmit = nameValid && handleValid && available !== false && !submitting;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
        <button
          type="button"
          onClick={goBack}
          className="p-1.5 rounded-full hover:bg-muted/60 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">New channel</h1>
      </header>
      <div className="mx-auto max-w-lg p-4">
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div>
            <Label htmlFor="channel-name">Name</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My channel"
              maxLength={100}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <Label htmlFor="channel-handle">Handle</Label>
            <div className="relative">
              <Input
                id="channel-handle"
                value={handle}
                onChange={(event) => {
                  setHandle(sanitizeHandle(event.target.value));
                  setUserHasEditedHandle(true);
                }}
                placeholder="myhandle"
                maxLength={32}
                aria-invalid={handle.length > 0 && !handleValid}
                aria-describedby="channel-handle-help channel-handle-status"
                autoComplete="off"
              />
              <span id="channel-handle-status" className="absolute right-3 top-2.5" aria-live="polite">
                {available === true && <Check className="h-4 w-4 text-green-500" aria-label="Handle available" />}
                {available === false && <X className="h-4 w-4 text-destructive" aria-label="Handle taken" />}
              </span>
            </div>
            <p id="channel-handle-help" className="mt-1 text-xs text-muted-foreground">
              @{handle || "yourhandle"} - 3-32 characters, starts with a letter
            </p>
          </div>

          <div>
            <Label htmlFor="channel-description">Description</Label>
            <Textarea
              id="channel-description"
              value={desc}
              onChange={(event) => setDesc(event.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="channel-public">Public</Label>
              <p className="text-xs text-muted-foreground">Anyone can find and view</p>
            </div>
            <Switch id="channel-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <Button type="submit" disabled={!canSubmit} aria-busy={submitting} className="w-full">
            {submitting ? "Creating..." : "Create channel"}
          </Button>
        </form>
      </div>
    </div>
  );
}
