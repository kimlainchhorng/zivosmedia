/**
 * QR Scanner Modal — uses device camera to scan QR codes for clock in/out.
 * Runs BarcodeDetector when available, with jsQR as a frame-based fallback for mobile reliability.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import jsQR from "jsqr";

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (token: string) => Promise<{ success: boolean; message: string; action?: string }>;
  title?: string;
}

type ScanState = "scanning" | "processing" | "success" | "error";

export function QRScannerModal({ open, onClose, onScan, title = "Scan QR Code" }: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const scanBusyRef = useRef(false);
  const stateRef = useRef<ScanState>("scanning");

  const [state, setState] = useState<ScanState>("scanning");
  const [message, setMessage] = useState("");
  const [actionType, setActionType] = useState("");

  const setScannerState = useCallback((next: ScanState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    barcodeDetectorRef.current = null;
    scanBusyRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, []);

  const readCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return null;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
    if (!video.videoWidth || !video.videoHeight) return null;

    const maxDimension = 960;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    return { canvas, imageData };
  }, []);

  const handleDetectedQR = useCallback(async (rawValue: string) => {
    const normalizedValue = rawValue.trim();
    if (!normalizedValue || stateRef.current !== "scanning") return;

    setScannerState("processing");
    setMessage("Validating QR code...");
    setActionType("");

    try {
      const token = normalizedValue.replace(/^ZIVO_CLOCK:/, "").replace(/^ZIVO:/, "");
      console.info("[QRScanner] QR detected", { length: token.length });

      const result = await onScan(token);
      if (result.success) {
        setScannerState("success");
        setMessage(result.message);
        setActionType(result.action || "");
        return;
      }

      setScannerState("error");
      setMessage(result.message);
    } catch (error) {
      console.error("[QRScanner] Failed to process detected QR", error);
      setScannerState("error");
      setMessage("Failed to process QR code");
    }
  }, [onScan, setScannerState]);

  const scanFrame = useCallback(async () => {
    if (stateRef.current !== "scanning") return;

    const frame = readCurrentFrame();
    if (!frame) return;

    if (barcodeDetectorRef.current) {
      try {
        const barcodes = await barcodeDetectorRef.current.detect(frame.canvas);
        const detectedValue = barcodes.find((barcode: any) => barcode.rawValue)?.rawValue;

        if (detectedValue) {
          console.info("[QRScanner] Detected via BarcodeDetector");
          await handleDetectedQR(detectedValue);
          return;
        }
      } catch (error) {
        console.warn("[QRScanner] BarcodeDetector failed, falling back to jsQR", error);
      }
    }

    const qrCode = jsQR(frame.imageData.data, frame.imageData.width, frame.imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    if (qrCode?.data) {
      console.info("[QRScanner] Detected via jsQR");
      await handleDetectedQR(qrCode.data);
    }
  }, [handleDetectedQR, readCurrentFrame]);

  const startCamera = useCallback(async () => {
    try {
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not available on this device.");
      }

      const cameraOptions: MediaStreamConstraints[] = [
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        {
          audio: false,
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        { audio: false, video: true },
      ];

      let stream: MediaStream | null = null;
      let lastError: unknown = null;

      for (const constraints of cameraOptions) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!stream) {
        throw lastError ?? new Error("Unable to access camera.");
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      barcodeDetectorRef.current = null;

      if (BarcodeDetectorCtor) {
        try {
          const supportedFormats = typeof BarcodeDetectorCtor.getSupportedFormats === "function"
            ? await BarcodeDetectorCtor.getSupportedFormats()
            : ["qr_code"];

          if (supportedFormats.includes("qr_code")) {
            barcodeDetectorRef.current = new BarcodeDetectorCtor({ formats: ["qr_code"] });
          }
        } catch (error) {
          console.warn("[QRScanner] Could not initialize BarcodeDetector", error);
        }
      }

      scanIntervalRef.current = window.setInterval(() => {
        if (scanBusyRef.current || stateRef.current !== "scanning") return;

        scanBusyRef.current = true;
        void scanFrame().finally(() => {
          scanBusyRef.current = false;
        });
      }, 180);
    } catch (error) {
      console.error("[QRScanner] Camera access error", error);
      setScannerState("error");
      setMessage("Camera access denied. Please allow camera permissions and try again.");
    }
  }, [scanFrame, setScannerState, stopCamera]);

  const handleRetry = useCallback(() => {
    setMessage("");
    setActionType("");
    setScannerState("scanning");
  }, [setScannerState]);

  useEffect(() => {
    if (open) {
      handleRetry();
      void startCamera();
    } else {
      stopCamera();
    }

    return stopCamera;
  }, [open, handleRetry, startCamera, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-[360px] p-0 gap-0 rounded-2xl overflow-hidden bg-black">
        <DialogHeader className="px-4 py-3 bg-black/80 backdrop-blur-sm relative z-10">
          <DialogTitle className="text-white text-[14px] font-semibold flex items-center gap-2">
            <Camera className="w-4 h-4" />
            {title}
          </DialogTitle>
          <button type="button"
            onClick={handleClose}
            aria-label="Close scanner"
            className="absolute right-3 top-3 min-w-[44px] min-h-[44px] -m-2 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </DialogHeader>

        <div className="relative aspect-square bg-black">
	          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay preload="none" />
          <canvas ref={canvasRef} className="hidden" />

          {state === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/80 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/80 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/80 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/80 rounded-br-lg" />
                <motion.div
                  className="absolute left-2 right-2 h-0.5 bg-primary shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>
          )}

          <AnimatePresence>
            {state === "processing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center"
              >
                <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
                <p className="text-white text-[13px] font-medium">{message}</p>
              </motion.div>
            )}

            {state === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-emerald-900/80 flex flex-col items-center justify-center"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-3" />
                </motion.div>
                <p className="text-white text-[15px] font-bold mb-1">
                  {actionType === "clock_in" ? "Clocked In!" : actionType === "clock_out" ? "Clocked Out!" : "Success!"}
                </p>
                <p className="text-emerald-200 text-[12px] text-center px-6">{message}</p>
              </motion.div>
            )}

            {state === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center"
              >
                <XCircle className="w-14 h-14 text-red-400 mb-3" />
                <p className="text-white text-[15px] font-bold mb-1">Failed</p>
                <p className="text-red-200 text-[12px] text-center px-6">{message}</p>
                <button type="button"
                  onClick={handleRetry}
                  className="mt-4 px-5 py-2 rounded-full bg-white/20 text-white text-[12px] font-semibold"
                >
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-4 py-3 bg-black/80 text-center">
          <p className="text-white/60 text-[11px]">
            {state === "scanning" ? "Hold the QR fully inside the frame" : ""}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
