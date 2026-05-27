/**
 * GiftAnimationOverlay — Cinematic gift animation over live stream
 * Premium full-screen experience with rich golden glow, particles & video
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { giftImages, preloadGiftImages } from "@/config/giftIcons";
import { giftAnimationVideos, preloadGiftAnimations } from "@/config/giftAnimations";
import { getGiftLevel } from "@/config/giftCatalog";
import goldCoinIcon from "@/assets/gifts/gold-coin.png";


/**
 * Per-gift transparent PNG override (static image fallback).
 * Empty — Black Panther uses its MP4 with screen blend mode for transparency.
 */
const transparentGiftOverrides: Record<string, string> = {};

/**
 * Gifts whose MP4 should render with NO dark backdrop overlay.
 * The video itself has a pure black background that gets keyed out via
 * mix-blend-mode: screen, so only the glowing subject shows over the stream.
 */
const noBackdropVideoGifts = new Set<string>(["Black Panther"]);

interface GiftAnimationOverlayProps {
  activeGift: { name: string; coins: number; senderName?: string } | null;
  onComplete: () => void;
  giftPanelOpen?: boolean;
  comboCount?: number;
}

function GiftAnimationOverlay({ activeGift, onComplete, giftPanelOpen, comboCount = 1 }: GiftAnimationOverlayProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onCompleteRef = useRef(onComplete);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasReadyRef = useRef(false);
  const [animKey, setAnimKey] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  onCompleteRef.current = onComplete;

  const giftImg = activeGift ? giftImages[activeGift.name] : undefined;
  const transparentOverride = activeGift ? transparentGiftOverrides[activeGift.name] : undefined;
  const videoUrl = activeGift && !transparentOverride ? giftAnimationVideos[activeGift.name] : undefined;
  // When a transparent PNG override exists, route through the icon path using that PNG.
  const effectiveGiftImg = transparentOverride ?? giftImg;
  const isPremium = activeGift ? activeGift.coins >= 100 : false;
  const isUltra = activeGift ? activeGift.coins >= 5000 : false;
  const isLegendary = activeGift ? activeGift.coins >= 20000 : false;
  const hasVideo = Boolean(videoUrl) && !videoError;

  // Derive color theme from gift name
  const giftTheme = useMemo(() => {
    if (!activeGift) return { h: 30, s: 90, name: "gold" }; // default gold
    const n = activeGift.name.toLowerCase();
    if (n.includes("dragon") || n.includes("emerald") || n.includes("eagle")) return { h: 145, s: 80, name: "emerald" };
    if (n.includes("fire") || n.includes("phoenix") || n.includes("ferrari")) return { h: 15, s: 95, name: "fire" };
    if (n.includes("ice") || n.includes("penguin") || n.includes("crystal") || n.includes("diamond")) return { h: 200, s: 85, name: "ice" };
    if (n.includes("sapphire") || n.includes("swan") || n.includes("galaxy")) return { h: 225, s: 80, name: "sapphire" };
    if (n.includes("gold") || n.includes("crown") || n.includes("treasure") || n.includes("castle") || n.includes("throne")) return { h: 42, s: 95, name: "gold" };
    if (n.includes("neon") || n.includes("rocket")) return { h: 280, s: 85, name: "neon" };
    if (n.includes("panther") || n.includes("bugatti") || n.includes("lambo") || n.includes("royce") || n.includes("yacht")) return { h: 0, s: 0, name: "luxury" };
    if (n.includes("panda") || n.includes("platinum")) return { h: 260, s: 30, name: "platinum" };
    if (n.includes("cosmic") || n.includes("celestial")) return { h: 270, s: 75, name: "cosmic" };
    if (n.includes("rainbow") || n.includes("butterfly")) return { h: 300, s: 70, name: "rainbow" };
    if (n.includes("cobra") || n.includes("snake")) return { h: 85, s: 70, name: "venom" };
    if (n.includes("wolf") || n.includes("shadow")) return { h: 220, s: 20, name: "shadow" };
    if (n.includes("cat") || n.includes("lucky")) return { h: 50, s: 90, name: "gold" };
    return { h: 30, s: 90, name: "gold" };
  }, [activeGift]);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    onCompleteRef.current();
  }, []);

  // Mini sparkle trails for the banner gift icon
  const bannerTrails = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      delay: i * 0.15,
      x: -(12 + i * 8),
      y: -4 + Math.sin(i * 1.2) * 6,
      size: 3 + Math.random() * 3,
    })),
  [animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sparkle particles — more for expensive gifts
  const particleCount = isLegendary ? 24 : isUltra ? 18 : isPremium ? 14 : 10;
  const sparkles = useMemo(() =>
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      angle: (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3,
      dist: 50 + Math.random() * 100,
      size: 3 + Math.random() * 6,
      delay: i * 0.03,
      dur: 1.4 + Math.random() * 1,
      color: ["#FFD700", "#FF6B6B", "#A78BFA", "#34D399", "#F472B6", "#FBBF24", "#60A5FA", "#FB923C", "#E879F9", "#FCD34D", "#FF9500", "#00D4FF"][i % 12],
    })),
  [animKey, particleCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Expanding rings
  const ringCount = isUltra ? 6 : isPremium ? 5 : 3;
  const rings = useMemo(() =>
    Array.from({ length: ringCount }, (_, i) => ({
      id: i,
      delay: 0.1 + i * 0.12,
      size: 40 + i * 22,
    })),
  [animKey, ringCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Floating embers for premium
  const embers = useMemo(() =>
    isUltra ? Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 15 + Math.random() * 70,
      delay: Math.random() * 2,
      dur: 2.5 + Math.random() * 2,
      size: 2 + Math.random() * 3,
    })) : [],
  [animKey, isUltra]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeGift) return;
    setAnimKey((k) => k + 1);
    setVideoReady(false);
    setVideoError(false);
    setCanvasReady(false);
    canvasReadyRef.current = false;
    // Reset video element for new gift
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, [activeGift]);

  useEffect(() => {
    if (!activeGift) return;
    const dur = activeGift.coins >= 9999 ? 12000 : isUltra ? 9000 : isPremium ? 8000 : 6000;
    timeoutRef.current = setTimeout(dismiss, dur);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };
  }, [activeGift, dismiss, isPremium, isUltra, isLegendary]);

  // Video ready → mark canvas ready (no chroma-key needed, using CSS blend mode)
  useEffect(() => {
    if (!activeGift || !hasVideo || !videoReady) return;
    setCanvasReady(true);
  }, [activeGift, hasVideo, videoReady]);

  if (!activeGift) return null;

  const comboIntensity = Math.min(comboCount, 20);
  const comboColor = comboCount >= 10 ? "#FF4500" : comboCount >= 5 ? "#FF6B6B" : "#FFD700";
  const comboScale = 1 + Math.min(comboCount * 0.05, 0.6);

  // Gift size tiers — transparent overrides render much larger to match video gifts
  const giftSizeClass = transparentOverride
    ? "w-[85vw] h-[85vw] max-w-[520px] max-h-[520px]"
    : isLegendary
    ? "w-44 h-44"
    : isUltra
    ? "w-36 h-36"
    : isPremium
    ? "w-28 h-28"
    : "w-20 h-20";

  return (
    <AnimatePresence>
      <motion.div
        key={animKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[99998] pointer-events-auto overflow-hidden"
        onClick={dismiss}
      >
        {/* Solid dark backdrop — skipped for transparent overrides and for screen-blend video gifts */}
        {!transparentOverride && !(activeGift && noBackdropVideoGifts.has(activeGift.name)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hasVideo ? 0.85 : isPremium ? 0.65 : 0.4 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black z-[0]"
          />
        )}
        {/* ── Cinematic backdrop ── */}
        {isPremium && (
          <>
            {/* Dark vignette */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isUltra ? 0.7 : 0.4 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-[0]"
              style={{
                background: "radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.6) 100%)",
              }}
            />
            {/* Rich warm glow center */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-0 z-[1]"
              style={{
                background: isLegendary
                  ? "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255,170,0,0.35) 0%, rgba(255,100,0,0.15) 30%, rgba(180,50,0,0.05) 60%, transparent 80%)"
                  : isUltra
                  ? "radial-gradient(ellipse 55% 45% at 50% 40%, rgba(255,150,0,0.28) 0%, rgba(255,100,0,0.1) 35%, transparent 75%)"
                  : "radial-gradient(ellipse 50% 40% at 50% 40%, rgba(255,150,0,0.18) 0%, rgba(255,100,0,0.06) 40%, transparent 70%)",
              }}
            />
            {/* Animated golden pulse */}
            <motion.div
              className="absolute inset-0 z-[1]"
              animate={{ opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background: "radial-gradient(circle at 50% 38%, rgba(255,200,50,0.2) 0%, transparent 50%)",
              }}
            />
          </>
        )}

        {/* ── Video animation — full-screen with blend mode ── */}
        {hasVideo && (
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: canvasReady ? 1 : 0, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0 z-[2] flex items-center justify-center"
            style={{ mixBlendMode: "screen" }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay muted loop playsInline preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
              onLoadedData={() => setVideoReady(true)}
              onError={() => setVideoError(true)}
            />
          </motion.div>
        )}

        {/* ── Fallback: icon animation (also used for transparent PNG overrides) ── */}
        {!hasVideo && effectiveGiftImg && (
          <div
            className="absolute inset-0 flex items-center justify-center z-[2]"
            style={{ marginTop: giftPanelOpen ? "-40%" : "-5%" }}
          >
            {/* Expanding ring pulses */}
            {rings.map((r) => (
              <motion.div
                key={`ring-${r.id}`}
                className="absolute rounded-full"
                style={{
                  width: r.size,
                  height: r.size,
                  border: `${isUltra ? 2 : 1}px solid`,
                  borderColor: isLegendary
                    ? "rgba(255,200,50,0.5)"
                    : isPremium
                    ? "rgba(255,150,0,0.4)"
                    : "rgba(255,200,0,0.25)",
                }}
                initial={{ scale: 0, opacity: 0.9 }}
                animate={{ scale: [0, 3], opacity: [0.7, 0] }}
                transition={{ duration: 1.8, delay: r.delay, ease: "easeOut" }}
              />
            ))}

            {/* Sparkle particles */}
            {sparkles.map((s) => (
              <motion.div
                key={s.id}
                className="absolute"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0.7, 0],
                  x: Math.cos(s.angle) * s.dist * (isUltra ? 1.5 : isPremium ? 1.3 : 1),
                  y: Math.sin(s.angle) * s.dist * (isUltra ? 1.5 : isPremium ? 1.3 : 1),
                  scale: [0, 1.8, 0.4, 0],
                  rotate: [0, 240],
                }}
                transition={{ duration: s.dur, delay: s.delay, ease: "easeOut" }}
              >
                <svg viewBox="0 0 24 24" fill={s.color} style={{
                  width: s.size * (isUltra ? 1.5 : isPremium ? 1.3 : 1),
                  height: s.size * (isUltra ? 1.5 : isPremium ? 1.3 : 1),
                  filter: `drop-shadow(0 0 6px ${s.color})`,
                }}>
                  <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
                </svg>
              </motion.div>
            ))}

            {/* Multi-layer glow */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: isUltra ? 220 : isPremium ? 160 : 110,
                height: isUltra ? 220 : isPremium ? 160 : 110,
                background: isLegendary
                  ? "radial-gradient(circle, rgba(255,200,50,0.45) 0%, rgba(255,130,0,0.15) 40%, transparent 70%)"
                  : isUltra
                  ? "radial-gradient(circle, rgba(255,170,30,0.4) 0%, rgba(255,120,0,0.12) 40%, transparent 70%)"
                  : isPremium
                  ? "radial-gradient(circle, rgba(255,150,0,0.3) 0%, rgba(255,100,0,0.08) 50%, transparent 70%)"
                  : "radial-gradient(circle, rgba(255,200,0,0.2) 0%, rgba(255,180,0,0.05) 50%, transparent 70%)",
              }}
              animate={{ scale: [0.8, 1.4, 1, 1.2], opacity: [0.3, 0.8, 0.5, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Second glow layer for ultra */}
            {isUltra && (
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 280,
                  height: 280,
                  background: "radial-gradient(circle, rgba(255,100,0,0.15) 0%, transparent 60%)",
                }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
            )}

            {/* Gift icon — bigger, more dramatic entrance */}
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 100, rotate: -20 }}
              animate={{ scale: [0, 1.2, 0.88, 1.05, 1], opacity: 1, y: 0, rotate: [-20, 8, -3, 0] }}
              transition={{ type: "spring", damping: 9, stiffness: 140, mass: 0.7, delay: 0.05 }}
              className="relative z-10"
            >
              <motion.img
                src={effectiveGiftImg}
                alt={activeGift.name}
                className={`${giftSizeClass} object-contain`}
                style={{
                  filter: isLegendary
                    ? "drop-shadow(0 0 40px rgba(255,170,0,0.7)) drop-shadow(0 0 80px rgba(255,100,0,0.3)) drop-shadow(0 6px 16px rgba(0,0,0,0.5))"
                    : isUltra
                    ? "drop-shadow(0 0 30px rgba(255,150,0,0.6)) drop-shadow(0 0 60px rgba(255,100,0,0.2)) drop-shadow(0 5px 14px rgba(0,0,0,0.45))"
                    : isPremium
                    ? "drop-shadow(0 0 22px rgba(255,150,0,0.5)) drop-shadow(0 4px 12px rgba(0,0,0,0.4))"
                    : "drop-shadow(0 0 14px rgba(255,200,0,0.4)) drop-shadow(0 4px 10px rgba(0,0,0,0.35))",
                }}
                animate={{
                  y: [0, -8, 0],
                  scale: [1, 1.06, 1],
                  rotate: [0, 2, -2, 0],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
        )}

        {/* ── Floating embers (ultra+ gifts) ── */}
        {embers.map((e) => (
          <motion.div
            key={`ember-${e.id}`}
            className="absolute z-[2] rounded-full"
            style={{
              left: `${e.x}%`,
              bottom: "10%",
              width: e.size,
              height: e.size,
              background: "radial-gradient(circle, rgba(255,180,0,0.9), rgba(255,100,0,0.4))",
              boxShadow: "0 0 6px rgba(255,150,0,0.6)",
            }}
            initial={{ opacity: 0, y: 0 }}
            animate={{
              opacity: [0, 0.8, 0.5, 0],
              y: [-20, -300 - Math.random() * 200],
              x: [0, (Math.random() - 0.5) * 60],
            }}
            transition={{ duration: e.dur, delay: e.delay, ease: "easeOut", repeat: Infinity, repeatDelay: 1 }}
          />
        ))}

        {/* ── Sender banner — 3D level-scaled ── */}
        {(() => {
          const level = getGiftLevel(activeGift.coins);
          const is3D = level >= 3;
          const isEpic = level >= 6;
          const isMythic = level >= 8;
          const isImmortal = level >= 10;

          // Level-driven color accents
          const lvColors: Record<number, { bg: string; glow: string; text: string; badge: string }> = {
            1: { bg: "from-zinc-800/95 to-zinc-700/80", glow: "rgba(161,161,170,0.15)", text: "text-zinc-300", badge: "bg-zinc-600/60 border-zinc-500/40" },
            2: { bg: "from-green-900/95 to-green-800/80", glow: "rgba(74,222,128,0.2)", text: "text-green-300", badge: "bg-green-700/60 border-green-500/40" },
            3: { bg: "from-blue-900/95 to-blue-800/80", glow: "rgba(96,165,250,0.25)", text: "text-blue-300", badge: "bg-blue-700/60 border-blue-400/40" },
            4: { bg: "from-purple-900/95 to-purple-800/80", glow: "rgba(167,139,250,0.3)", text: "text-purple-300", badge: "bg-purple-700/60 border-purple-400/40" },
            5: { bg: "from-pink-900/95 to-pink-800/80", glow: "rgba(244,114,182,0.3)", text: "text-pink-300", badge: "bg-pink-700/60 border-pink-400/40" },
            6: { bg: "from-amber-900/95 to-amber-800/80", glow: "rgba(251,191,36,0.35)", text: "text-amber-300", badge: "bg-amber-600/60 border-amber-400/50" },
            7: { bg: "from-orange-900/95 to-orange-700/85", glow: "rgba(251,146,60,0.4)", text: "text-orange-300", badge: "bg-orange-600/60 border-orange-400/50" },
            8: { bg: "from-red-950/98 to-red-800/85", glow: "rgba(248,113,113,0.45)", text: "text-red-300", badge: "bg-red-600/60 border-red-400/50" },
            9: { bg: "from-rose-950/98 to-rose-800/85", glow: "rgba(251,113,133,0.5)", text: "text-rose-300", badge: "bg-rose-600/60 border-rose-400/50" },
            10: { bg: "from-yellow-900/98 via-amber-800/90 to-orange-900/85", glow: "rgba(253,224,71,0.55)", text: "text-yellow-200", badge: "bg-yellow-500/60 border-yellow-300/50" },
          };
          const lv = lvColors[level] || lvColors[1];

          // Level label
          const lvLabel = level >= 10 ? "👑 Immortal" : level >= 8 ? "🔥 Mythic" : level >= 6 ? "⭐ Epic" : level >= 4 ? "💎 Rare" : undefined;

          return (
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: "spring", damping: 16, stiffness: 140, delay: 0.15 }}
              className="absolute left-0 z-[3]"
              style={{ top: giftPanelOpen ? "10%" : "22%", perspective: is3D ? "1000px" : undefined }}
            >
              <motion.div
                className="relative"
                animate={is3D ? { y: [0, -3, 0], rotateX: [0, 1.5, 0] } : {}}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformStyle: is3D ? "preserve-3d" : undefined }}
              >
                {/* 3D depth shadow — stronger per level */}
                {is3D && (
                  <div
                    className="absolute inset-0 rounded-r-[28px]"
                    style={{
                      transform: `translateZ(-${6 + level}px) translateY(${3 + level * 0.5}px)`,
                      background: `rgba(0,0,0,${0.3 + level * 0.04})`,
                      filter: `blur(${10 + level * 2}px)`,
                    }}
                  />
                )}

                {/* Main card */}
                <div
                  className={`relative flex items-center gap-2.5 pl-3 pr-5 py-2.5 rounded-r-[28px] overflow-hidden bg-gradient-to-r ${lv.bg}`}
                  style={{
                    backdropFilter: `blur(${14 + level * 2}px) saturate(${1 + level * 0.08})`,
                    boxShadow: `0 ${4 + level}px ${20 + level * 4}px ${lv.glow}, inset 0 1px 0 rgba(255,255,255,${0.08 + level * 0.03}), inset 0 -1px 0 rgba(0,0,0,0.3)`,
                    borderTop: `1px solid rgba(255,255,255,${0.1 + level * 0.03})`,
                    borderRight: `1px solid rgba(255,255,255,${0.05 + level * 0.015})`,
                    transform: is3D ? `translateZ(${2 + level}px)` : undefined,
                  }}
                >
                  {/* Shine sweep — faster for higher levels */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: Math.max(1.5, 4 - level * 0.25), repeat: Infinity, repeatDelay: Math.max(1, 5 - level * 0.4), ease: "easeInOut" }}
                    style={{
                      background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,${0.06 + level * 0.02}) 45%, rgba(255,255,255,${0.12 + level * 0.03}) 50%, rgba(255,255,255,${0.06 + level * 0.02}) 55%, transparent 60%)`,
                      width: "50%",
                    }}
                  />

                  {/* Outer glow ring for epic+ */}
                  {isEpic && (
                    <motion.div
                      className="absolute inset-0 rounded-r-[28px] pointer-events-none"
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      style={{ boxShadow: `inset 0 0 ${10 + level * 3}px ${lv.glow}` }}
                    />
                  )}

                  {/* Gift icon area */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.25, stiffness: 300 }}
                    className="relative shrink-0 w-12 h-12"
                  >
                    {/* Glowing ring behind icon — intensity scales with level */}
                    <motion.div
                      className="absolute inset-[-4px] rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${lv.glow}, transparent 70%)`,
                      }}
                      animate={is3D ? { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {giftImg && (
                      <motion.img
                        src={giftImg}
                        alt={activeGift.name}
                        className="w-12 h-12 object-contain relative z-10"
                        animate={is3D ? {
                          y: [0, -3, 0, -1.5, 0],
                          rotate: [0, 4, -3, 2, 0],
                          scale: [1, 1.1, 1, 1.05, 1],
                        } : {}}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                          filter: `drop-shadow(0 2px 8px rgba(0,0,0,0.6)) drop-shadow(0 0 ${8 + level * 2}px ${lv.glow})`,
                        }}
                      />
                    )}
                  </motion.div>

                  {/* Text + level badges */}
                  <motion.div className="min-w-0 flex-1" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    {/* Sender name */}
                    <p className="text-white text-[13px] font-extrabold leading-tight truncate" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}>
                      {activeGift.senderName || "Someone"}
                    </p>

                    {/* Level badges row */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {/* Level badge */}
                      <span
                        className={`inline-flex items-center px-1.5 py-[1px] rounded-full text-[9px] font-black tracking-wide border ${lv.badge} ${lv.text}`}
                        style={{ textShadow: level >= 6 ? `0 0 6px ${lv.glow}` : undefined }}
                      >
                        Lv.{level}
                      </span>

                      {/* Tier badge for rare+ */}
                      {lvLabel && (
                        <motion.span
                          className={`inline-flex items-center px-1.5 py-[1px] rounded-full text-[9px] font-bold border ${lv.badge} ${lv.text}`}
                          animate={isMythic ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                          style={{ textShadow: `0 0 6px ${lv.glow}` }}
                        >
                          {lvLabel}
                        </motion.span>
                      )}
                    </div>

                    {/* Gift name */}
                    <p className={`text-[10px] font-semibold leading-tight mt-0.5 ${lv.text} opacity-80`}>
                      sent <span className="text-white font-bold opacity-100">{activeGift.name}</span>
                    </p>
                  </motion.div>

                  {/* Coin badge */}
                  <motion.div
                    initial={{ scale: 0, rotateZ: 20 }}
                    animate={{ scale: 1, rotateZ: 0 }}
                    transition={{ type: "spring", delay: 0.45, stiffness: 280 }}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 ml-1 shrink-0 border ${lv.badge}`}
                    style={{
                      backdropFilter: "blur(8px)",
                      boxShadow: `0 2px 10px ${lv.glow}`,
                    }}
                  >
	                    <img src={goldCoinIcon} alt="" className="w-3.5 h-3.5" loading="lazy" decoding="async" style={{ filter: "drop-shadow(0 0 4px rgba(255,200,0,0.5))" }} />
                    <span className="text-amber-100 text-[12px] font-black tabular-nums" style={{ textShadow: "0 0 6px rgba(255,200,0,0.4), 0 1px 3px rgba(0,0,0,0.6)" }}>
                      {activeGift.coins.toLocaleString()}
                    </span>
                  </motion.div>

                  {/* Immortal level particle border effect */}
                  {isImmortal && (
                    <>
                      {Array.from({ length: 8 }, (_, i) => (
                        <motion.div
                          key={`border-p-${i}`}
                          className="absolute rounded-full pointer-events-none"
                          style={{
                            width: 3,
                            height: 3,
                            background: "#FCD34D",
                            boxShadow: "0 0 6px #FCD34D",
                            top: `${10 + Math.random() * 80}%`,
                            left: `${5 + Math.random() * 90}%`,
                          }}
                          animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1.5, 0],
                            y: [0, -(10 + Math.random() * 20)],
                          }}
                          transition={{
                            duration: 1 + Math.random(),
                            delay: i * 0.2,
                            repeat: Infinity,
                            repeatDelay: 1,
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}

        {/* ── Combo counter ── */}
        {comboCount >= 2 && (
          <motion.div
            key={`combo-${comboCount}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2.2, 1], opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute right-5 z-[3]"
            style={{ top: giftPanelOpen ? "18%" : "35%" }}
          >
            {comboCount >= 3 && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  width: 90, height: 90, top: "50%", left: "50%", marginTop: -45, marginLeft: -45,
                  background: `radial-gradient(circle, ${comboColor}44, transparent 70%)`,
                }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
            <motion.div className="flex flex-col items-center">
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] font-black uppercase tracking-[0.2em] mb-[-2px]"
                style={{ color: comboColor, textShadow: `0 0 12px ${comboColor}90` }}
              >
                combo
              </motion.span>
              <motion.span
                key={comboCount}
                animate={{
                  scale: [comboScale + 0.4, comboScale - 0.1, comboScale],
                  rotate: comboCount >= 5 ? [0, -6, 6, -3, 0] : [0],
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="font-black block"
                style={{
                  fontSize: `${Math.min(52 + comboIntensity * 2, 78)}px`,
                  color: comboColor,
                  textShadow: `0 0 ${12 + comboIntensity * 2}px ${comboColor}90, 0 0 ${35 + comboIntensity * 3}px ${comboColor}50, 0 3px 10px rgba(0,0,0,0.8)`,
                  WebkitTextStroke: comboCount >= 5 ? "2px rgba(255,255,255,0.35)" : "1px rgba(255,255,255,0.2)",
                }}
              >
                ×{comboCount}
              </motion.span>
            </motion.div>
          </motion.div>
        )}

        {/* ── Rising light streaks ── */}
        {[...Array(isPremium ? 7 : 5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bottom-0"
            style={{ left: `${8 + i * (isPremium ? 13 : 18)}%` }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, isPremium ? 0.7 : 0.4, 0], y: -800 }}
            transition={{ duration: 2, delay: 0.15 + i * 0.12, ease: "easeOut" }}
          >
            <div
              className="h-48"
              style={{
                width: isPremium ? 2 : 1,
                background: `linear-gradient(to top, ${
                  ["rgba(255,200,0,0.7)", "rgba(255,120,50,0.5)", "rgba(167,139,250,0.5)", "rgba(255,180,0,0.6)", "rgba(251,191,36,0.6)", "rgba(255,100,0,0.4)", "rgba(255,220,100,0.5)"][i % 7]
                }, transparent)`,
              }}
            />
          </motion.div>
        ))}

        {/* ── Bottom shimmer wave ── */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-[1]"
          style={{
            height: isPremium ? 3 : 1,
            background: isPremium
              ? "linear-gradient(90deg, transparent, rgba(255,200,0,0.8), rgba(255,150,0,0.6), transparent)"
              : "linear-gradient(90deg, transparent, rgba(255,200,0,0.5), transparent)",
          }}
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.5, delay: 0.2, ease: "easeInOut" }}
        />

        {/* ── Edge glow for ultra ── */}
        {isUltra && (
          <>
            <motion.div
              className="absolute top-0 left-0 right-0 h-24 z-[1]"
              style={{ background: "linear-gradient(to bottom, rgba(255,100,0,0.1), transparent)" }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-24 z-[1]"
              style={{ background: "linear-gradient(to top, rgba(255,100,0,0.12), transparent)" }}
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
          </>
        )}

        {/* ── Tap to skip hint ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 2, duration: 0.5 }}
          className="absolute bottom-8 left-0 right-0 text-center text-white/40 text-[11px] font-medium z-[4]"
        >
          Tap to skip
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}

export default GiftAnimationOverlay;
