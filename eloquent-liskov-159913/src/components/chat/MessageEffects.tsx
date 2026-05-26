/**
 * MessageEffects — Full-screen message send animations (iMessage-style)
 * Supports: confetti, fireworks, lasers, hearts, celebration
 */
import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EffectType } from "./messageEffectUtils";

interface MessageEffectsProps {
  effect: EffectType;
  onComplete: () => void;
}

// Confetti particle colors
const CONFETTI_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
];

function ConfettiParticle({ index, total }: { index: number; total: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const startX = Math.random() * 100;
  const delay = Math.random() * 0.8;
  const duration = 2.5 + Math.random() * 1.5;
  const rotation = Math.random() * 720 - 360;
  const size = 6 + Math.random() * 8;
  const isCircle = Math.random() > 0.5;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${startX}%`,
        top: -20,
        width: size,
        height: isCircle ? size : size * 0.4,
        backgroundColor: color,
        borderRadius: isCircle ? "50%" : "2px",
      }}
      initial={{ y: 0, opacity: 1, rotate: 0, scale: 0 }}
      animate={{
        y: [0, window.innerHeight + 100],
        opacity: [0, 1, 1, 0],
        rotate: [0, rotation],
        scale: [0, 1, 1, 0.5],
        x: [0, (Math.random() - 0.5) * 200],
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

function FireworkBurst({ x, y, delay }: { x: number; y: number; delay: number }) {
  const particles = Array.from({ length: 12 });
  const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];

  return (
    <>
      {particles.map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const distance = 60 + Math.random() * 80;
        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: 5,
              height: 5,
              backgroundColor: color,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              x: [0, Math.cos(angle) * distance],
              y: [0, Math.sin(angle) * distance + 40],
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.2,
              delay: delay,
              ease: "easeOut",
            }}
          />
        );
      })}
      {/* Center flash */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: 20,
          height: 20,
          background: `radial-gradient(circle, ${color}, transparent)`,
          transform: "translate(-50%, -50%)",
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 3, 0], opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.6, delay }}
      />
    </>
  );
}

function LaserBeam({ index }: { index: number }) {
  const colors = ["#00ff88", "#00ffff", "#ff00ff", "#ffff00", "#ff4444"];
  const color = colors[index % colors.length];
  const startY = 10 + Math.random() * 80;
  const delay = index * 0.15;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: `${startY}%`,
        width: "100%",
        height: 3,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        boxShadow: `0 0 15px ${color}, 0 0 30px ${color}`,
      }}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{
        scaleX: [0, 1, 0],
        opacity: [0, 1, 0],
        x: ["-100%", "0%", "100%"],
      }}
      transition={{
        duration: 0.8,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

function FloatingHeart({ index }: { index: number }) {
  const startX = 20 + Math.random() * 60;
  const size = 20 + Math.random() * 30;
  const delay = Math.random() * 1.5;

  return (
    <motion.div
      className="absolute pointer-events-none text-center"
      style={{
        left: `${startX}%`,
        bottom: 0,
        fontSize: size,
      }}
      initial={{ y: 0, opacity: 0, scale: 0 }}
      animate={{
        y: [0, -(window.innerHeight * 0.8)],
        opacity: [0, 1, 1, 0],
        scale: [0, 1.2, 1, 0.8],
        x: [0, Math.sin(index) * 50, -Math.sin(index) * 30],
      }}
      transition={{
        duration: 3 + Math.random(),
        delay,
        ease: "easeOut",
      }}
    >
      ❤️
    </motion.div>
  );
}

export default function MessageEffects({ effect, onComplete }: MessageEffectsProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!effect) return;
    timerRef.current = setTimeout(onComplete, 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [effect, onComplete]);

  return (
    <AnimatePresence>
      {effect && (
        <motion.div
          className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {effect === "confetti" && (
            Array.from({ length: 60 }).map((_, i) => (
              <ConfettiParticle key={i} index={i} total={60} />
            ))
          )}

          {effect === "fireworks" && (
            <>
              <FireworkBurst x={30} y={25} delay={0} />
              <FireworkBurst x={70} y={20} delay={0.4} />
              <FireworkBurst x={50} y={35} delay={0.8} />
              <FireworkBurst x={20} y={45} delay={1.2} />
              <FireworkBurst x={80} y={40} delay={1.6} />
            </>
          )}

          {effect === "lasers" && (
            Array.from({ length: 8 }).map((_, i) => (
              <LaserBeam key={i} index={i} />
            ))
          )}

          {effect === "hearts" && (
            Array.from({ length: 15 }).map((_, i) => (
              <FloatingHeart key={i} index={i} />
            ))
          )}

          {effect === "celebration" && (
            <>
              {Array.from({ length: 40 }).map((_, i) => (
                <ConfettiParticle key={`c-${i}`} index={i} total={40} />
              ))}
              <FireworkBurst x={50} y={30} delay={0.5} />
              <FireworkBurst x={25} y={40} delay={1} />
              <FireworkBurst x={75} y={35} delay={1.5} />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
