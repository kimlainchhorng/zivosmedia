/**
 * Shared video repair utility using FFmpeg WASM.
 * Used by both admin upload and customer feed playback.
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import ffmpegWorkerUrl from "@ffmpeg/ffmpeg/worker?url";

const FFMPEG_CDN_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
const ffmpegCoreUrl = `${FFMPEG_CDN_BASE}/ffmpeg-core.js`;
const ffmpegWasmUrl = `${FFMPEG_CDN_BASE}/ffmpeg-core.wasm`;

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

async function ensureFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      try {
        const blobCoreURL = await toBlobURL(ffmpegCoreUrl, "text/javascript");
        const blobWasmURL = await toBlobURL(ffmpegWasmUrl, "application/wasm");
        const blobWorkerURL = await toBlobURL(ffmpegWorkerUrl, "text/javascript");

        await ffmpeg.load({
          coreURL: blobCoreURL,
          wasmURL: blobWasmURL,
          workerURL: blobWorkerURL,
        });
      } catch (blobErr) {
        console.warn("[videoRepair] Blob URL load failed, retrying with direct URLs", blobErr);
        try {
          await ffmpeg.load({
            coreURL: ffmpegCoreUrl,
            wasmURL: ffmpegWasmUrl,
            workerURL: ffmpegWorkerUrl,
          });
        } catch (workerErr) {
          console.warn("[videoRepair] Worker URL load failed, retrying without workerURL", workerErr);
          await ffmpeg.load({
            coreURL: ffmpegCoreUrl,
            wasmURL: ffmpegWasmUrl,
          });
        }
      }
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })().catch((err) => {
      ffmpegLoadPromise = null;
      throw err;
    });
  }

  return ffmpegLoadPromise;
}

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const tid = setTimeout(() => reject(new Error(msg)), ms);
    promise.then((v) => { clearTimeout(tid); resolve(v); }).catch((e) => { clearTimeout(tid); reject(e); });
  });
}

/** Probe whether a File/Blob is playable in the current browser */
export function probeVideoPlayable(file: File | Blob): Promise<boolean> {
  const url = URL.createObjectURL(file);
  return new Promise<boolean>((resolve) => {
    const v = document.createElement("video");
    let done = false;
    const finish = (ok: boolean) => { if (done) return; done = true; clearTimeout(tid); v.removeAttribute("src"); v.load(); URL.revokeObjectURL(url); resolve(ok); };
    const tid = setTimeout(() => finish(false), 5000);
    v.addEventListener("loadeddata", () => finish(true));
    v.addEventListener("error", () => finish(false));
    v.preload = "auto";
    v.muted = true;
    v.src = url;
    v.load();
  });
}

/**
 * Repair a video blob so it plays in browsers while preserving audio when present.
 * Tries: 1) video copy + AAC audio normalization (fast), 2) full transcode (slower).
 * Returns a playable blob URL or null.
 */
export async function repairVideoBlob(blob: Blob): Promise<string | null> {
  const file = new File([blob], "repair.mp4", { type: blob.type || "video/mp4" });

  // Stage 1: keep video, normalize audio to AAC-LC for broader browser compatibility.
  try {
    const normalized = await withTimeout(ffmpegProcess(file, [
      "-i", "INPUT",
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-movflags", "+faststart",
      "-c:v", "copy",
      "-c:a", "aac",
      "-profile:a", "aac_low",
      "-ar", "44100",
      "-ac", "2",
      "-b:a", "128k",
      "-y",
      "OUTPUT",
    ]), 20000, "Audio normalize timeout");
    if (await probeVideoPlayable(normalized)) {
      return URL.createObjectURL(normalized);
    }
  } catch (e) {
    console.warn("[videoRepair] Audio normalize failed:", e);
  }

  // Stage 2: full transcode with AAC audio.
  try {
    const transcoded = await withTimeout(ffmpegProcess(file, [
      "-i", "INPUT",
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-movflags", "+faststart",
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-profile:v", "baseline",
      "-level", "3.0",
      "-c:a", "aac",
      "-profile:a", "aac_low",
      "-ar", "44100",
      "-ac", "2",
      "-b:a", "128k",
      "-y",
      "OUTPUT",
    ]), 35000, "Transcode timeout");
    if (await probeVideoPlayable(transcoded)) {
      return URL.createObjectURL(transcoded);
    }
  } catch (e) {
    console.warn("[videoRepair] Transcode failed:", e);
  }

  return null;
}

async function ffmpegProcess(file: File, args: string[]): Promise<File> {
  const ffmpeg = await ensureFFmpeg();
  const inputName = `in-${Date.now()}.mp4`;
  const outputName = `out-${Date.now()}.mp4`;

  const realArgs = args.map((a) => a === "INPUT" ? inputName : a === "OUTPUT" ? outputName : a);

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  try {
    await ffmpeg.exec(realArgs);
    const data = await ffmpeg.readFile(outputName);
    if (!(data instanceof Uint8Array)) throw new Error("Read failed");
    const buf = new ArrayBuffer(data.byteLength);
    new Uint8Array(buf).set(data);
    return new File([buf], `repaired-${Date.now()}.mp4`, { type: "video/mp4" });
  } finally {
    await Promise.allSettled([ffmpeg.deleteFile(inputName), ffmpeg.deleteFile(outputName)]);
  }
}
