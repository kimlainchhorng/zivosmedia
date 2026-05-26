 /**
  * ScrollReveal - Framer Motion wrapper for scroll-triggered animations
  * Supports fade-up, scale, slide-left, slide-right, and path-draw animations
  */
 import { motion, type Variants } from "framer-motion";
 import { cn } from "@/lib/utils";
 
 type AnimationType = "fade-up" | "fade-down" | "scale" | "slide-left" | "slide-right" | "blur-in";
 
 interface ScrollRevealProps {
   children: React.ReactNode;
   animation?: AnimationType;
   threshold?: number;
   delay?: number;
   duration?: number;
   className?: string;
   once?: boolean;
 }
 
 const animationVariants: Record<AnimationType, Variants> = {
   "fade-up": {
     hidden: { opacity: 0, y: 30 },
     visible: { opacity: 1, y: 0 },
   },
   "fade-down": {
     hidden: { opacity: 0, y: -30 },
     visible: { opacity: 1, y: 0 },
   },
   scale: {
     hidden: { opacity: 0, scale: 0.9 },
     visible: { opacity: 1, scale: 1 },
   },
   "slide-left": {
     hidden: { opacity: 0, x: 50 },
     visible: { opacity: 1, x: 0 },
   },
   "slide-right": {
     hidden: { opacity: 0, x: -50 },
     visible: { opacity: 1, x: 0 },
   },
   "blur-in": {
     hidden: { opacity: 0, filter: "blur(10px)" },
     visible: { opacity: 1, filter: "blur(0px)" },
   },
 };
 
 export function ScrollReveal({
   children,
   animation = "fade-up",
   threshold = 0.3,
   delay = 0,
   duration = 0.6,
   className,
   once = true,
 }: ScrollRevealProps) {
   return (
     <motion.div
       initial="hidden"
       whileInView="visible"
       viewport={{ once, amount: threshold }}
       variants={animationVariants[animation]}
       transition={{
         duration,
         delay,
         ease: [0.25, 0.1, 0.25, 1],
       }}
       className={cn(className)}
     >
       {children}
     </motion.div>
   );
 }
 
 /**
  * Staggered container for child animations
  */
 interface StaggerContainerProps {
   children: React.ReactNode;
   staggerDelay?: number;
   className?: string;
 }
 
 export function StaggerContainer({
   children,
   staggerDelay = 0.1,
   className,
 }: StaggerContainerProps) {
   return (
     <motion.div
       initial="hidden"
       whileInView="visible"
       viewport={{ once: true, amount: 0.2 }}
       variants={{
         hidden: {},
         visible: {
           transition: {
             staggerChildren: staggerDelay,
           },
         },
       }}
       className={cn(className)}
     >
       {children}
     </motion.div>
   );
 }
 
 /**
  * Stagger child - use inside StaggerContainer
  */
 export function StaggerChild({
   children,
   className,
 }: {
   children: React.ReactNode;
   className?: string;
 }) {
   return (
     <motion.div
       variants={{
         hidden: { opacity: 0, y: 20 },
         visible: { opacity: 1, y: 0 },
       }}
       transition={{ duration: 0.5, ease: "easeOut" }}
       className={cn(className)}
     >
       {children}
     </motion.div>
   );
 }
 
 export default ScrollReveal;