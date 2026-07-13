/**
 * ReelEditor — In-app video editor with trim, text overlay, filters, speed
 */
import { useState, useRef, useEffect } from "react";
import { X, Type, Palette, Gauge, Scissors, Check, Radio, Sparkles } from "lucide-react";
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
  const activeTool = tabs.find((tab) => tab.id === activeTab);
  const editCount = [
    filter !== 0,
    speed !== 1,
    textOverlay.trim().length > 0,
    trimStart > 0 || trimEnd < 100,
  ].filter(Boolean).length;
  const editSignal =
    editCount >= 3
      ? { label: "Studio stack", detail: "Layered reel edit", width: "100%" }
      : editCount > 0
        ? { label: "Tuned clip", detail: `${editCount} ${editCount === 1 ? "edit" : "edits"} applied`, width: `${Math.max(36, editCount * 28)}%` }
        : { label: "Clean original", detail: "No edits applied yet", width: "18%" };
  const trimLabel = trimStart > 0 || trimEnd < 100 ? `${trimStart}-${trimEnd}%` : "Full clip";
  const handleSave = () => onSave({
    filterCss: VIDEO_FILTERS[filter].css,
    speed,
    textOverlay: textOverlay.trim() || undefined,
    trimStart,
    trimEnd,
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="safe-area-top px-4 py-3">
        <div className="flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-white/10 px-3 py-2 shadow-2xl backdrop-blur-xl">
        <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-transform active:scale-95" aria-label="Close reel editor">
          <X className="h-5 w-5 text-white" aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">Studio</p>
          <h2 className="truncate text-sm font-extrabold text-white">Edit Reel</h2>
        </div>
        <button type="button"
          onClick={handleSave}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 transition-transform active:scale-95"
          aria-label="Save reel edits"
        >
          <Check className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
        </button>
        </div>
      </div>

      {/* Video preview */}
      <div className="relative mx-4 flex flex-1 items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <video
          ref={videoRef}
          src={videoUrl}
          className="max-h-full max-w-full rounded-[1.35rem] object-contain"
          style={{ filter: VIDEO_FILTERS[filter].css }}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/82 backdrop-blur-md">
          {VIDEO_FILTERS[filter].name} • {speed}x
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/34 px-3 py-2 text-white backdrop-blur-xl">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.14em] text-white/50">Edit stack</span>
              <span className="block truncate text-xs font-extrabold">{activeTool?.label ?? "Tool"} active</span>
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
            {editCount} edits
          </span>
        </div>
        {textOverlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white text-2xl font-bold drop-shadow-lg px-4 text-center" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
              {textOverlay}
            </span>
          </div>
        )}
      </div>

      {/* Tool tabs */}
      <div className="pb-safe bg-black/80 px-4 pt-3 backdrop-blur-xl">
        <div className="flex gap-1 rounded-[1.15rem] border border-white/10 bg-white/8 p-1">
          {tabs.map((t) => (
            <button type="button"
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all",
                activeTab === t.id ? "bg-white/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]" : "text-white/52 hover:text-white/78"
              )}
              aria-pressed={activeTab === t.id}
            >
              <t.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-2 rounded-[1.15rem] border border-white/10 bg-white/8 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-black text-white">{editSignal.label}</span>
                <span className="block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/42">{editSignal.detail}</span>
              </span>
            </span>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
              Save ready
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-primary to-fuchsia-400 transition-[width] duration-300"
              style={{ width: editSignal.width }}
            />
          </div>
        </div>

        {/* Tool content */}
        <div className="min-h-[92px] py-3">
          {activeTab === "filter" && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {VIDEO_FILTERS.map((f, i) => (
                <button type="button"
                  key={f.name}
                  onClick={() => setFilter(i)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95",
                    filter === i ? "bg-ig-gradient text-white shadow-lg shadow-primary/25" : "bg-white/10 text-white/70 hover:bg-white/14"
                  )}
                  aria-pressed={filter === i}
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
                    "rounded-full px-5 py-2.5 text-sm font-extrabold transition-all active:scale-95",
                    speed === s.value ? "bg-ig-gradient text-white shadow-lg shadow-primary/25" : "bg-white/10 text-white/70 hover:bg-white/14"
                  )}
                  aria-pressed={speed === s.value}
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
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}

          {activeTab === "trim" && (
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/8 p-3">
              <div className="flex items-center gap-3">
                <span className="w-12 text-xs font-bold text-white/60">Start</span>
                <input type="range" min={0} max={100} value={trimStart} onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd))} className="flex-1 accent-primary" aria-label="Trim start percentage" />
                <span className="w-8 text-xs font-bold text-white/60">{trimStart}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-12 text-xs font-bold text-white/60">End</span>
                <input type="range" min={0} max={100} value={trimEnd} onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart))} className="flex-1 accent-primary" aria-label="Trim end percentage" />
                <span className="w-8 text-xs font-bold text-white/60">{trimEnd}%</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white/52">
                {trimLabel}
              </div>
            </div>
          )}
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Preview updates live
          </div>
        </div>
      </div>
    </div>
  );
}
