 /**
  * EnhancedBreadcrumbs Component
  * Multi-level geo-hierarchy breadcrumbs for SEO link juice
  * Home > Flights > Country > City > Route
  */
 
 import { ChevronRight, Home, Plane, MapPin } from "lucide-react";
 import { Link } from "react-router-dom";
 import BreadcrumbSchema from "./BreadcrumbSchema";
 import { cn } from "@/lib/utils";
 
 interface BreadcrumbLevel {
   name: string;
   url: string;
   icon?: React.ComponentType<{ className?: string }>;
 }
 
 interface EnhancedBreadcrumbsProps {
   origin?: string;
   originCountry?: string;
   destination?: string;
   destCountry?: string;
   serviceType?: "flights" | "hotels" | "cars";
   className?: string;
 }
 
 // Country mapping for common cities (expandable)
 const CITY_COUNTRIES: Record<string, string> = {
   "new-york": "United States",
   "los-angeles": "United States",
   "chicago": "United States",
   "miami": "United States",
   "san-francisco": "United States",
   "london": "United Kingdom",
   "paris": "France",
   "tokyo": "Japan",
   "dubai": "United Arab Emirates",
   "sydney": "Australia",
   "toronto": "Canada",
   "singapore": "Singapore",
   "hong-kong": "Hong Kong",
   "bangkok": "Thailand",
   "bali": "Indonesia",
   "rome": "Italy",
   "barcelona": "Spain",
   "amsterdam": "Netherlands",
   "berlin": "Germany",
   "munich": "Germany",
 };
 
 export default function EnhancedBreadcrumbs({
   origin,
   originCountry,
   destination,
   destCountry,
   serviceType = "flights",
   className,
 }: EnhancedBreadcrumbsProps) {
   const formatCity = (slug: string) =>
     slug
       .split("-")
       .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
       .join(" ");
 
   const getCountry = (citySlug: string, providedCountry?: string) =>
     providedCountry || CITY_COUNTRIES[citySlug.toLowerCase()] || null;
 
   const originDisplay = origin ? formatCity(origin) : null;
   const destDisplay = destination ? formatCity(destination) : null;
   const resolvedOriginCountry = origin ? getCountry(origin, originCountry) : null;
   const resolvedDestCountry = destination ? getCountry(destination, destCountry) : null;
 
   const items: BreadcrumbLevel[] = [
     { name: "Home", url: "/", icon: Home },
     { name: serviceType.charAt(0).toUpperCase() + serviceType.slice(1), url: `/${serviceType}`, icon: Plane },
   ];
 
   // Add origin country if known
   if (resolvedOriginCountry && origin) {
     items.push({
       name: resolvedOriginCountry,
       url: `/${serviceType}/country/${resolvedOriginCountry.toLowerCase().replace(/\s+/g, "-")}`,
       icon: MapPin,
     });
   }
 
   // Add origin city
   if (originDisplay && origin) {
     items.push({
       name: originDisplay,
       url: `/${serviceType}/from/${origin.toLowerCase()}`,
     });
   }
 
   // Add route
   if (originDisplay && destDisplay && origin && destination) {
     items.push({
       name: `${originDisplay} to ${destDisplay}`,
       url: `/${serviceType}/${origin.toLowerCase()}-to-${destination.toLowerCase()}`,
     });
   }
 
   return (
     <>
       {/* JSON-LD Schema */}
       <BreadcrumbSchema items={items.map((i) => ({ name: i.name, url: i.url }))} />
 
       {/* Visual Breadcrumbs */}
       <nav
         aria-label="Breadcrumb"
         className={cn("bg-muted/30 border-b border-border/50", className)}
       >
         <div className="container mx-auto px-4">
           <ol className="flex items-center gap-1.5 py-2.5 text-xs overflow-x-auto whitespace-nowrap">
             {items.map((item, index) => (
               <li key={item.url} className="flex items-center gap-1.5">
                 {index > 0 && (
                   <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                 )}
                 {index === items.length - 1 ? (
                   <span className="text-foreground font-medium flex items-center gap-1">
                     {item.icon && <item.icon className="w-3 h-3 text-primary" />}
                     {item.name}
                   </span>
                 ) : (
                   <Link
                     to={item.url}
                     className="text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center gap-1"
                   >
                     {item.icon && <item.icon className="w-3 h-3" />}
                     {index === 0 ? <span className="sr-only">{item.name}</span> : item.name}
                   </Link>
                 )}
               </li>
             ))}
           </ol>
         </div>
       </nav>
     </>
   );
 }