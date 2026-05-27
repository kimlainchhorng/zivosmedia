/**
 * AiCreativeSuite - Merchant Smart Reel Creator
 * 3 photos + vibe + prompt -> AI video placeholder output
 */
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Upload, Sparkles, Film, Image, Wand2, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

type Vibe = "modern" | "luxury" | "fun";

type UploadSlot = {
  id: number;
  label: string;
  imageUrl: string | null;
};

const VIBES: { id: Vibe; label: string; description: string; accent: string }[] = [
  { id: "modern", label: "Modern", description: "Clean, crisp, editorial product focus", accent: "from-sky-500 to-cyan-500" },
  { id: "luxury", label: "Luxury", description: "Elegant motion, premium highlights", accent: "from-amber-500 to-yellow-500" },
  { id: "fun", label: "Fun", description: "Colorful, playful, social-first vibe", accent: "from-pink-500 to-orange-500" },
];

const DEFAULT_PROMPTS: Record<Vibe, string> = {
  modern: "Showcase product details with smooth pans, clean typography, and high contrast close-ups.",
  luxury: "Use slow cinematic movement with premium text treatment and polished transitions.",
  fun: "Create energetic cuts with bright overlays and upbeat hook text for social reels.",
};

export default function AiCreativeSuite() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<UploadSlot[]>([
    { id: 0, label: "Photo 1", imageUrl: null },
    { id: 1, label: "Photo 2", imageUrl: null },
    { id: 2, label: "Photo 3", imageUrl: null },
  ]);
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [placeholderReady, setPlaceholderReady] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  const fileRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const uploadedCount = useMemo(() => uploads.filter((u) => !!u.imageUrl).length, [uploads]);
  const chosenVibe = selectedVibe ? VIBES.find((v) => v.id === selectedVibe) : null;

  const onPickImage = (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const url = URL.createObjectURL(file);
    setUploads((prev) => prev.map((slot, idx) => (idx === slotIndex ? { ...slot, imageUrl: url } : slot)));
    setPlaceholderReady(false);
  };

  const fillPromptFromVibe = (vibe: Vibe) => {
    if (!prompt.trim()) {
      setPrompt(DEFAULT_PROMPTS[vibe]);
    }
  };

  const handleGeneratePlaceholder = async () => {
    if (uploadedCount < 3) {
      toast.error("Upload all 3 photos first");
      return;
    }
    if (!selectedVibe) {
      toast.error("Select a vibe");
      return;
    }

    setIsGenerating(true);
    setPlaceholderReady(false);

    await new Promise((resolve) => setTimeout(resolve, 2500));

    const newDraftId = `veo-draft-${Date.now()}`;
    setDraftId(newDraftId);
    setPlaceholderReady(true);
    setIsGenerating(false);
    toast.success("AI video draft placeholder created");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Smart-Reel Creator
            </h1>
            <p className="text-xs text-muted-foreground">3 photos, one vibe, and a prompt to draft an AI reel</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <Card className="rounded-2xl border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              Step 1: Upload 3 Product Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {uploads.map((slot, idx) => (
                <div key={slot.id} className="space-y-1.5">
                  <input
                    ref={fileRefs[idx]}
                    type="file"
                    accept="image/*"
                    title={`${slot.label} upload`}
                    aria-label={`${slot.label} upload`}
                    className="hidden"
                    onChange={(e) => onPickImage(idx, e)}
                  />
                  <button type="button"
                    onClick={() => fileRefs[idx].current?.click()}
                    className="w-full h-28 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors overflow-hidden"
                  >
                    {slot.imageUrl ? (
                      <img src={slot.imageUrl} alt={slot.label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                        <Upload className="h-4 w-4" />
                        <span className="text-[11px]">{slot.label}</span>
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">Uploaded: {uploadedCount}/3</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Step 2: Select Vibe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {VIBES.map((v) => (
                <motion.button
                  key={v.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setSelectedVibe(v.id);
                    setPlaceholderReady(false);
                    fillPromptFromVibe(v.id);
                  }}
                  className={`rounded-xl p-3 text-left border transition-all ${
                    selectedVibe === v.id ? "border-primary bg-primary/5" : "border-border/40"
                  }`}
                >
                  <p className="text-sm font-semibold">{v.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{v.description}</p>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Step 3: Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setPlaceholderReady(false);
              }}
              placeholder="Describe how the reel should feel, transitions, text style, and call to action..."
              className="min-h-24 rounded-xl"
            />
          </CardContent>
        </Card>

        <Button
          onClick={handleGeneratePlaceholder}
          disabled={uploadedCount < 3 || !selectedVibe || isGenerating}
          className="w-full h-14 rounded-2xl text-base font-bold gap-2 shadow-lg"
        >
          <Film className={`h-5 w-5 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Generating AI draft..." : "Generate AI Video (Veo Placeholder)"}
        </Button>

        <AnimatePresence>
          {placeholderReady && chosenVibe && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="rounded-2xl border-2 border-primary/30 overflow-hidden">
                <div className="grid grid-cols-3 gap-1 p-1 bg-muted/30">
                  {uploads.map((slot) => (
                    <div key={slot.id} className="h-24 rounded-lg overflow-hidden bg-muted">
                      {slot.imageUrl ? <img src={slot.imageUrl} alt={slot.label} className="w-full h-full object-cover" /> : null}
                    </div>
                  ))}
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">AI Video Draft Placeholder</p>
                      <p className="text-xs text-muted-foreground">Vibe: {chosenVibe.label} | Draft ID: {draftId}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded-full text-white bg-gradient-to-r ${chosenVibe.accent}`}>
                      Veo Pending
                    </span>
                  </div>

                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Prompt used</p>
                    <p className="text-sm">{prompt || DEFAULT_PROMPTS[chosenVibe.id]}</p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1 rounded-xl gap-1.5" onClick={() => {
                      const data = JSON.stringify({ draftId, vibe: chosenVibe.label, prompt: prompt || DEFAULT_PROMPTS[chosenVibe.id], createdAt: new Date().toISOString() }, null, 2);
                      const blob = new Blob([data], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = `zivo-draft-${draftId}.json`; a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Draft saved!");
                    }}>
                      <Download className="h-4 w-4" /> Save Draft
                    </Button>
                    <Button className="flex-1 rounded-xl gap-1.5" onClick={() => { navigate("/create-post"); toast.success("Opening Reel composer"); }}>
                      <Film className="h-4 w-4" /> Continue to Reel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
