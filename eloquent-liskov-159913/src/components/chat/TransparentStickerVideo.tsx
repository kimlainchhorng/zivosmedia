/**
 * TransparentStickerVideo — renders sticker MP4s without the baked white matte.
 *
 * Render modes:
 *  • "blend"  – lightweight CSS blend (default)
 *  • "chroma" – canvas-based chroma key with HSL green detection,
 *               premultiplied-alpha compositing, and Gaussian edge feathering
 *  • "webgl"  – GPU-accelerated chroma key via fragment shader (auto-falls
 *               back to "chroma" when WebGL is unavailable)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// ─── types ───────────────────────────────────────────────────────────────────
type TransparentStickerVideoMode = "blend" | "chroma" | "webgl";

// ─── tuning constants ────────────────────────────────────────────────────────
const HARD_KEY_BRIGHTNESS = 240;
const SOFT_KEY_BRIGHTNESS = 215;
const MAX_NEUTRAL_VARIANCE = 30;
const DARK_PIXEL_THRESHOLD = 80;
const MAX_PIXEL_RATIO = 1.0; // low res for small stickers — big perf win
const MIN_FRAME_INTERVAL_MS = 50; // ~20fps cap for chroma path (sufficient for small stickers)

// ─── HSL helper ──────────────────────────────────────────────────────────────
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const r1 = r / 255, g1 = g / 255, b1 = b / 255;
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r1) h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)) / 6;
  else if (max === g1) h = ((b1 - r1) / d + 2) / 6;
  else h = ((r1 - g1) / d + 4) / 6;
  return [h * 360, s, l];
}

function getWhiteKeyStrength(red: number, green: number, blue: number) {
  const brightness = (red + green + blue) / 3;
  const maxChannel = Math.max(red, green, blue);
  const minChannel = Math.min(red, green, blue);
  const variance = maxChannel - minChannel;

  if (brightness >= HARD_KEY_BRIGHTNESS && variance <= MAX_NEUTRAL_VARIANCE) return 1;
  if (brightness < SOFT_KEY_BRIGHTNESS || variance > MAX_NEUTRAL_VARIANCE) return 0;

  const brightnessFade = (brightness - SOFT_KEY_BRIGHTNESS) / (HARD_KEY_BRIGHTNESS - SOFT_KEY_BRIGHTNESS);
  const varianceFade = 1 - variance / MAX_NEUTRAL_VARIANCE;
  return Math.min(1, brightnessFade * varianceFade);
}

function applyEdgeConnectedWhiteKey(frame: ImageData, keyedMask: Uint8Array) {
  const { data, width, height } = frame;
  if (width === 0 || height === 0) return;

  const pixelCount = width * height;
  const whiteStrength = new Float32Array(pixelCount);
  const visited = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let head = 0;
  let tail = 0;

  for (let idx = 0; idx < pixelCount; idx++) {
    const pixelIndex = idx * 4;
    if (data[pixelIndex + 3] === 0) continue;

    whiteStrength[idx] = getWhiteKeyStrength(
      data[pixelIndex],
      data[pixelIndex + 1],
      data[pixelIndex + 2],
    );
  }

  const enqueue = (idx: number) => {
    if (visited[idx] === 1 || whiteStrength[idx] <= 0) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (whiteStrength[idx] <= 0) continue;

      const touchesFrameEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const touchesExposedPixel =
        !touchesFrameEdge && (
          data[(idx - 1) * 4 + 3] === 0 ||
          data[(idx + 1) * 4 + 3] === 0 ||
          data[(idx - width) * 4 + 3] === 0 ||
          data[(idx + width) * 4 + 3] === 0 ||
          keyedMask[idx - 1] === 1 ||
          keyedMask[idx + 1] === 1 ||
          keyedMask[idx - width] === 1 ||
          keyedMask[idx + width] === 1
        );

      if (touchesFrameEdge || touchesExposedPixel) enqueue(idx);
    }
  }

  while (head < tail) {
    const idx = queue[head++];
    const pixelIndex = idx * 4;
    const strength = whiteStrength[idx];
    if (strength <= 0) continue;

    const currentAlpha = data[pixelIndex + 3];
    const nextAlpha = Math.round(currentAlpha * (1 - strength));
    if (nextAlpha < currentAlpha) {
      data[pixelIndex + 3] = nextAlpha;
      keyedMask[idx] = 1;
    }

    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x > 0) enqueue(idx - 1);
    if (x < width - 1) enqueue(idx + 1);
    if (y > 0) enqueue(idx - width);
    if (y < height - 1) enqueue(idx + width);
  }
}

// ─── chroma key (canvas 2D path) ─────────────────────────────────────────────
function applyChromaKey(frame: ImageData, whiteKeyEnabled: boolean) {
  const { data, width, height } = frame;
  const keyedMask = new Uint8Array(width * height);

  for (let index = 0; index < data.length; index += 4) {
    const pixelIdx = index >> 2;
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    // ── HSL-based green keying ──
    const [hue, sat, lightness] = rgbToHsl(red, green, blue);
    const isGreenHue = hue >= 70 && hue <= 170;

    if (isGreenHue && sat > 0.18 && lightness > 0.10 && lightness < 0.88) {
      // Hard green — require higher saturation & narrower lightness to protect white/rice areas
      if (sat > 0.35 && lightness > 0.18 && lightness < 0.82) {
        data[index + 3] = 0;
        keyedMask[pixelIdx] = 1;
        continue;
      }
      // Soft green – fade proportional to saturation & hue proximity
      // Protect light pixels (rice, white areas) by requiring stronger saturation
      const hueDist = Math.min(Math.abs(hue - 120), Math.abs(hue - 120 + 360)) / 50;
      const satFactor = lightness > 0.7 ? Math.max(0, (sat - 0.3) * 3.33) : Math.min(1, sat * 2);
      const fade = satFactor * Math.max(0, 1 - hueDist);
      if (fade > 0.08) {
        const nextAlpha = Math.round(255 * (1 - fade));
        const newAlpha = Math.min(data[index + 3], Math.max(0, nextAlpha));
        if (newAlpha < 255) keyedMask[pixelIdx] = 1;
        data[index + 3] = newAlpha;

        // Despill: shift green toward avg(red, blue)
        if (data[index + 3] > 0) {
          const neutral = Math.round((red + blue) / 2);
          data[index + 1] = Math.round(neutral + (green - neutral) * 0.1);
        }
        continue;
      }
    }
  }

  if (whiteKeyEnabled) {
    applyEdgeConnectedWhiteKey(frame, keyedMask);
  }

  // ── Lightweight edge erosion (sample every 2nd pixel for speed) ──
  const alphaSnapshot = new Uint8Array(width * height);
  for (let i = 0; i < alphaSnapshot.length; i++) alphaSnapshot[i] = data[i * 4 + 3];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const a = alphaSnapshot[idx];
      if (a === 0 || keyedMask[idx] === 1) continue;

      const pi = idx * 4;
      const br = (data[pi] + data[pi + 1] + data[pi + 2]) / 3;
      if (br < DARK_PIXEL_THRESHOLD) continue;

      // Fast 4-neighbor check instead of full 3x3 kernel
      const keyedNeighbors =
        (keyedMask[idx - 1] || 0) +
        (keyedMask[idx + 1] || 0) +
        (keyedMask[idx - width] || 0) +
        (keyedMask[idx + width] || 0);

      if (keyedNeighbors > 0) {
        const fade = Math.min(1, keyedNeighbors / 2.5);
        data[pi + 3] = Math.max(0, Math.round(a * (1 - fade * 0.8)));
      }
    }
  }
}

// ─── WebGL chroma key renderer ───────────────────────────────────────────────
const VERTEX_SRC = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FRAGMENT_SRC = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_video;
  uniform float u_whiteKey;

  vec3 rgb2hsl(vec3 c) {
    float mx = max(max(c.r, c.g), c.b);
    float mn = min(min(c.r, c.g), c.b);
    float l = (mx + mn) * 0.5;
    if (mx == mn) return vec3(0.0, 0.0, l);
    float d = mx - mn;
    float s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
    float h;
    if (mx == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
    return vec3(h * 60.0, s, l);
  }

  void main() {
    vec4 color = texture2D(u_video, vec2(v_uv.x, 1.0 - v_uv.y));
    vec3 hsl = rgb2hsl(color.rgb);
    float hue = hsl.x;
    float sat = hsl.y;
    float lit = hsl.z;

    float alpha = 1.0;

    // Green key
    float greenHue = step(70.0, hue) * step(hue, 170.0);
    // Tighter thresholds: protect light/white pixels (rice, white areas)
    float satGate = mix(smoothstep(0.15, 0.35, sat), smoothstep(0.28, 0.45, sat), smoothstep(0.65, 0.80, lit));
    float greenKey = greenHue * satGate * smoothstep(0.08, 0.22, lit) * smoothstep(lit, 0.82, 0.88);
    alpha *= (1.0 - greenKey);

    // Despill
    float neutral = (color.r + color.b) * 0.5;
    color.g = mix(color.g, neutral + (color.g - neutral) * 0.1, greenKey);

    // White key
    if (u_whiteKey > 0.5) {
      float brightness = dot(color.rgb, vec3(0.333));
      float variance = max(max(color.r, color.g), color.b) - min(min(color.r, color.g), color.b);
      float normVar = variance / max(brightness, 0.001);
      float whiteAlpha = 1.0 - smoothstep(0.82, 0.94, brightness) * smoothstep(normVar, 0.12, 0.02);
      alpha *= whiteAlpha;
    }

    // Premultiply
    gl_FragColor = vec4(color.rgb * alpha, alpha);
  }
`;

function tryInitWebGL(canvas: HTMLCanvasElement) {
  // Test WebGL on an offscreen canvas first to avoid locking the real canvas
  const testCanvas = document.createElement("canvas");
  testCanvas.width = 1;
  testCanvas.height = 1;
  const testGl = testCanvas.getContext("webgl");
  if (!testGl) return null;
  // Test passed — now use the real canvas
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
  if (!gl) return null;

  function compileShader(type: number, src: string) {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
      gl!.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  if (!vs || !fs) return null;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;

  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const uWhiteKey = gl.getUniformLocation(prog, "u_whiteKey");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  return { gl, tex, uWhiteKey };
}

// ─── props ───────────────────────────────────────────────────────────────────
interface TransparentStickerVideoProps {
  src: string;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  preload?: "none" | "metadata" | "auto";
  renderMode?: TransparentStickerVideoMode;
  whiteKeyEnabled?: boolean;
}

// ─── component ───────────────────────────────────────────────────────────────
export function TransparentStickerVideo({
  src,
  alt = "",
  className,
  fallbackSrc,
  preload = "auto",
  renderMode = "blend",
  whiteKeyEnabled = true,
}: TransparentStickerVideoProps) {
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [isInViewport, setIsInViewport] = useState(renderMode === "blend");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Track effective mode (webgl may fall back to chroma)
  const effectiveModeRef = useRef<"chroma" | "webgl">(
    renderMode === "webgl" ? "webgl" : "chroma"
  );

  // ── IntersectionObserver for chroma/webgl ──
  useEffect(() => {
    if (renderMode === "blend") { setIsInViewport(true); return; }
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") { setIsInViewport(true); return; }
    setIsInViewport(false);
    const observer = new IntersectionObserver(
      ([entry]) => setIsInViewport(entry.isIntersecting && entry.intersectionRatio > 0.08),
      { threshold: [0, 0.08, 0.2] },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [renderMode, src]);

  // ── Play / pause based on viewport ──
  useEffect(() => {
    if (renderMode === "blend") return;
    const video = videoRef.current;
    if (!video) return;
    if (!isInViewport) { video.pause(); return; }
    const p = video.play();
    p?.catch?.(() => undefined);
  }, [isInViewport, renderMode, src]);

  // ── Render loop (chroma / webgl) ──
  useEffect(() => {
    if (error || renderMode === "blend" || !isInViewport) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const container = containerRef.current;
    if (!canvas || !video || !container) return;

    let disposed = false;
    let rafId: number | null = null;
    let frameCallbackId: number | null = null;
    let lastFrameTime = 0;
    let cachedCtx: CanvasRenderingContext2D | null = null;

    const keyedVideo = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: unknown) => void) => number;
      cancelVideoFrameCallback?: (h: number) => void;
    };

    // Try WebGL init
    let webglCtx: ReturnType<typeof tryInitWebGL> = null;
    if (renderMode === "webgl" && !whiteKeyEnabled) {
      webglCtx = tryInitWebGL(canvas);
      effectiveModeRef.current = webglCtx ? "webgl" : "chroma";
    } else {
      effectiveModeRef.current = "chroma";
    }

    const cancelFrame = () => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      if (frameCallbackId !== null && keyedVideo.cancelVideoFrameCallback) {
        keyedVideo.cancelVideoFrameCallback(frameCallbackId);
        frameCallbackId = null;
      }
    };

    const syncSize = () => {
      const b = container.getBoundingClientRect();
      const pr = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const w = Math.max(1, Math.round(b.width * pr));
      const h = Math.max(1, Math.round(b.height * pr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        cachedCtx = null; // invalidate cached context on resize
        if (webglCtx) webglCtx.gl.viewport(0, 0, w, h);
      }
    };

    const scheduleNext = () => {
      cancelFrame();
      if (disposed || video.paused || video.ended) return;
      if (keyedVideo.requestVideoFrameCallback) {
        frameCallbackId = keyedVideo.requestVideoFrameCallback(() => renderFrame());
      } else {
        rafId = requestAnimationFrame(() => renderFrame());
      }
    };

    const renderFrame = () => {
      if (disposed) return;

      // Throttle chroma path to ~30fps
      if (!webglCtx) {
        const now = performance.now();
        if (now - lastFrameTime < MIN_FRAME_INTERVAL_MS) {
          scheduleNext();
          return;
        }
        lastFrameTime = now;
      }

      syncSize();

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        scheduleNext();
        return;
      }

      if (webglCtx) {
        // ── WebGL path ──
        const { gl, tex, uWhiteKey } = webglCtx;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.uniform1f(uWhiteKey, whiteKeyEnabled ? 1.0 : 0.0);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else {
        // ── Canvas 2D path (cached context) ──
        if (!cachedCtx) {
          cachedCtx = canvas.getContext("2d", { willReadFrequently: true });
        }
        const ctx = cachedCtx;
        if (!ctx) { scheduleNext(); return; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const vw = video.videoWidth || canvas.width;
        const vh = video.videoHeight || canvas.height;
        const scale = Math.min(canvas.width / vw, canvas.height / vh);
        const dw = vw * scale, dh = vh * scale;
        const dx = (canvas.width - dw) / 2, dy = (canvas.height - dh) / 2;
        ctx.drawImage(video, dx, dy, dw, dh);

        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyChromaKey(frame, whiteKeyEnabled);
        ctx.putImageData(frame, 0, 0);
      }

      scheduleNext();
    };

    const handleStart = () => { syncSize(); renderFrame(); setReady(true); };

    const ro = new ResizeObserver(() => {
      syncSize();
      if (!video.paused && !video.ended) renderFrame();
    });
    ro.observe(container);

    video.addEventListener("loadeddata", handleStart);
    video.addEventListener("play", handleStart);
    video.addEventListener("seeked", handleStart);
    video.addEventListener("pause", cancelFrame);
    video.addEventListener("ended", cancelFrame);

    syncSize();
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.paused) handleStart();

    return () => {
      disposed = true;
      ro.disconnect();
      cancelFrame();
      video.removeEventListener("loadeddata", handleStart);
      video.removeEventListener("play", handleStart);
      video.removeEventListener("seeked", handleStart);
      video.removeEventListener("pause", cancelFrame);
      video.removeEventListener("ended", cancelFrame);
      if (webglCtx) {
        const { gl } = webglCtx;
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    };
  }, [error, isInViewport, renderMode, src, whiteKeyEnabled]);

  // ── Fallback ──
  if (error && fallbackSrc) {
    return (
      <img
	        src={fallbackSrc}
	        alt={alt}
	        className={cn("h-full w-full object-contain pointer-events-none", className)}
	        loading="lazy"
	        decoding="async"
	      />
    );
  }

  // ── chroma / webgl render ──
  if (renderMode === "chroma" || renderMode === "webgl") {
    return (
      <div
        ref={containerRef}
        className={cn("relative h-full w-full pointer-events-none", className)}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      >
        <canvas
          ref={canvasRef}
          className={cn(
            "h-full w-full object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.10)] transition-opacity duration-200",
            ready ? "opacity-100" : "opacity-0"
          )}
        />
        <video
          ref={videoRef}
          src={src}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          loop
          muted
          playsInline
          preload={preload}
          onError={() => setError(true)}
          aria-hidden="true"
        />
      </div>
    );
  }

  // ── blend render ──
  return (
    <video
      src={src}
      className={cn(
        "h-full w-full object-contain pointer-events-none mix-blend-multiply dark:mix-blend-screen dark:invert",
        className,
      )}
      autoPlay
      loop
      muted
      playsInline
      preload={preload}
      onError={() => setError(true)}
    />
  );
}

export default TransparentStickerVideo;
