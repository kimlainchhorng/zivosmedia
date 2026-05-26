/**
 * DocumentScanner — capture photos with the camera (or pick from gallery),
 * apply scan-style filters (Auto / Color / Grayscale / B&W), and export as a
 * multi-page A4 / Letter / Original PDF that gets sent into the chat.
 *
 * Uses jsPDF for output. No OpenCV — keeps the bundle tiny and reliable.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import Camera from "lucide-react/dist/esm/icons/camera";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import RotateCw from "lucide-react/dist/esm/icons/rotate-cw";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

type Filter = "auto" | "color" | "gray" | "bw";
type PageSize = "a4" | "letter" | "original";

interface ScanPage {
  id: string;
  dataUrl: string; // processed
  rotation: 0 | 90 | 180 | 270;
}

interface DocumentScannerProps {
  open: boolean;
  onClose: () => void;
  onComplete: (pdf: Blob, meta: { pageCount: number; filename: string; thumbnail: Blob }) => void;
}

const PAGE_DIMS: Record<PageSize, { w: number; h: number } | null> = {
  a4: { w: 210, h: 297 },     // mm
  letter: { w: 215.9, h: 279.4 },
  original: null,
};

async function processImage(srcDataUrl: string, filter: Filter): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0);

      if (filter !== "color" && filter !== "auto") {
        const id = ctx.getImageData(0, 0, c.width, c.height);
        const d = id.data;
        if (filter === "gray") {
          for (let i = 0; i < d.length; i += 4) {
            const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            d[i] = d[i + 1] = d[i + 2] = g;
          }
        } else if (filter === "bw") {
          // adaptive threshold-ish: boost contrast then threshold
          for (let i = 0; i < d.length; i += 4) {
            const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const v = g > 150 ? 255 : g < 90 ? 0 : Math.round((g - 90) * 4.25);
            d[i] = d[i + 1] = d[i + 2] = v;
          }
        }
        ctx.putImageData(id, 0, 0);
      } else if (filter === "auto") {
        // mild contrast/sat boost
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.globalCompositeOperation = "source-over";
      }

      resolve(c.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = srcDataUrl;
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

export default function DocumentScanner({ open, onClose, onComplete }: DocumentScannerProps) {
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [filter, setFilter] = useState<Filter>("auto");
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setPages([]);
      setFilter("auto");
      setPageSize("a4");
    }
  }, [open]);

  const addFromInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      const newPages: ScanPage[] = [];
      for (const f of files) {
        const raw = await fileToDataUrl(f);
        const processed = await processImage(raw, filter);
        newPages.push({ id: crypto.randomUUID(), dataUrl: processed, rotation: 0 });
      }
      setPages((p) => [...p, ...newPages]);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't add page");
    } finally {
      setBusy(false);
    }
  };

  const reapplyFilter = async (next: Filter) => {
    setFilter(next);
    if (!pages.length) return;
    setBusy(true);
    try {
      const updated: ScanPage[] = [];
      for (const p of pages) {
        const re = await processImage(p.dataUrl, next);
        updated.push({ ...p, dataUrl: re });
      }
      setPages(updated);
    } finally {
      setBusy(false);
    }
  };

  const rotatePage = (id: string) => {
    setPages((ps) =>
      ps.map((p) => (p.id === id ? { ...p, rotation: (((p.rotation + 90) % 360) as ScanPage["rotation"]) } : p))
    );
  };

  const removePage = (id: string) => {
    setPages((ps) => ps.filter((p) => p.id !== id));
  };

  const buildPdf = async () => {
    if (!pages.length) return;
    setBusy(true);
    try {
      const dims = PAGE_DIMS[pageSize];
      // Determine orientation from first page
      const firstImg = await loadImg(pages[0].dataUrl);
      const firstLandscape = firstImg.naturalWidth > firstImg.naturalHeight;
      const orientation: "p" | "l" = firstLandscape ? "l" : "p";

      const doc = new jsPDF({
        orientation,
        unit: "mm",
        format: dims ? [dims.w, dims.h] : [firstImg.naturalWidth * 0.2645, firstImg.naturalHeight * 0.2645],
      });

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const img = await loadImg(p.dataUrl);
        const rotated = await rotateIfNeeded(img, p.rotation);
        const isLandscape = rotated.width > rotated.height;
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();

        if (i > 0) {
          doc.addPage(
            dims ? [dims.w, dims.h] : [rotated.width * 0.2645, rotated.height * 0.2645],
            isLandscape ? "l" : "p"
          );
        }
        // fit with margins
        const margin = dims ? 6 : 0;
        const availW = pageW - margin * 2;
        const availH = pageH - margin * 2;
        const ratio = Math.min(availW / (rotated.width * 0.2645), availH / (rotated.height * 0.2645));
        const drawW = rotated.width * 0.2645 * ratio;
        const drawH = rotated.height * 0.2645 * ratio;
        const x = (pageW - drawW) / 2;
        const y = (pageH - drawH) / 2;
        doc.addImage(rotated.dataUrl, "JPEG", x, y, drawW, drawH, undefined, "FAST");
      }

      const pdfBlob = doc.output("blob");
      // thumbnail = first page jpeg
      const thumbBlob = await dataUrlToBlob(pages[0].dataUrl);
      const filename = `Scan-${new Date().toISOString().slice(0, 10)}-${pages.length}p.pdf`;
      onComplete(pdfBlob, { pageCount: pages.length, filename, thumbnail: thumbBlob });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't build PDF");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="scanner"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1500] bg-background flex flex-col"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 border-b border-border/40 shrink-0"
          style={{
            paddingTop: "var(--zivo-safe-top-sticky)",
            height: "calc(var(--zivo-safe-top-sticky) + 3.5rem)",
          }}
        >
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Scan Document</span>
          </div>
          <button type="button"
            disabled={!pages.length || busy}
            onClick={buildPdf}
            className="px-3 h-9 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Send PDF`}
          </button>
        </div>

        {/* Pages */}
        <div className="flex-1 overflow-y-auto p-4">
          {pages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
              <FileText className="h-12 w-12 opacity-30" />
              <p className="text-sm max-w-[260px]">Capture or pick photos of your document. We'll convert them to a clean PDF.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {pages.map((p, idx) => (
                <div key={p.id} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border/40 bg-muted">
                  <img
	                    src={p.dataUrl}
	                    alt={`Page ${idx + 1}`}
	                    className="w-full h-full object-cover"
	                    loading="lazy"
	                    decoding="async"
	                    style={{ transform: `rotate(${p.rotation}deg)` }}
	                  />
                  <div className="absolute top-1 left-1 text-[10px] bg-background/80 backdrop-blur px-1.5 py-0.5 rounded">
                    Page {idx + 1}
                  </div>
                  <div className="absolute top-1 right-1 flex gap-1">
                    <button type="button" onClick={() => rotatePage(p.id)} className="h-7 w-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => removePage(p.id)} className="h-7 w-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter + size pills */}
        <div className="px-4 pb-2 space-y-2 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {(["auto", "color", "gray", "bw"] as Filter[]).map((f) => (
              <button type="button"
                key={f}
                onClick={() => reapplyFilter(f)}
                disabled={busy}
                className={`px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap ${
                  filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {f === "bw" ? "B&W" : f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
            <div className="w-px bg-border/40 mx-1" />
            {(["a4", "letter", "original"] as PageSize[]).map((s) => (
              <button type="button"
                key={s}
                onClick={() => setPageSize(s)}
                className={`px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap ${
                  pageSize === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="grid grid-cols-2 gap-2 p-4 pt-2 border-t border-border/40 shrink-0" style={{ paddingBottom: "calc(16px + var(--zivo-safe-bottom,0px))" }}>
          <button type="button"
            onClick={() => cameraRef.current?.click()}
            className="h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center gap-2 font-medium"
          >
            <Camera className="h-5 w-5" /> Capture
          </button>
          <button type="button"
            onClick={() => galleryRef.current?.click()}
            className="h-12 rounded-2xl bg-muted flex items-center justify-center gap-2 font-medium"
          >
            <ImageIcon className="h-5 w-5" /> Gallery
          </button>
        </div>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={addFromInput} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={addFromInput} />
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function loadImg(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img load"));
    img.src = dataUrl;
  });
}

async function rotateIfNeeded(img: HTMLImageElement, rotation: number): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!rotation) return { dataUrl: img.src, width: img.naturalWidth, height: img.naturalHeight };
  const c = document.createElement("canvas");
  const swap = rotation === 90 || rotation === 270;
  c.width = swap ? img.naturalHeight : img.naturalWidth;
  c.height = swap ? img.naturalWidth : img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return { dataUrl: c.toDataURL("image/jpeg", 0.9), width: c.width, height: c.height };
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}
