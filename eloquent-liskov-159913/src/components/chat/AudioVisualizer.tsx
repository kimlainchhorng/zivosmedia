/**
 * AudioVisualizer — Animated sound bars during active voice calls
 */
import { motion } from "framer-motion";

interface AudioVisualizerProps {
  isActive: boolean;
  barCount?: number;
  className?: string;
}

export default function AudioVisualizer({ isActive, barCount = 5, className = "" }: AudioVisualizerProps) {
  if (!isActive) return null;

  return (
    <div className={`flex items-end justify-center gap-[3px] h-8 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-primary/60"
          animate={{
            height: isActive
              ? [8, 14 + Math.random() * 18, 6, 20 + Math.random() * 12, 10]
              : [4, 4],
          }}
          transition={{
            duration: 0.8 + Math.random() * 0.4,
            repeat: Infinity,
            repeatType: "reverse",
            delay: i * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
