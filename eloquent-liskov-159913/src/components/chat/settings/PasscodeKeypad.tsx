import { useEffect, useState } from "react";
import { Delete } from "lucide-react";

interface Props {
  length?: 4 | 6;
  onComplete: (pin: string) => void;
  resetSignal?: number; // bump to clear
  title?: string;
  subtitle?: string;
}

export default function PasscodeKeypad({ length = 4, onComplete, resetSignal, title, subtitle }: Props) {
  const [pin, setPin] = useState("");

  useEffect(() => { setPin(""); }, [resetSignal]);

  useEffect(() => {
    if (pin.length === length) onComplete(pin);
  }, [pin, length, onComplete]);

  const press = (d: string) => setPin((p) => (p.length < length ? p + d : p));
  const back = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      {title && <div className="text-base font-semibold text-foreground">{title}</div>}
      {subtitle && <div className="text-sm text-muted-foreground -mt-4">{subtitle}</div>}
      <div className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 ${
              i < pin.length ? "bg-primary border-primary" : "border-border"
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <button type="button"
            key={d}
            onClick={() => press(d)}
            className="w-16 h-16 rounded-full bg-muted text-foreground text-2xl font-light hover:bg-muted/70 active:scale-95 transition"
          >
            {d}
          </button>
        ))}
        <div />
        <button type="button"
          onClick={() => press("0")}
          className="w-16 h-16 rounded-full bg-muted text-foreground text-2xl font-light hover:bg-muted/70 active:scale-95 transition"
        >
          0
        </button>
        <button type="button"
          onClick={back}
          aria-label="Delete"
          className="w-16 h-16 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
