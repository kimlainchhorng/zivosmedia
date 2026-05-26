/**
 * useBeautyFilter — DISABLED.
 * All face landmark detection, skin smoothing, and beauty filters have been removed.
 * The hook now passes the raw camera MediaStream through unchanged.
 */
import { useEffect, useState } from "react";

export type BeautyStatus = "loading" | "pro" | "lite" | "off" | "error";
export type BeautyTone = "natural" | "warm" | "cool" | "film" | "pink";

export interface BeautySettings {
  enabled: boolean;
  smooth: number;
  brighten: number;
  slim: number;
  eyes: number;
  lips: number;
  nose: number;
  tone?: BeautyTone;
  blurBg?: boolean;
}

export const DEFAULT_BEAUTY: BeautySettings = {
  enabled: false,
  smooth: 0,
  brighten: 0,
  slim: 0,
  eyes: 0,
  lips: 0,
  nose: 0,
  tone: "natural",
  blurBg: false,
};

const OFF: BeautySettings = { ...DEFAULT_BEAUTY };

export const BEAUTY_PRESETS: Record<"real" | "natural" | "sweet" | "pro" | "glam" | "auto" | "off", BeautySettings> = {
  real: OFF, natural: OFF, sweet: OFF, pro: OFF, glam: OFF, auto: OFF, off: OFF,
};

export function useBeautyFilter(rawStream: MediaStream | null, _settings: BeautySettings) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status] = useState<BeautyStatus>("off");
  const luma = 0.5;

  useEffect(() => {
    setStream(rawStream);
  }, [rawStream]);

  return { stream, status, luma };
}
