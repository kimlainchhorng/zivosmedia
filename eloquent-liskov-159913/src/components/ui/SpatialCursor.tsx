 /**
  * Spatial Cursor Component
  * 2026 trend: Smooth spring-physics cursor with contextual icons
  * Desktop-only enhancement for premium feel
  */
 
 import { useEffect, useState } from "react";
 import { motion, useSpring } from "framer-motion";
 import { useIsMobile } from "@/hooks/use-mobile";
 import { Plane, Building2, Car } from "lucide-react";
 
 type CursorType = "default" | "flight" | "hotel" | "car" | "link";
 
 export const SpatialCursor = () => {
   const isMobile = useIsMobile();
   const [cursorType, setCursorType] = useState<CursorType>("default");
   const [isVisible, setIsVisible] = useState(false);
   
   const springConfig = { damping: 25, stiffness: 700 };
   const cursorX = useSpring(0, springConfig);
   const cursorY = useSpring(0, springConfig);
 
   useEffect(() => {
     // Don't run on mobile
     if (isMobile) return;
 
     const moveMouse = (e: MouseEvent) => {
       cursorX.set(e.clientX - 16);
       cursorY.set(e.clientY - 16);
       setIsVisible(true);
     };
 
     const handleMouseEnter = (e: MouseEvent) => {
       const target = e.target as HTMLElement;
       
       // Check for data-cursor attribute or element context
       const cursorAttr = target.closest("[data-cursor]")?.getAttribute("data-cursor") as CursorType;
       if (cursorAttr) {
         setCursorType(cursorAttr);
         return;
       }
       
       // Auto-detect based on links/buttons
       if (target.closest("a, button, [role='button']")) {
         setCursorType("link");
       }
     };
 
     const handleMouseLeave = () => {
       setCursorType("default");
     };
 
     const hideOnLeave = () => {
       setIsVisible(false);
     };
 
     window.addEventListener("mousemove", moveMouse);
     document.addEventListener("mouseover", handleMouseEnter);
     document.addEventListener("mouseout", handleMouseLeave);
     document.addEventListener("mouseleave", hideOnLeave);
 
     return () => {
       window.removeEventListener("mousemove", moveMouse);
       document.removeEventListener("mouseover", handleMouseEnter);
       document.removeEventListener("mouseout", handleMouseLeave);
       document.removeEventListener("mouseleave", hideOnLeave);
     };
   }, [isMobile, cursorX, cursorY]);
 
   // Don't render on mobile
   if (isMobile) return null;
 
   const isActive = cursorType !== "default";
 
   return (
     <motion.div
       style={{ x: cursorX, y: cursorY }}
       className={`
          fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-40
         flex items-center justify-center text-[10px] font-bold uppercase
         transition-all duration-200 ease-out
         ${isVisible ? "opacity-100" : "opacity-0"}
         ${isActive 
           ? "scale-[2] bg-primary border-none text-primary-foreground shadow-lg" 
           : "scale-100 border border-foreground/20 backdrop-blur-sm bg-background/10"
         }
       `}
     >
        {cursorType === "flight" && <Plane className="w-3 h-3" />}
        {cursorType === "hotel" && <Building2 className="w-3 h-3" />}
        {cursorType === "car" && <Car className="w-3 h-3" />}
       {cursorType === "link" && (
         <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
       )}
     </motion.div>
   );
 };
 
 export default SpatialCursor;