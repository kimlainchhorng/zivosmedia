/**
 * ReelEditor — In-app video editor with trim, text overlay, filters, speed
 */
import { useState, useRef, useEffect } from "react";
import { X, Type, Palette, Gauge, Scissors, Check, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const VIDEO_FILTERS = [
  { name: "Normal", css: "none" },
  { name: "Vivid", css: "saturate(1.75) contrast(1.08)" },
  { name: "Warm", css: "sepia(0.3) saturate(1.4)" },
  { name: "Cool", css: "hue-rotate(20deg) saturate(0.9)" },
  { name: "B&W", css: "grayscale(1)" },
  { name: "Noir", css: "grayscale(1) contrast(1.4) brightness(0.9)" },
  { name: "Vintage", css: "sepia(0.5) contrast(0.9) brightness(1.1)" },
  { name: "Fade", css: "contrast(0.85) brightness(1.15) saturate(0.8)" },
];

const SPEED_OPTIONS = [
  { label: "0.5×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "1.5×", value: 1.5 },
  { label: "2×", value: 2 },
];

interface ReelEditorProps {
  videoUrl: string;
  onSave: (edits: { filterCss: string; speed: number; textOverlay?: string; trimStart?: number; trimEnd?: number }) => void;
  onClose: () => void;
}

export default function ReelEditor({ videoUrl, onSave, onClose }: ReelEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeTab, setActiveTab] = useState<"filter" | "speed" | "text" | "trim">("filter");
  const [filter, setFilter] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [textOverlay, setTextOverlay] = useState("");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  const tabs = [
    { id: "filter" as const, icon: Palette, label: "Filter" },
    { id: "speed" as const, icon: Gauge, label: "Speed" },
    { id: "text" as const, icon: Type, label: "Text" },
    { id: "trim" as const, icon: Scissors, label: "Trim" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 safe-area-top">
        <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/10">
          <X className="h-5 w-5 text-white" />
        </button>
        <h2 className="text-white font-semibold">Edit Reel</h2>
        <button type="button"
          onClick={() => onSave({ filterCss: VIDEO_FILTERS[filter].css, speed, textOverlay: textOverlay || undefined })}
          className="p-2 rounded-full bg-primary"
        >
          <Check className="h-5 w-5 text-primary-foreground" />
        </button>
      </div>

      {/* Video preview */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center mx-4">
        <video
          ref={videoRef}
          src={videoUrl}
          className="max-h-full max-w-full rounded-2xl object-contain"
          style={{ filter: VIDEO_FILTERS[filter].css }}
          autoPlay
	          loop
	          muted
	          playsInline
	          preload="metadata"
	        />
        {textOverlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white text-2xl font-bold drop-shadow-lg px-4 text-center" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
              {textOverlay}
            </span>
          </div>
        )}
      </div>

      {/* Tool tabs */}
      <div className="bg-black/80 pb-safe">
        <div className="flex gap-1 px-4 py-2">
          {tabs.map((t) => (
            <button type="button"
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors",
                activeTab === t.id ? "bg-white/15 text-white" : "text-white/50"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tool content */}
        <div className="px-4 py-3 min-h-[80px]">
          {activeTab === "filter" && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {VIDEO_FILTERS.map((f, i) => (
                <button type="button"
                  key={f.name}
                  onClick={() => setFilter(i)}
                  className={cn(
                    "shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all",
                    filter === i ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/70"
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}

          {activeTab === "speed" && (
            <div className="flex gap-3 justify-center">
              {SPEED_OPTIONS.map((s) => (
                <button type="button"
                  key={s.value}
                  onClick={() => setSpeed(s.value)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    speed === s.value ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/70"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === "text" && (
            <input
              value={textOverlay}
              onChange={(e) => setTextOverlay(e.target.value)}
              placeholder="Add text overlay..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}

          {activeTab === "trim" && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/60 w-12">Start</span>
                <input type="range" min={0} max={100} value={trimStart} onChange={(e) => setTrimStart(Number(e.target.value))} className="flex-1 accent-primary" />
                <span className="text-xs text-white/60 w-8">{trimStart}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/60 w-12">End</span>
                <input type="range" min={0} max={100} value={trimEnd} onChange={(e) => setTrimEnd(Number(e.target.value))} className="flex-1 accent-primary" />
                <span className="text-xs text-white/60 w-8">{trimEnd}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
