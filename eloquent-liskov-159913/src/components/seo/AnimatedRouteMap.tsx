 /**
  * AnimatedRouteMap - SVG route visualization with scroll-triggered path animation
  * Draws a flight path between origin and destination with animated plane icon
  */
 import { useRef } from "react";
 import { motion, useInView, useScroll, useTransform } from "framer-motion";
 import { cn } from "@/lib/utils";
 
 interface AnimatedRouteMapProps {
   originCode: string;
   destCode: string;
   originCity: string;
   destCity: string;
   distance?: string;
   className?: string;
 }
 
 export default function AnimatedRouteMap({
   originCode,
   destCode,
   originCity,
   destCity,
   distance,
   className,
 }: AnimatedRouteMapProps) {
   const containerRef = useRef<HTMLDivElement>(null);
   const isInView = useInView(containerRef, { once: true, amount: 0.3 });
 
   const { scrollYProgress } = useScroll({
     target: containerRef,
     offset: ["start end", "end start"],
   });
 
   // Animate plane position along path (0% to 100%)
   const planeProgress = useTransform(scrollYProgress, [0.2, 0.6], [0, 1]);
 
   return (
     <div
       ref={containerRef}
       className={cn(
         "relative w-full max-w-2xl mx-auto py-8",
         className
       )}
     >
       <svg
         viewBox="0 0 400 120"
         className="w-full h-auto"
         preserveAspectRatio="xMidYMid meet"
       >
         {/* Gradient definitions */}
         <defs>
           <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="hsl(var(--primary))" />
             <stop offset="50%" stopColor="hsl(199 89% 48%)" />
             <stop offset="100%" stopColor="hsl(217 91% 60%)" />
           </linearGradient>
           <filter id="glow">
             <feGaussianBlur stdDeviation="2" result="coloredBlur" />
             <feMerge>
               <feMergeNode in="coloredBlur" />
               <feMergeNode in="SourceGraphic" />
             </feMerge>
           </filter>
         </defs>
 
         {/* Origin point */}
         <motion.g
           initial={{ opacity: 0, scale: 0 }}
           animate={isInView ? { opacity: 1, scale: 1 } : {}}
           transition={{ duration: 0.5, delay: 0 }}
         >
           <circle cx="50" cy="60" r="8" fill="url(#routeGradient)" filter="url(#glow)" />
           <circle cx="50" cy="60" r="4" fill="white" />
         </motion.g>
 
         {/* Flight path (curved arc) */}
         <motion.path
           d="M 50 60 Q 200 10 350 60"
           fill="none"
           stroke="url(#routeGradient)"
           strokeWidth="2"
           strokeLinecap="round"
           strokeDasharray="1 0"
           initial={{ pathLength: 0, opacity: 0.3 }}
           animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
           transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
         />
 
         {/* Dashed underlying path */}
         <path
           d="M 50 60 Q 200 10 350 60"
           fill="none"
           stroke="hsl(var(--muted-foreground))"
           strokeWidth="1"
           strokeDasharray="4 4"
           opacity="0.2"
         />
 
         {/* Destination point */}
         <motion.g
           initial={{ opacity: 0, scale: 0 }}
           animate={isInView ? { opacity: 1, scale: 1 } : {}}
           transition={{ duration: 0.5, delay: 1.5 }}
         >
           <circle cx="350" cy="60" r="8" fill="url(#routeGradient)" filter="url(#glow)" />
           <circle cx="350" cy="60" r="4" fill="white" />
         </motion.g>
 
         {/* Animated plane icon */}
         <motion.g
           style={{
             offsetPath: `path("M 50 60 Q 200 10 350 60")`,
             offsetRotate: "auto 90deg",
           }}
           initial={{ offsetDistance: "0%" }}
           animate={isInView ? { offsetDistance: "50%" } : {}}
           transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
         >
           <motion.text
             fontSize="20"
             textAnchor="middle"
             dominantBaseline="middle"
             initial={{ opacity: 0 }}
             animate={isInView ? { opacity: 1 } : {}}
             transition={{ delay: 0.6 }}
           >
             F
           </motion.text>
         </motion.g>
 
         {/* Origin label */}
         <motion.g
           initial={{ opacity: 0, y: 10 }}
           animate={isInView ? { opacity: 1, y: 0 } : {}}
           transition={{ duration: 0.5, delay: 0.2 }}
         >
           <text
             x="50"
             y="90"
             textAnchor="middle"
             className="fill-foreground font-bold text-sm"
             style={{ fontSize: "14px", fontWeight: 700 }}
           >
             {originCode}
           </text>
           <text
             x="50"
             y="105"
             textAnchor="middle"
             className="fill-muted-foreground text-xs"
             style={{ fontSize: "10px" }}
           >
             {originCity}
           </text>
         </motion.g>
 
         {/* Destination label */}
         <motion.g
           initial={{ opacity: 0, y: 10 }}
           animate={isInView ? { opacity: 1, y: 0 } : {}}
           transition={{ duration: 0.5, delay: 1.7 }}
         >
           <text
             x="350"
             y="90"
             textAnchor="middle"
             className="fill-foreground font-bold text-sm"
             style={{ fontSize: "14px", fontWeight: 700 }}
           >
             {destCode}
           </text>
           <text
             x="350"
             y="105"
             textAnchor="middle"
             className="fill-muted-foreground text-xs"
             style={{ fontSize: "10px" }}
           >
             {destCity}
           </text>
         </motion.g>
 
         {/* Distance label (center) */}
         {distance && (
           <motion.g
             initial={{ opacity: 0 }}
             animate={isInView ? { opacity: 1 } : {}}
             transition={{ duration: 0.5, delay: 2 }}
           >
             <text
               x="200"
               y="35"
               textAnchor="middle"
               className="fill-muted-foreground text-xs"
               style={{ fontSize: "10px" }}
             >
               {distance}
             </text>
           </motion.g>
         )}
       </svg>
     </div>
   );
 }