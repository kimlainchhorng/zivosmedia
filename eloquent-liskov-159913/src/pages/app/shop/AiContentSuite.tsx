/**
 * AiContentSuite — Upload 3 product photos → AI generates 15s Reel with music
 * 2026 Standard: Veo-style video generation placeholder
 */
import { useState, useRef } from "react";
import { ArrowLeft, Upload, Sparkles, Music, Film, X, Wand2, Download, Play, ImagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Mood = "energetic" | "luxury" | "local";

const MOODS: { id: Mood; label: string; emoji: string; desc: string; gradient: string }[] = [
  { id: "energetic", label: "Energetic", emoji: "⚡", desc: "Fast cuts, vibrant colors, upbeat music", gradient: "from-orange-500 to-red-500" },
  { id: "luxury", label: "Luxury", emoji: "✨", desc: "Slow motion, elegant transitions, ambient", gradient: "from-amber-500 to-yellow-600" },
  { id: "local", label: "Local", emoji: "🌿", desc: "Warm tones, authentic feel, folk music", gradient: "from-emerald-500 to-teal-600" },
];

const GENERATED_SCENES: Record<Mood, string[]> = {
  energetic: ["Quick zoom into product", "360° spin with particle effects", "Beat-synced flash transitions", "CTA slide with shake animation"],
  luxury: ["Slow pan across product surface", "Soft focus pull with bokeh", "Gentle text reveal with gold overlay", "Elegant brand card fade-in"],
  local: ["Handheld-style approach shot", "Natural light product showcase", "Community-feel lifestyle montage", "Warm close-up with handwritten text"],
};

const MUSIC_TRACKS: Record<Mood, { name: string; bpm: number }[]> = {
  energetic: [{ name: "Neon Rush", bpm: 128 }, { name: "Street Vibes", bpm: 140 }, { name: "Electric Pop", bpm: 120 }],
  luxury: [{ name: "Golden Hour", bpm: 72 }, { name: "Silk & Satin", bpm: 85 }, { name: "Ambient Dream", bpm: 68 }],
  local: [{ name: "Morning Market", bpm: 95 }, { name: "Hometown Acoustic", bpm: 100 }, { name: "Sunset Folk", bpm: 88 }],
};

const TEXT_OVERLAYS: Record<Mood, string[]> = {
  energetic: ["🔥 JUST DROPPED", "DON'T MISS OUT", "SHOP NOW →", "LIMITED STOCK"],
  luxury: ["Premium Quality", "Exclusively Yours", "Crafted with Care", "Discover →"],
  local: ["Made with Love ❤️", "Support Local", "Fresh & Authentic", "Visit Us Today"],
};

export default function AiContentSuite() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedPreview, setGeneratedPreview] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(0);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - photos.length;
    const toAdd = files.slice(0, remaining).filter(f => f.type.startsWith("image/"));
    if (toAdd.length === 0) return;
    const urls = toAdd.map(f => URL.createObjectURL(f));
    setPhotos(prev => [...prev, ...urls]);
    setGeneratedPreview(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setGeneratedPreview(false);
  };

  const handleGenerate = async () => {
    if (photos.length < 1 || !selectedMood) {
      toast.error("Upload at least 1 photo and select a mood");
      return;
    }
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate AI video generation pipeline
    const steps = ["Analyzing product images...", "Composing scene transitions...", "Syncing music track...", "Rendering 15s Reel..."];
    for (let i = 0; i < steps.length; i++) {
      toast.info(steps[i]);
      await new Promise(r => setTimeout(r, 1200));
      setGenerationProgress((i + 1) * 25);
    }

    setGeneratedPreview(true);
    setIsGenerating(false);
    toast.success("Your 15-second Reel is ready!");
  };

  const mood = selectedMood ? MOODS.find(m => m.id === selectedMood) : null;
  const tracks = selectedMood ? MUSIC_TRACKS[selectedMood] : [];

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
              AI Content Suite
            </h1>
            <p className="text-xs text-muted-foreground">3 photos → Professional 15s Reel with music</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Step 1: Upload 3 Photos */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-primary" />
              Step 1: Upload Product Photos
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full ml-auto text-muted-foreground font-normal">
                {photos.length}/3
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                  <img src={url} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">
                    #{i + 1}
                  </span>
                </div>
              ))}
              {photos.length < 3 && (
                <button type="button"
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Add Photo</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Upload up to 3 product photos. AI will create transitions between them.
            </p>
          </CardContent>
        </Card>

        {/* Step 2: Select Mood */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              Step 2: Select Mood & Music
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map(m => (
                <motion.button
                  key={m.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSelectedMood(m.id); setGeneratedPreview(false); setSelectedTrack(0); }}
                  className={`rounded-2xl p-3 text-center border-2 transition-all ${
                    selectedMood === m.id ? "border-primary bg-primary/5" : "border-border/40 bg-card"
                  }`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <p className="text-xs font-bold mt-1">{m.label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{m.desc}</p>
                </motion.button>
              ))}
            </div>

            {/* Music Track Selection */}
            {selectedMood && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Suggested Tracks</p>
                <div className="space-y-1">
                  {tracks.map((t, i) => (
                    <button type="button"
                      key={t.name}
                      onClick={() => setSelectedTrack(i)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all text-sm ${
                        selectedTrack === i ? "bg-primary/10 border border-primary/30" : "bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <Play className={`h-3.5 w-3.5 ${selectedTrack === i ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="flex-1 font-medium text-xs">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground">{t.bpm} BPM</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Button */}
        {isGenerating && (
          <div className="space-y-2">
            <Progress value={generationProgress} className="h-2 rounded-full" />
            <p className="text-[10px] text-muted-foreground text-center">AI is generating your Reel... {generationProgress}%</p>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={photos.length < 1 || !selectedMood || isGenerating}
          className="w-full h-14 rounded-2xl text-base font-bold gap-2 shadow-lg"
        >
          <Wand2 className={`h-5 w-5 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Generating 15s Reel..." : "Generate Professional Reel"}
        </Button>

        {/* Generated Preview */}
        <AnimatePresence>
          {generatedPreview && mood && selectedMood && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="rounded-2xl border-2 border-primary/30 overflow-hidden">
                {/* Preview Collage */}
                <div className="relative">
                  <div className="grid grid-cols-3 h-52">
                    {photos.map((url, i) => (
                      <div key={i} className="relative overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20" />
                        <span className="absolute top-1 left-1 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded-full">
                          Scene {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />
                  <div className="absolute top-3 left-3">
                    <span className={`text-xs px-3 py-1 rounded-full text-white font-bold bg-gradient-to-r ${mood.gradient}`}>
                      {TEXT_OVERLAYS[selectedMood][0]}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-base font-bold drop-shadow-lg">{TEXT_OVERLAYS[selectedMood][2]}</p>
                    <p className="text-white/80 text-xs mt-0.5">{TEXT_OVERLAYS[selectedMood][3]}</p>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur rounded-full px-2.5 py-1">
                    <Music className="h-3 w-3 text-white" />
                    <span className="text-[10px] text-white font-medium">{tracks[selectedTrack]?.name}</span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    0:15
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">AI-Generated Reel</p>
                      <p className="text-xs text-muted-foreground">{mood.label} · 15 seconds · {photos.length} scenes · Auto-synced music</p>
                    </div>
                    <Film className="h-5 w-5 text-primary" />
                  </div>

                  {/* Scene Breakdown */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Scene Transitions</p>
                    <div className="space-y-1">
                      {GENERATED_SCENES[selectedMood].map((scene, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <span className="w-10 text-muted-foreground text-right">{(i * 3.75).toFixed(1)}s</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-foreground">{scene}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 rounded-xl gap-1.5" onClick={() => {
                      const draft = { mood: selectedMood, scenes: GENERATED_SCENES[selectedMood!], track: MUSIC_TRACKS[selectedMood!][selectedTrack], overlays: TEXT_OVERLAYS[selectedMood!], photoCount: photos.length, createdAt: new Date().toISOString() };
                      const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = `ai-reel-draft-${Date.now()}.json`; a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 30_000);
                      toast.success("Draft saved!");
                    }}>
                      <Download className="h-4 w-4" /> Save Draft
                    </Button>
                    <Button className="flex-1 rounded-xl gap-1.5" onClick={() => { navigate("/create-post"); toast.success("Opening Reel editor..."); }}>
                      <Film className="h-4 w-4" /> Post as Reel
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
