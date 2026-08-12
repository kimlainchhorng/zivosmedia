import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Move, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

/**
 * Dependency-free pan + zoom image cropper.
 *
 * The image is rendered "cover" inside a fixed-aspect viewport; the owner drags
 * to pan and uses the slider / wheel to zoom. On confirm we draw the visible
 * viewport region to a canvas at the target output resolution and hand back a
 * Blob. All offset/scale math lives in viewport CSS pixels, so it stays correct
 * regardless of the rendered viewport size (we measure it with ResizeObserver).
 */

const MAX_ZOOM = 4;

interface MediaCropDialogProps {
  open: boolean;
  /** The image file the owner just picked. Null closes the dialog. */
  file: File | null;
  /** Output aspect ratio (width / height). Cover ≈ 16/9, logo = 1. */
  aspect: number;
  title?: string;
  /** Longest output edge in px. */
  outputWidth?: number;
  /** PNG preserves logo transparency; JPEG is smaller for photos. */
  outputType?: "image/jpeg" | "image/png";
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

export function MediaCropDialog({
  open,
  file,
  aspect,
  title = "Adjust image",
  outputWidth = 1600,
  outputType = "image/jpeg",
  onCancel,
  onConfirm,
}: MediaCropDialogProps) {
  const roRef = useRef<ResizeObserver | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // Load the picked file into an object URL (revoked on change/unmount).
  useEffect(() => {
    if (!file) {
      setSrcUrl(null);
      setNatural(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrcUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNatural(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Measure the viewport via a callback ref so it fires exactly when the node
  // mounts — robust to the Radix dialog's portal + open-animation timing, where
  // a plain effect can run before the node is in the DOM and then never retry.
  // clientWidth is transform-proof; the rAF + ResizeObserver catch the settled
  // width once the dialog reaches its final size.
  const setViewportNode = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setView((prev) => (prev.w === w ? prev : { w, h: w / aspect }));
    };
    measure();
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    roRef.current = ro;
  }, [aspect]);

  // Base "cover" scale + current effective scale. `ready` means we know both the
  // image's natural size and a real viewport width, so the fit math is valid —
  // until then the image stays hidden (never rendered at raw natural size).
  const ready = !!natural && view.w > 0;
  const baseScale = ready ? Math.max(view.w / natural!.w, view.h / natural!.h) : 1;
  const scale = baseScale * zoom;

  const clamp = useCallback(
    (x: number, y: number) => {
      if (!natural) return { x, y };
      const dw = natural.w * baseScale * zoom;
      const dh = natural.h * baseScale * zoom;
      return {
        x: Math.min(0, Math.max(view.w - dw, x)),
        y: Math.min(0, Math.max(view.h - dh, y)),
      };
    },
    [natural, baseScale, zoom, view.w, view.h],
  );

  // Center the image once it (and the viewport) are measured.
  const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    imgRef.current = el;
    setNatural({ w: el.naturalWidth, h: el.naturalHeight });
  }, []);

  useEffect(() => {
    if (!natural || !view.w) return;
    const dw = natural.w * baseScale * zoom;
    const dh = natural.h * baseScale * zoom;
    setOffset(clamp((view.w - dw) / 2, (view.h - dh) / 2));
    // Only re-center when the image or viewport changes, not on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, view.w, view.h]);

  // Re-clamp (keeping viewport center anchored) when zoom changes via slider.
  const applyZoom = useCallback(
    (nextZoom: number) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
      if (!natural) {
        setZoom(z);
        return;
      }
      const prevScale = baseScale * zoom;
      const nextScale = baseScale * z;
      // Natural point currently under the viewport center.
      const cx = (-offset.x + view.w / 2) / prevScale;
      const cy = (-offset.y + view.h / 2) / prevScale;
      const nx = view.w / 2 - cx * nextScale;
      const ny = view.h / 2 - cy * nextScale;
      setZoom(z);
      setOffset(() => {
        const dw = natural.w * nextScale;
        const dh = natural.h * nextScale;
        return {
          x: Math.min(0, Math.max(view.w - dw, nx)),
          y: Math.min(0, Math.max(view.h - dh, ny)),
        };
      });
    },
    [natural, baseScale, zoom, offset.x, offset.y, view.w, view.h],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (!natural) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clamp(d.ox + (e.clientX - d.startX), d.oy + (e.clientY - d.startY)));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!natural) return;
    applyZoom(zoom - e.deltaY * 0.0015 * zoom);
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img || !natural || !view.w) return;
    setExporting(true);
    try {
      const outW = Math.round(outputWidth);
      const outH = Math.round(outputWidth / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      // Viewport region expressed in natural image pixels.
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sw = view.w / scale;
      const sh = view.h / scale;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outputType, outputType === "image/jpeg" ? 0.9 : undefined),
      );
      if (!blob) throw new Error("Export failed");
      onConfirm(blob);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-xs">
            <Move className="h-3.5 w-3.5" /> Drag to reposition · scroll or use the slider to zoom
          </DialogDescription>
        </DialogHeader>

        <div className="px-5">
          <div
            ref={setViewportNode}
            className="relative w-full overflow-hidden rounded-xl bg-black touch-none select-none cursor-grab active:cursor-grabbing"
            style={{ aspectRatio: String(aspect) }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onWheel={onWheel}
          >
            {srcUrl && (
              <img
                src={srcUrl}
                alt=""
                loading="eager"
                decoding="async"
                onLoad={onImgLoad}
                draggable={false}
                className="absolute top-0 left-0 max-w-none origin-top-left will-change-transform pointer-events-none"
                style={{
                  width: ready ? natural!.w * scale : "auto",
                  height: ready ? natural!.h * scale : "auto",
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                  visibility: ready ? "visible" : "hidden",
                }}
              />
            )}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 py-4">
            <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              onValueChange={(v) => applyZoom(v[0])}
              disabled={!ready}
              aria-label="Zoom"
            />
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel} disabled={exporting}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!ready || exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
