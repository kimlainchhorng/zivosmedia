import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Eraser, Circle, Square, Type, Download, Undo2, Redo2, Palette, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Tool = "pen" | "eraser" | "circle" | "rect" | "text";
const COLORS = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#ffffff"];
const SIZES = [2, 4, 8, 12];

export default function WhiteboardPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getCtx = () => canvasRef.current?.getContext("2d");

  const startDraw = useCallback((e: React.PointerEvent) => {
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    lastPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const draw = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !lastPos.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPos.current = { x, y };
  }, [isDrawing, tool, color, size]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const clearCanvas = () => {
    const ctx = getCtx();
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const downloadCanvas = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: "pen", icon: Pencil, label: "Pen" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="text-lg font-bold text-ig-gradient">Whiteboard</h1>
          </div>
          <div className="flex gap-1">
            <Button aria-label="Clear" variant="ghost" size="icon" className="h-8 w-8" onClick={clearCanvas}><Trash2 className="h-4 w-4" /></Button>
            <Button aria-label="Download" variant="ghost" size="icon" className="h-8 w-8" onClick={downloadCanvas}><Download className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative touch-none">
        <canvas ref={canvasRef} width={390} height={500} className="w-full bg-white cursor-crosshair"
          onPointerDown={startDraw} onPointerMove={draw} onPointerUp={endDraw} onPointerLeave={endDraw} />
      </div>

      {/* Toolbar */}
      <div className="border-t border-border p-3 space-y-2">
        {showColors && (
          <div className="flex gap-2 flex-wrap pb-2">
            {COLORS.map((c) => (
              <button type="button" key={c} onClick={() => { setColor(c); setShowColors(false); }}
                className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-primary scale-110" : "border-muted"}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {tools.map((t) => (
              <Button key={t.id} aria-label={t.label || t.id} variant={tool === t.id ? "default" : "outline"} size="icon" className="h-9 w-9"
                onClick={() => setTool(t.id)}>
                <t.icon className="h-4 w-4" />
              </Button>
            ))}
            <Button aria-label="Choose color" variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowColors(!showColors)}>
              <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: color }} />
            </Button>
          </div>
          <div className="flex gap-1">
            {SIZES.map((s) => (
              <button type="button" key={s} onClick={() => setSize(s)}
                className={`h-8 w-8 rounded-lg flex items-center justify-center ${size === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div className="rounded-full bg-current" style={{ width: s + 2, height: s + 2 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
