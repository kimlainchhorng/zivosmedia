 /**
  * DirectNDCBadge - Trust badge signaling ZIVO uses direct NDC pricing
  * Not an affiliate site - real-time airline rates
  */
 import { motion } from "framer-motion";
 import { Zap, Shield, CheckCircle } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface DirectNDCBadgeProps {
   variant?: "default" | "compact" | "hero";
   className?: string;
 }
 
 export default function DirectNDCBadge({
   variant = "default",
   className,
 }: DirectNDCBadgeProps) {
   if (variant === "compact") {
     return (
       <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         className={cn(
           "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
           "bg-gradient-to-r from-sky-500/10 to-blue-500/10",
           "border border-sky-500/20",
           "text-sm font-medium",
           className
         )}
       >
         <Zap className="w-3.5 h-3.5 text-foreground" />
         <span className="text-foreground dark:text-foreground">Direct NDC Pricing</span>
       </motion.div>
     );
   }
 
   if (variant === "hero") {
     return (
       <motion.div
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.3 }}
         className={cn(
           "relative overflow-hidden rounded-2xl",
           "bg-gradient-to-br from-sky-500/5 via-blue-500/5 to-indigo-500/5",
           "border border-sky-500/20",
           "p-6",
           className
         )}
       >
         {/* Animated glow */}
         <motion.div
           className="absolute inset-0 via-transparent bg-secondary"
           animate={{
             x: ["-100%", "100%"],
           }}
           transition={{
             duration: 3,
             repeat: Infinity,
             repeatType: "loop",
             ease: "linear",
           }}
         />
 
         <div className="relative z-10 flex items-start gap-4">
           <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-secondary">
             <Zap className="w-6 h-6 text-primary-foreground" />
           </div>
           <div className="flex-1">
             <h3 className="text-lg font-bold text-foreground mb-1">
               Direct NDC Pricing
             </h3>
             <p className="text-sm text-muted-foreground mb-3">
               Not an affiliate site — we connect directly to airlines for real-time fares and availability.
             </p>
             <div className="flex flex-wrap gap-3">
               <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                 <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                 <span>Real-time rates</span>
               </div>
               <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                 <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                 <span>Instant confirmation</span>
               </div>
               <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                 <Shield className="w-3.5 h-3.5 text-emerald-500" />
                 <span>Secure booking</span>
               </div>
             </div>
           </div>
         </div>
       </motion.div>
     );
   }
 
   // Default variant
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className={cn(
         "flex items-center gap-3 px-4 py-3 rounded-xl",
         "bg-gradient-to-r from-sky-500/10 to-blue-500/10",
         "border border-sky-500/20",
         className
       )}
     >
       <div className="shrink-0 w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
         <Zap className="w-5 h-5 text-foreground" />
       </div>
       <div>
         <p className="font-semibold text-sm text-foreground dark:text-foreground">
           Direct NDC Pricing
         </p>
         <p className="text-xs text-muted-foreground">
           Not an affiliate — real airline rates
         </p>
       </div>
     </motion.div>
   );
 }