/**
 * SafeAreaDebugOverlay
 *
 * Visual debugging aid for safe-area insets, with an iPhone-notch
 * emulator mode that injects synthetic insets so spacing can be verified
 * without a real device.
 *
 * Toggle visibility:
 *   - Account → Developer → "Show safe-area overlay" switch
 *   - Keyboard: Ctrl+Shift+S (or Cmd+Shift+S on macOS)
 *   - localStorage key: zivo:debug:safe-area = "1"
 *
 * Emulator selection persisted under: zivo:debug:safe-area-emu
 *
 * See: docs/dev/capacitor-safe-area.md
 */
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "zivo:debug:safe-area";
const EMU_KEY = "zivo:debug:safe-area-emu";
const STYLE_ID = "zivo-safe-area-emu-style";

type EmulatedInsets = { top: number; bottom: number; left: number; right: number };

type Preset = {
  id: string;
  label: string;
  insets: EmulatedInsets | null; // null = real device
  notch?: { width: number; height: number; radius: number; kind: "notch" | "island" } | null;
};

const PRESETS: Preset[] = [
  { id: "off", label: "Off (real device)", insets: null, notch: null },
  { id: "se", label: "iPhone SE", insets: { top: 0, bottom: 0, left: 0, right: 0 }, notch: null },
  {
    id: "13",
    label: "iPhone 13 (notch)",
    insets: { top: 47, bottom: 34, left: 0, right: 0 },
    notch: { width: 156, height: 30, radius: 18, kind: "notch" },
  },
  {
    id: "14p",
    label: "iPhone 14 Pro (Dynamic Island)",
    insets: { top: 59, bottom: 34, left: 0, right: 0 },
    notch: { width: 126, height: 37, radius: 20, kind: "island" },
  },
  {
    id: "15pm",
    label: "iPhone 15 Pro Max (Dynamic Island)",
    insets: { top: 59, bottom: 34, left: 0, right: 0 },
    notch: { width: 126, height: 37, radius: 20, kind: "island" },
  },
  { id: "custom", label: "Custom…", insets: { top: 50, bottom: 30, left: 0, right: 0 }, notch: null },
];

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readInset(side: "top" | "bottom" | "left" | "right"): number {
  if (typeof window === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.height = `env(safe-area-inset-${side}, 0px)`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return Math.round(px);
}

function applyEmulationStyles(insets: EmulatedInsets | null) {
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.remove();
  if (!insets) return;
  const css = `
    /* Safe-area emulator override — do NOT ship to production */
    html {
      --zivo-emu-top: ${insets.top}px;
      --zivo-emu-bottom: ${insets.bottom}px;
      --zivo-emu-left: ${insets.left}px;
      --zivo-emu-right: ${insets.right}px;
    }
    .safe-area-top { padding-top: var(--zivo-emu-top) !important; }
    .safe-area-bottom { padding-bottom: var(--zivo-emu-bottom) !important; }
    .pt-safe { padding-top: var(--zivo-emu-top) !important; }
    .pb-safe { padding-bottom: var(--zivo-emu-bottom) !important; }
    .pl-safe { padding-left: var(--zivo-emu-left) !important; }
    .pr-safe { padding-right: var(--zivo-emu-right) !important; }
  `;
  const tag = document.createElement("style");
  tag.id = STYLE_ID;
  tag.textContent = css;
  document.head.appendChild(tag);
}

function loadEmuState(): { presetId: string; custom: EmulatedInsets } {
  try {
    const raw = localStorage.getItem(EMU_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.presetId === "string") return parsed;
    }
  } catch {
    /* ignore */
  }
  return { presetId: "off", custom: { top: 50, bottom: 30, left: 0, right: 0 } };
}

function saveEmuState(s: { presetId: string; custom: EmulatedInsets }) {
  try {
    localStorage.setItem(EMU_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export const SafeAreaDebugOverlay = () => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [reported, setReported] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [vp, setVp] = useState({ w: 0, h: 0, dpr: 1 });
  const [emu, setEmu] = useState<{ presetId: string; custom: EmulatedInsets }>({
    presetId: "off",
    custom: { top: 50, bottom: 30, left: 0, right: 0 },
  });

  // Hydrate from storage after mount.
  useEffect(() => {
    setEnabled(readEnabled());
    setEmu(loadEmuState());
  }, []);

  // Resolve active emulated insets.
  const activePreset = useMemo(() => PRESETS.find((p) => p.id === emu.presetId) || PRESETS[0], [emu.presetId]);
  const effectiveInsets: EmulatedInsets | null = useMemo(() => {
    if (activePreset.id === "off") return null;
    if (activePreset.id === "custom") return emu.custom;
    return activePreset.insets;
  }, [activePreset, emu.custom]);

  // Apply / remove emulation stylesheet whenever the resolved insets change.
  useEffect(() => {
    applyEmulationStyles(effectiveInsets);
    return () => applyEmulationStyles(null);
  }, [effectiveInsets]);

  // Keyboard shortcut + cross-tab sync.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const next = !readEnabled();
        try {
          localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
        setEnabled(next);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabled(e.newValue === "1");
      if (e.key === EMU_KEY) setEmu(loadEmuState());
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Measure reported insets while enabled.
  useEffect(() => {
    if (!enabled) return;
    const measure = () => {
      setReported({
        top: readInset("top"),
        bottom: readInset("bottom"),
        left: readInset("left"),
        right: readInset("right"),
      });
      setVp({
        w: window.innerWidth,
        h: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
      });
    };
    measure();
    const id = window.setInterval(measure, 500);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [enabled]);

  const updateEmu = (next: typeof emu) => {
    setEmu(next);
    saveEmuState(next);
  };

  const setPreset = (id: string) => updateEmu({ ...emu, presetId: id });

  const setCustom = (key: keyof EmulatedInsets, value: number) => {
    const v = Math.max(0, Math.min(200, Number.isFinite(value) ? value : 0));
    updateEmu({ ...emu, presetId: "custom", custom: { ...emu.custom, [key]: v } });
  };

  if (!enabled) return null;

  // Display insets = effective if emulating, else reported.
  const display = effectiveInsets ?? reported;
  const emulating = !!effectiveInsets;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[2147483647]"
      style={{ contain: "strict" }}
    >
      {/* Top inset band */}
      <div
        className="absolute inset-x-0 top-0 bg-red-500/40 border-b border-red-600"
        style={{ height: `max(${display.top}px, 2px)` }}
      />
      {/* Bottom inset band */}
      <div
        className="absolute inset-x-0 bottom-0 bg-blue-500/40 border-t border-blue-600"
        style={{ height: `max(${display.bottom}px, 2px)` }}
      />
      {/* Side bands */}
      <div
        className="absolute inset-y-0 left-0 bg-green-500/30 border-r border-green-600"
        style={{ width: `max(${display.left}px, 2px)` }}
      />
      <div
        className="absolute inset-y-0 right-0 bg-green-500/30 border-l border-green-600"
        style={{ width: `max(${display.right}px, 2px)` }}
      />

      {/* Notch / Dynamic Island silhouette */}
      {emulating && activePreset.notch && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bg-black"
          style={{
            top: 0,
            width: `${activePreset.notch.width}px`,
            height: `${activePreset.notch.height}px`,
            borderBottomLeftRadius: `${activePreset.notch.radius}px`,
            borderBottomRightRadius: `${activePreset.notch.radius}px`,
            borderTopLeftRadius: activePreset.notch.kind === "island" ? `${activePreset.notch.radius}px` : 0,
            borderTopRightRadius: activePreset.notch.kind === "island" ? `${activePreset.notch.radius}px` : 0,
            marginTop: activePreset.notch.kind === "island" ? "8px" : 0,
          }}
        />
      )}

      {/* Home indicator bar */}
      {emulating && display.bottom > 10 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bg-foreground/80 rounded-full"
          style={{
            bottom: `${Math.max(display.bottom / 2 - 2, 6)}px`,
            width: "134px",
            height: "5px",
          }}
        />
      )}

      {/* Emulating banner */}
      {emulating && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black shadow-lg"
          style={{ top: `${display.top + 8}px` }}
        >
          Emulating · {activePreset.label}
        </div>
      )}

      {/* HUD card */}
      <div
        className="pointer-events-auto absolute right-2 rounded-lg bg-black/85 px-3 py-2 text-[11px] leading-tight text-white shadow-lg font-mono w-[230px]"
        style={{ top: `${display.top + 8}px` }}
      >
        <div className="font-semibold mb-1">SAFE AREA</div>

        <div className="space-y-0.5 mb-2">
          <div className="opacity-70">Reported (real env):</div>
          <div>
            t:{reported.top} b:{reported.bottom} l:{reported.left} r:{reported.right}
          </div>
          <div className="opacity-70 mt-1">Effective (after emu):</div>
          <div className={emulating ? "text-yellow-300" : ""}>
            t:{display.top} b:{display.bottom} l:{display.left} r:{display.right}
          </div>
          <div className="opacity-70 mt-1">
            {vp.w}×{vp.h} @{vp.dpr}x
          </div>
        </div>

        <div className="border-t border-white/15 pt-1.5">
          <label className="block text-[10px] opacity-70 mb-0.5">Simulate device</label>
          <select
            className="w-full rounded bg-white/10 px-1.5 py-1 text-[11px] text-white outline-none"
            value={emu.presetId}
            onChange={(e) => setPreset(e.target.value)}
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="text-black">
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {emu.presetId === "custom" && (
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            {(["top", "bottom", "left", "right"] as const).map((side) => (
              <label key={side} className="text-[10px] opacity-80">
                {side}
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={emu.custom[side]}
                  onChange={(e) => setCustom(side, parseInt(e.target.value, 10))}
                  className="mt-0.5 w-full rounded bg-white/10 px-1 py-0.5 text-[11px] text-white outline-none"
                />
              </label>
            ))}
          </div>
        )}

        <button
          type="button"
          className="mt-2 w-full rounded bg-white/15 px-2 py-1 text-[10px] hover:bg-white/25"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, "0");
            } catch {
              /* ignore */
            }
            setEnabled(false);
          }}
        >
          Hide (Ctrl+Shift+S)
        </button>
      </div>
    </div>
  );
};

export default SafeAreaDebugOverlay;
