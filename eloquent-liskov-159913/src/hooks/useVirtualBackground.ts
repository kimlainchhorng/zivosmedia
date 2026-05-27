/**
 * useVirtualBackground — clean background replacement using MediaPipe selfie segmentation.
 * Hard binary mask, raw face pixels, no beauty filter, no halo.
 */
import { useEffect, useRef, useState } from "react";
import type { ImageSegmenter } from "@mediapipe/tasks-vision";

export type VirtualBgKind = "off" | "blur" | "image";
export interface VirtualBgConfig {
  kind: VirtualBgKind;
  imageUrl?: string;
  blurPx?: number;
}

export type VirtualBgStatus = "loading" | "ready" | "off" | "error";

export function useVirtualBackground(
  source: MediaStream | null,
  config: VirtualBgConfig,
) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<VirtualBgStatus>("off");
  const cfgRef = useRef(config);
  cfgRef.current = config;

  useEffect(() => {
    if (!source) {
      setStream(null);
      setStatus("off");
      return;
    }

    // Pass-through when off
    if (config.kind === "off") {
      setStream(source);
      setStatus("off");
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let segmenter: ImageSegmenter | null = null;
    let video: HTMLVideoElement | null = null;
    let outStream: MediaStream | null = null;
    let bgImg: HTMLImageElement | null = null;

    const out = document.createElement("canvas");
    const person = document.createElement("canvas");
    const mask = document.createElement("canvas");
    const maskHi = document.createElement("canvas");
    const maskPrev = document.createElement("canvas");
    const octx = out.getContext("2d")!;
    const pctx = person.getContext("2d")!;
    const mctx = mask.getContext("2d")!;
    const mhctx = maskHi.getContext("2d")!;
    const mpctx = maskPrev.getContext("2d")!;
    let hasPrev = false;

    setStatus("loading");

    const init = async () => {
      try {
        // Load background image if needed
        if (cfgRef.current.kind === "image" && cfgRef.current.imageUrl) {
          bgImg = new Image();
          bgImg.crossOrigin = "anonymous";
          bgImg.src = cfgRef.current.imageUrl;
          await new Promise<void>((res, rej) => {
            bgImg!.onload = () => res();
            bgImg!.onerror = () => rej(new Error("bg image failed"));
          });
        }

        // Setup video element
        video = document.createElement("video");
        video.srcObject = source;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        out.width = person.width = maskHi.width = maskPrev.width = w;
        out.height = person.height = maskHi.height = maskPrev.height = h;

        // Publish stream immediately
        outStream = (out as HTMLCanvasElement).captureStream(30);
        // Preserve audio
        source.getAudioTracks().forEach((t) => outStream!.addTrack(t));
        if (!cancelled) setStream(outStream);

        // Init segmenter with timeout
        const initPromise = (async () => {
          const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
          const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
          try {
            segmenter = await ImageSegmenter.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath: "/mediapipe/selfie_segmenter.tflite",
                delegate: "GPU",
              },
              runningMode: "VIDEO",
              outputCategoryMask: false,
              outputConfidenceMasks: true,
            });
          } catch {
            segmenter = await ImageSegmenter.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath: "/mediapipe/selfie_segmenter.tflite",
                delegate: "CPU",
              },
              runningMode: "VIDEO",
              outputCategoryMask: false,
              outputConfidenceMasks: true,
            });
          }
        })();

        const timeout = new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("segmenter timeout")), 8000),
        );

        await Promise.race([initPromise, timeout]);
        if (cancelled) return;
        setStatus("ready");

        const render = () => {
          if (cancelled || !video || !segmenter) return;
          try {
            const ts = performance.now();
            segmenter.segmentForVideo(video, ts, (result) => {
              const cfg = cfgRef.current;
              const W = out.width;
              const H = out.height;

              // 1. Draw background
              if (cfg.kind === "blur") {
                octx.filter = `blur(${cfg.blurPx ?? 22}px)`;
                octx.imageSmoothingEnabled = true;
                octx.drawImage(video!, 0, 0, W, H);
                octx.filter = "none";
              } else if (cfg.kind === "image" && bgImg) {
                octx.filter = "blur(2px) saturate(1.05)";
                octx.imageSmoothingEnabled = true;
                // cover-fit
                const ir = bgImg.width / bgImg.height;
                const cr = W / H;
                let dw = W, dh = H, dx = 0, dy = 0;
                if (ir > cr) {
                  dh = H;
                  dw = H * ir;
                  dx = (W - dw) / 2;
                } else {
                  dw = W;
                  dh = W / ir;
                  dy = (H - dh) / 2;
                }
                octx.drawImage(bgImg, dx, dy, dw, dh);
                octx.filter = "none";
              } else {
                octx.drawImage(video!, 0, 0, W, H);
              }

              // 2. Build soft alpha mask from confidence with wide ramp
              const conf = result.confidenceMasks?.[0];
              if (!conf) {
                rafId = requestAnimationFrame(render);
                return;
              }
              const mw = conf.width;
              const mh = conf.height;
              mask.width = mw;
              mask.height = mh;
              const maskData = conf.getAsFloat32Array();
              const img = mctx.createImageData(mw, mh);
              // Asymmetric vertical ramp: looser on top 25% (hair zone) so fine
              // strands aren't clipped, tighter elsewhere to keep body/hands clean.
              const LO_BODY = 0.50, HI_BODY = 0.58;
              const LO_HAIR = 0.46, HI_HAIR = 0.58;
              const HAIR_BAND = Math.floor(mh * 0.25);
              for (let i = 0; i < maskData.length; i++) {
                const v = maskData[i];
                const y = (i / mw) | 0;
                const inHair = y < HAIR_BAND;
                const LO = inHair ? LO_HAIR : LO_BODY;
                const HI = inHair ? HI_HAIR : HI_BODY;
                let a: number;
                if (v <= LO) a = 0;
                else if (v >= HI) a = 255;
                else {
                  // Smoothstep S-curve: push mid-confidence pixels toward 0/1
                  // → crisper silhouette without changing thresholds.
                  const t = (v - LO) / (HI - LO);
                  a = Math.round(t * t * (3 - 2 * t) * 255);
                }
                const j = i * 4;
                img.data[j] = 255;
                img.data[j + 1] = 255;
                img.data[j + 2] = 255;
                img.data[j + 3] = a;
              }
              mctx.putImageData(img, 0, 0);

              // 2b. Pass 1 — upscale low-res mask to full resolution with bilinear + minimal blur
              mhctx.clearRect(0, 0, W, H);
              mhctx.globalAlpha = 1;
              mhctx.imageSmoothingEnabled = true;
              mhctx.imageSmoothingQuality = "high";
              mhctx.filter = "blur(0.5px)";
              mhctx.drawImage(mask, 0, 0, W, H);
              mhctx.filter = "none";

              // 2b-erode. Light horizontal-only 1px erosion — opens vertical gaps between
              // fingers without eating into the top of the head (where mask confidence is
              // naturally lower on hair). Vertical erosion was clipping the scalp.
              mhctx.globalCompositeOperation = "destination-in";
              mhctx.filter = "none";
              mhctx.drawImage(maskHi, 1, 0, W, H);
              mhctx.globalCompositeOperation = "source-over";

              // 2c. Motion-aware temporal smoothing.
              // Sample-diff current vs previous mask → if user is moving fast
              // (waving hand), drop blend weight so silhouette snaps instead
              // of trailing. Static frames keep full smoothing.
              let blendW = 0.4;
              if (hasPrev) {
                try {
                  // Cheap motion estimate from a downsampled center strip
                  const SX = 32, SY = 32;
                  const cur = mhctx.getImageData(W / 2 - SX / 2, H / 2 - SY / 2, SX, SY).data;
                  const prv = mpctx.getImageData(W / 2 - SX / 2, H / 2 - SY / 2, SX, SY).data;
                  let diff = 0;
                  for (let i = 3; i < cur.length; i += 4) diff += Math.abs(cur[i] - prv[i]);
                  const avgDiff = diff / (SX * SY); // 0..255
                  // >18 ≈ noticeable hand/body motion → snap
                  if (avgDiff > 18) blendW = 0.1;
                  else if (avgDiff > 10) blendW = 0.25;
                } catch {}
                mhctx.globalAlpha = blendW;
                mhctx.drawImage(maskPrev, 0, 0, W, H);
                mhctx.globalAlpha = 1;
              }
              // store current refined mask for next frame
              mpctx.clearRect(0, 0, W, H);
              mpctx.drawImage(maskHi, 0, 0, W, H);
              hasPrev = true;

              // 2d. SMART AI — conservative color-guided halo culling.
              // Only operates on OUTER edge band (alpha 30-160 = likely halo).
              // Verifies FG-ref is solid foreground (α>240) AND BG-ref is solid
              // background (α<15) before acting. Only CULLS halo pixels — never
              // promotes to FG, so face/skin can never be erased.
              try {
                const DS = 2;
                const dw = (W / DS) | 0;
                const dh = (H / DS) | 0;
                const tmpV = document.createElement("canvas");
                tmpV.width = dw; tmpV.height = dh;
                const tvctx = tmpV.getContext("2d")!;
                tvctx.drawImage(video!, 0, 0, dw, dh);
                const tmpM = document.createElement("canvas");
                tmpM.width = dw; tmpM.height = dh;
                const tmctx = tmpM.getContext("2d")!;
                tmctx.drawImage(maskHi, 0, 0, dw, dh);
                const vData = tvctx.getImageData(0, 0, dw, dh).data;
                const mImg = tmctx.getImageData(0, 0, dw, dh);
                const mData = mImg.data;
                // Snapshot original alpha so neighbor reads aren't affected by writes
                const origA = new Uint8ClampedArray(mData.length / 4);
                for (let i = 0, j = 3; j < mData.length; i++, j += 4) origA[i] = mData[j];
                const OFF = 4;
                const toY = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
                const toCb = (r: number, g: number, b: number) => -0.169 * r - 0.331 * g + 0.5 * b + 128;
                const toCr = (r: number, g: number, b: number) => 0.5 * r - 0.419 * g - 0.081 * b + 128;
                for (let y = OFF; y < dh - OFF; y++) {
                  for (let x = OFF; x < dw - OFF; x++) {
                    const pi = y * dw + x;
                    const a = origA[pi];
                    if (a < 30 || a > 160) continue;
                    const aL = origA[y * dw + (x - OFF)];
                    const aR = origA[y * dw + (x + OFF)];
                    const aU = origA[(y - OFF) * dw + x];
                    const aD = origA[(y + OFF) * dw + x];
                    const gx = aR - aL;
                    const gy = aD - aU;
                    let fxp: number, fyp: number, bxp: number, byp: number;
                    if (Math.abs(gx) > Math.abs(gy)) {
                      fxp = gx > 0 ? x + OFF : x - OFF; fyp = y;
                      bxp = gx > 0 ? x - OFF : x + OFF; byp = y;
                    } else {
                      fxp = x; fyp = gy > 0 ? y + OFF : y - OFF;
                      bxp = x; byp = gy > 0 ? y - OFF : y + OFF;
                    }
                    const fAlpha = origA[fyp * dw + fxp];
                    const bAlpha = origA[byp * dw + bxp];
                    if (fAlpha < 240 || bAlpha > 15) continue; // need strong refs
                    const fi = (fyp * dw + fxp) * 4;
                    const bi = (byp * dw + bxp) * 4;
                    const idx = pi * 4;
                    const fr = vData[fi], fg = vData[fi + 1], fb = vData[fi + 2];
                    const br = vData[bi], bg = vData[bi + 1], bb = vData[bi + 2];
                    const pr = vData[idx], pg = vData[idx + 1], pb = vData[idx + 2];
                    const py = toY(pr, pg, pb), pcb = toCb(pr, pg, pb), pcr = toCr(pr, pg, pb);
                    const fy2 = toY(fr, fg, fb), fcb = toCb(fr, fg, fb), fcr = toCr(fr, fg, fb);
                    const by2 = toY(br, bg, bb), bcb = toCb(br, bg, bb), bcr = toCr(br, bg, bb);
                    const dF = (py - fy2) ** 2 + 2 * ((pcb - fcb) ** 2 + (pcr - fcr) ** 2);
                    const dB = (py - by2) ** 2 + 2 * ((pcb - bcb) ** 2 + (pcr - bcr) ** 2);
                    // Only CULL clear halo (BG much closer); never promote
                    if (dB < dF * 0.5) mData[idx + 3] = 0;
                  }
                }
                tmctx.putImageData(mImg, 0, 0);
                mhctx.clearRect(0, 0, W, H);
                mhctx.imageSmoothingEnabled = true;
                mhctx.imageSmoothingQuality = "high";
                mhctx.filter = "blur(0.4px)";
                mhctx.drawImage(tmpM, 0, 0, W, H);
                mhctx.filter = "none";
              } catch {}

              // 3. Draw raw person, then clip with refined mask (Pass 2 — light 0.8px blur)
              pctx.globalCompositeOperation = "source-over";
              pctx.filter = "none";
              pctx.imageSmoothingEnabled = true;
              pctx.imageSmoothingQuality = "high";
              pctx.clearRect(0, 0, W, H);
              pctx.drawImage(video!, 0, 0, W, H);

              // 3b. Single clip pass with the refined mask. The mask itself
              // already has a 0.4px AA blur applied at step 2d, so edges are
              // soft without needing a second destination-in pass (which was
              // multiplying interior alpha and washing out the face).
              pctx.globalCompositeOperation = "destination-in";
              pctx.filter = "none";
              pctx.globalAlpha = 1;
              pctx.imageSmoothingEnabled = true;
              pctx.imageSmoothingQuality = "high";
              pctx.drawImage(maskHi, 0, 0, W, H);
              pctx.globalCompositeOperation = "source-over";

              // 4. Composite person over background
              octx.drawImage(person, 0, 0, W, H);
            });
          } catch (e) {
            // swallow per-frame errors
          }
          rafId = requestAnimationFrame(render);
        };

        rafId = requestAnimationFrame(render);
      } catch (e) {
        console.warn("[useVirtualBackground] init failed, passing through:", e);
        if (!cancelled) {
          setStream(source);
          setStatus("error");
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (segmenter) {
        try {
          segmenter.close();
        } catch {}
        segmenter = null;
      }
      if (outStream) {
        outStream.getTracks().forEach((t) => {
          if (t.kind === "video") t.stop();
        });
        outStream = null;
      }
      if (video) {
        video.pause();
        video.srcObject = null;
        video = null;
      }
      // WebKit (iOS WKWebView) keeps GPU-backed canvas bitmaps alive until the
      // canvas is resized to 0×0. Without this the 5 canvases here leak ~18MB
      // per Live session and accumulate until the OS jetsams the app.
      for (const c of [out, person, mask, maskHi, maskPrev]) {
        c.width = 0;
        c.height = 0;
      }
      bgImg = null;
    };
  }, [source, config.kind, config.imageUrl, config.blurPx]);

  return { stream, status };
}
