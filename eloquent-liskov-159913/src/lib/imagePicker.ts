import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

/**
 * Open the device image picker and return the chosen image as a File.
 *
 * On native iOS / Android (Capacitor), uses `@capacitor/camera`'s native
 * Photos picker — required because `<input type="file">` is unreliable in
 * WKWebView (the file picker silently fails to open in some scenarios).
 *
 * On web, falls back to a programmatically-clicked `<input type="file">`.
 *
 * Returns `null` if the user cancels. Surfaces permission/plugin errors as
 * toasts so the failure is visible to the user.
 */
export async function pickImageFromLibrary(): Promise<File | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

      const perm = await Camera.checkPermissions();
      if (perm.photos !== "granted" && perm.photos !== "limited") {
        const req = await Camera.requestPermissions({ permissions: ["photos"] });
        if (req.photos !== "granted" && req.photos !== "limited") {
          toast.error("Photos access denied. Enable it in Settings → ZIVO → Photos.");
          return null;
        }
      }

      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });
      const uri = photo.webPath || photo.path;
      if (!uri) return null;
      // Fetch the local file URI through the WebView to get a real Blob.
      // This is more reliable than reconstructing one from base64 — iOS
      // WKWebView handles native-URI-fetched Blobs better in multipart
      // uploads than ones built via atob() in JS.
      const resp = await fetch(uri);
      const blob = await resp.blob();
      const fmt = (photo.format || "jpeg").toLowerCase();
      const ext = fmt === "jpg" ? "jpg" : fmt;
      const mime = blob.type || `image/${fmt === "jpg" ? "jpeg" : fmt}`;
      return new File([blob], `image.${ext}`, { type: mime });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (/cancell?ed|denied|user/i.test(msg)) return null;
      console.error("[pickImageFromLibrary] native picker failed", err);
      toast.error(`Couldn't open photo picker: ${msg}`);
      return null;
    }
  }

  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}
