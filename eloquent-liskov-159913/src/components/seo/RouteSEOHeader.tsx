 /**
  * RouteSEOHeader Component
  * Premium route header with dynamic H1, price display, and real-time micro-copy
  */
 
 import { format } from "date-fns";
 import { Plane } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface RouteSEOHeaderProps {
   origin: string;
   destination: string;
   originCode?: string;
   destCode?: string;
   lowPrice?: number;
   currency?: string;
   className?: string;
 }
 
 export default function RouteSEOHeader({
   origin,
   destination,
   originCode,
   destCode,
   lowPrice,
   currency = "USD",
   className,
 }: RouteSEOHeaderProps) {
   const currentMonth = format(new Date(), "MMMM");
   const currentYear = new Date().getFullYear();
 
   return (
     <section
       className={cn(
         "p-8 bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50",
         className
       )}
     >
       <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
           <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
             Fly from{" "}
             <span className="text-primary">{origin}</span>
             {originCode && (
               <span className="text-muted-foreground text-xl ml-2">({originCode})</span>
             )}{" "}
             to{" "}
             <span className="text-primary">{destination}</span>
             {destCode && (
               <span className="text-muted-foreground text-xl ml-2">({destCode})</span>
             )}
           </h1>
           <p className="text-muted-foreground mt-2 italic text-sm sm:text-base">
             Direct NDC pricing from 300+ airlines. No hidden affiliate fees.
           </p>
           <p className="text-xs text-muted-foreground/70 mt-1">
             Best rates for {currentMonth} {currentYear}
           </p>
         </div>
 
         {lowPrice && (
           <div className="text-left md:text-right shrink-0">
             <span className="text-xs uppercase text-muted-foreground font-bold tracking-wider">
               Starting from
             </span>
             <div className="text-3xl font-black">
               {currency === "USD" ? "$" : currency}
               {lowPrice.toLocaleString()}
             </div>
           </div>
         )}
       </div>
     </section>
   );
 }