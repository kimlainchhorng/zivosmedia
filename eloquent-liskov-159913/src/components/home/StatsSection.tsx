/**
 * Stats Section - 3D floating counters with depth and parallax
 */
import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Plane from "lucide-react/dist/esm/icons/plane";
import Users from "lucide-react/dist/esm/icons/users";
import Globe from "lucide-react/dist/esm/icons/globe";
import Shield from "lucide-react/dist/esm/icons/shield";
import { cn } from "@/lib/utils";

const stats = [
  { icon: Users, value: 2000000, label: "Travelers Served", suffix: "+", decimals: 0, colorVar: "--flights" },
  { icon: Plane, value: 500, label: "Airlines Compared", suffix: "+", decimals: 0, colorVar: "--primary" },
  { icon: Globe, value: 190, label: "Countries Covered", suffix: "+", decimals: 0, colorVar: "--cars" },
  { icon: Shield, value: 99.9, label: "Uptime Guarantee", suffix: "%", decimals: 1, colorVar: "--hotels" },
];

function AnimatedCounter({ value, suffix, decimals = 0 }: { value: number; suffix: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(eased * value);
      if (progress < 1) requestAnimationFrame(animate);
      else setCount(value);
    };
    requestAnimationFrame(animate);
  }, [inView, value]);

  const formatted = decimals > 0
    ? count.toFixed(decimals)
    : count >= 1000000
      ? `${(count / 1000000).toFixed(0)}M`
      : Math.floor(count).toString();

  return <span ref={ref} className="tabular-nums">{formatted}{suffix}</span>;
}

export default function StatsSection() {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden perspective-container" aria-label="Platform statistics">
      {/* 3D Background mesh */}
      <div className="absolute inset-0 bg-mesh-3d pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30 pointer-events-none" />

      {/* Floating orbs */}
      <div className="orb-3d-1 top-[-10%] left-[20%] opacity-30" />
      <div className="orb-3d-2 bottom-[-10%] right-[15%] opacity-20" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3">By the numbers</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter">
            Trusted by travelers <span className="gradient-text-primary">worldwide</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto preserve-3d">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30, rotateX: -15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12, type: "spring", stiffness: 100 }}
              whileHover={{
                y: -10,
                rotateX: 5,
                rotateY: -3,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              className="text-center group card-3d rounded-2xl p-6 bg-card/50 backdrop-blur-sm border border-border/20"
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.div
                className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center border icon-3d-pop"
                style={{
                  backgroundColor: `hsl(var(${stat.colorVar}) / 0.1)`,
                  borderColor: `hsl(var(${stat.colorVar}) / 0.2)`,
                  transform: "translateZ(20px)",
                }}
                whileHover={{ scale: 1.15, rotateY: 10 }}
              >
                <stat.icon className="w-7 h-7" style={{ color: `hsl(var(${stat.colorVar}))` }} />
              </motion.div>
              <p
                className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tighter mb-2 counter-tick"
                style={{ transform: "translateZ(15px)" }}
              >
                <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
              </p>
              <p
                className="text-sm text-muted-foreground font-medium uppercase tracking-wider"
                style={{ transform: "translateZ(5px)" }}
              >
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}