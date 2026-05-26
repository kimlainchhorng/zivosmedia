/**
 * use3DTilt — Reactive 3D perspective tilt on mouse move
 * Creates a premium "holographic card" feel
 */
import { useRef, useCallback, useState } from "react";

interface TiltState {
  rotateX: number;
  rotateY: number;
  scale: number;
  glareX: number;
  glareY: number;
}

const defaultState: TiltState = { rotateX: 0, rotateY: 0, scale: 1, glareX: 50, glareY: 50 };

export function use3DTilt(maxTilt = 6, scaleOnHover = 1.02) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<TiltState>(defaultState);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setTilt({
      rotateX: (0.5 - y) * maxTilt,
      rotateY: (x - 0.5) * maxTilt,
      scale: scaleOnHover,
      glareX: x * 100,
      glareY: y * 100,
    });
  }, [maxTilt, scaleOnHover]);

  const handleMouseLeave = useCallback(() => {
    setTilt(defaultState);
  }, []);

  const style: React.CSSProperties = {
    transform: `perspective(800px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
    transition: "transform 0.2s ease-out",
  };

  const glareStyle: React.CSSProperties = {
    background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.12) 0%, transparent 60%)`,
    opacity: tilt.scale > 1 ? 1 : 0,
    transition: "opacity 0.3s ease-out",
  };

  return { ref, style, glareStyle, handleMouseMove, handleMouseLeave, isHovered: tilt.scale > 1 };
}
