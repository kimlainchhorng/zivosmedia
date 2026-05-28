/**
 * exportFile — saves or shares a generated file across platforms.
 * On native (Capacitor) the WebView ignores `<a download>`, so we write the
 * file to the cache dir and open the system share sheet (Save to Files,
 * Mail, Messages, Print/AirPrint). On the web we fall back to a normal
 * browser download.
 */
import { Capacitor } from "@capacitor/core";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result || "").split(",", 2)[1] || "");
    reader.readAsDataURL(blob);
  });
}

function downloadBlobWeb(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Returns true if a native share sheet was used, false if a web download ran.
 */
export async function exportBlob(blob: Blob, filename: string, dialogTitle: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const { Share } = await import("@capacitor/share");
      const written = await Filesystem.writeFile({
        path: filename,
        data: await blobToBase64(blob),
        directory: Directory.Cache,
      });
      await Share.share({ title: filename, files: [written.uri], dialogTitle });
      return true;
    } catch (error: any) {
      const message = String(error?.message || "").toLowerCase();
      if (message.includes("cancel") || message.includes("dismiss")) return true;
      console.warn("Native export unavailable, falling back to web download", error);
    }
  }
  downloadBlobWeb(blob, filename);
  return false;
}
