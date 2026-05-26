 /**
  * GlassSearchWidget - 2026 Premium Glass Command Center
  * Translucent search widget with spatial UI effects
  */
 
 import { useState, useEffect, useMemo } from "react";
 import { useNavigate } from "react-router-dom";
 import { motion } from "framer-motion";
 import { 
   Plane, 
   Calendar, 
   Users, 
   ArrowRight, 
   ArrowLeftRight,
   RefreshCw,
   AlertCircle
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Label } from "@/components/ui/label";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { Calendar as CalendarComponent } from "@/components/ui/calendar";
 import { format, addDays, isBefore, startOfToday } from "date-fns";
 import { cn } from "@/lib/utils";
 import { useIsMobile } from "@/hooks/use-mobile";
 import LocationAutocomplete, { type LocationOption } from "./LocationAutocomplete";
 import { useAirportSearch } from "./hooks/useLocationSearch";
 import { MobileDatePickerSheet, MobilePassengerCabinSheet } from "@/components/mobile";
 import { useFlightFunnel } from "@/hooks/useFlightFunnel";
 
 type TripType = "round-trip" | "one-way" | "multi-city";
 type CabinClass = "economy" | "premium" | "business" | "first";
 
 interface GlassSearchWidgetProps {
   className?: string;
   onSearch?: (params: URLSearchParams) => void;
 }
 
 export default function GlassSearchWidget({ className, onSearch }: GlassSearchWidgetProps) {
   const navigate = useNavigate();
   const isMobile = useIsMobile();
   const { search: searchAirports, getPopular, getByCode, allOptions } = useAirportSearch();
   const { trackSearchStarted } = useFlightFunnel();
 
   // State
   const [activeTab, setActiveTab] = useState<TripType>("round-trip");
   const [focusedField, setFocusedField] = useState<string | null>(null);
 
   // Location state
   const [fromOption, setFromOption] = useState<LocationOption | null>(null);
   const [fromDisplay, setFromDisplay] = useState("");
   const [toOption, setToOption] = useState<LocationOption | null>(null);
   const [toDisplay, setToDisplay] = useState("");
 
   // Date state
   const [departDate, setDepartDate] = useState<Date | undefined>(addDays(new Date(), 7));
   const [returnDate, setReturnDate] = useState<Date | undefined>(addDays(new Date(), 14));
 
   // Passengers & cabin
   const [passengers, setPassengers] = useState(1);
   const [cabin, setCabin] = useState<CabinClass>("economy");
 
   // Mobile sheet states
   const [departSheetOpen, setDepartSheetOpen] = useState(false);
   const [returnSheetOpen, setReturnSheetOpen] = useState(false);
   const [passengerSheetOpen, setPassengerSheetOpen] = useState(false);
 
   // Validation
   const [errors, setErrors] = useState<Record<string, string>>({});
 
   // Swap cities
   const handleSwap = () => {
     const tempOption = fromOption;
     const tempDisplay = fromDisplay;
     setFromOption(toOption);
     setFromDisplay(toDisplay);
     setToOption(tempOption);
     setToDisplay(tempDisplay);
   };
 
   // Validate form
   const validate = (): boolean => {
     const newErrors: Record<string, string> = {};
     if (!fromOption) newErrors.from = "Select origin airport";
     if (!toOption) newErrors.to = "Select destination airport";
     if (fromOption && toOption && fromOption.value === toOption.value) {
       newErrors.to = "Destination must differ from origin";
     }
     if (!departDate) newErrors.depart = "Select departure date";
     if (activeTab === "round-trip" && !returnDate) {
       newErrors.return = "Select return date";
     }
     setErrors(newErrors);
     return Object.keys(newErrors).length === 0;
   };
 
   // Handle search
   const handleSearch = () => {
     if (!validate()) return;
 
     const fromCode = fromOption?.value || "";
     const toCode = toOption?.value || "";
     const departDateStr = departDate ? format(departDate, "yyyy-MM-dd") : "";
     const returnDateStr = activeTab === "round-trip" && returnDate 
       ? format(returnDate, "yyyy-MM-dd") 
       : undefined;
 
     trackSearchStarted({
       origin: fromCode,
       destination: toCode,
       departureDate: departDateStr,
       returnDate: returnDateStr,
       passengers,
       cabinClass: cabin,
     });
 
     const resultsParams = new URLSearchParams({
       origin: fromCode,
       dest: toCode,
       depart: departDateStr,
       passengers: String(passengers),
       cabin: cabin,
     });
     if (returnDateStr) {
       resultsParams.set("return", returnDateStr);
     }
 
     navigate(`/flights/results?${resultsParams.toString()}`);
     onSearch?.(resultsParams);
   };
 
   const isFormValid = useMemo(() => {
     const hasFrom = !!fromOption;
     const hasTo = !!toOption;
     const hasDepart = !!departDate;
     const hasReturn = activeTab === "one-way" || activeTab === "multi-city" || !!returnDate;
     return hasFrom && hasTo && hasDepart && hasReturn;
   }, [fromOption, toOption, departDate, returnDate, activeTab]);
 
   const tabs: { id: TripType; label: string }[] = [
     { id: "round-trip", label: "Round Trip" },
     { id: "one-way", label: "One Way" },
     { id: "multi-city", label: "Multi-City" },
   ];
 
   return (
     <div className={cn("w-full max-w-5xl mx-auto p-1 relative", className)}>
       {/* Background Glow Effect */}
       <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
 
       <motion.div 
         className="relative z-10 bg-card/80 backdrop-blur-2xl border border-border/50 rounded-[2rem] p-4 sm:p-6 shadow-2xl overflow-hidden"
         initial={{ y: 20, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         transition={{ duration: 0.6 }}
       >
         {/* Tab Selection */}
          <div className="flex gap-4 sm:gap-6 mb-6 sm:mb-8 border-b border-border/50 dark:border-white/5 pb-4 overflow-x-auto hide-scrollbar">
           {tabs.map((tab) => (
             <button type="button"
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                  "text-xs sm:text-sm font-bold uppercase tracking-wider transition-all pb-4 -mb-4 whitespace-nowrap",
                 activeTab === tab.id
                   ? "text-foreground border-b-2 border-primary"
                   : "text-muted-foreground hover:text-foreground/80"
               )}
             >
               {tab.label}
             </button>
           ))}
         </div>
 
         {/* Search Inputs Grid */}
         <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 relative">
           {/* Location Inputs (Merged Visual) - 5 cols */}
           <div className="md:col-span-5 flex flex-col md:flex-row gap-2 md:gap-0 bg-muted/50 dark:bg-white/5 rounded-2xl border border-border/50 dark:border-white/10 p-1 relative group hover:border-primary/30 transition-all duration-200">
             {/* From */}
             <div className={cn(
               "flex-1 relative transition-all rounded-xl",
               focusedField === 'from' && "bg-muted dark:bg-white/5"
             )}>
               <div className="absolute top-3 left-4 text-muted-foreground z-10">
                 <Plane className="w-4 h-4" />
               </div>
               <span className="text-[10px] text-muted-foreground absolute top-1 left-12 uppercase tracking-widest font-bold z-10">
                 Origin
               </span>
               <LocationAutocomplete
                 value={fromOption?.value || ""}
                 displayValue={fromDisplay}
                 onChange={setFromOption}
                 onDisplayChange={setFromDisplay}
                 options={allOptions}
                 searchFn={searchAirports}
                 popularFn={getPopular}
                 placeholder="From where?"
                 accentColor="sky"
                 error={errors.from}
                 required
               className="border-0 bg-transparent h-14 pl-12 pt-4"
               />
             </div>
             
             {/* Divider with swap button */}
             <div className="hidden md:flex items-center justify-center w-8 relative">
               <div className="w-[1px] h-8 bg-border/50 dark:bg-white/10" />
               <button type="button"
                 onClick={handleSwap}
                 className="absolute w-8 h-8 rounded-full bg-background border border-border/50 flex items-center justify-center hover:bg-muted transition-all duration-200 hover:rotate-180 duration-500"
               >
                 <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
               </button>
             </div>
 
             {/* To */}
             <div className={cn(
               "flex-1 relative transition-all rounded-xl",
               focusedField === 'to' && "bg-muted dark:bg-white/5"
             )}>
               <div className="absolute top-3 left-4 text-muted-foreground z-10">
                 <Plane className="w-4 h-4 rotate-90" />
               </div>
               <span className="text-[10px] text-muted-foreground absolute top-1 left-12 uppercase tracking-widest font-bold z-10">
                 Destination
               </span>
               <LocationAutocomplete
                 value={toOption?.value || ""}
                 displayValue={toDisplay}
                 onChange={setToOption}
                 onDisplayChange={setToDisplay}
                 options={allOptions.filter(o => o.value !== fromOption?.value)}
                 searchFn={(q, l) => searchAirports(q, l).filter(o => o.value !== fromOption?.value)}
                 popularFn={(l) => getPopular(l).filter(o => o.value !== fromOption?.value)}
                 placeholder="To where?"
                 accentColor="sky"
                 error={errors.to}
                 required
               className="border-0 bg-transparent h-14 pl-12 pt-4"
               />
             </div>
           </div>
 
           {/* Mobile swap button */}
           <Button
             type="button"
             variant="outline"
             onClick={handleSwap}
             className="w-full h-10 md:hidden rounded-xl border-dashed gap-2"
           >
             <ArrowLeftRight className="w-4 h-4" />
             Swap
           </Button>
 
           {/* Dates - 3 cols */}
           <div className="md:col-span-3 bg-muted/50 dark:bg-white/5 rounded-2xl border border-border/50 dark:border-white/10 p-1 flex relative hover:border-primary/30 transition-all duration-200">
             <div className="flex-1 relative">
               <div className="absolute top-3 left-4 text-muted-foreground">
                 <Calendar className="w-4 h-4" />
               </div>
               <span className="text-[10px] text-muted-foreground absolute top-1 left-12 uppercase tracking-widest font-bold">
                 {activeTab === "round-trip" ? "Dates" : "Departure"}
               </span>
               
               {isMobile ? (
                 <>
                   <Button
                     variant="ghost"
                     onClick={() => setDepartSheetOpen(true)}
                     className="w-full bg-transparent h-14 pl-12 pt-4 justify-start text-left font-medium text-foreground"
                   >
                     {departDate ? format(departDate, "MMM d") : "Select"}
                     {activeTab === "round-trip" && returnDate && (
                       <span className="text-muted-foreground ml-1">
                         – {format(returnDate, "MMM d")}
                       </span>
                     )}
                   </Button>
                   <MobileDatePickerSheet
                     open={departSheetOpen}
                     onOpenChange={setDepartSheetOpen}
                     selectedDate={departDate}
                     onDateSelect={(date) => {
                       setDepartDate(date);
                       if (date && returnDate && isBefore(returnDate, date)) {
                         setReturnDate(addDays(date, 7));
                       }
                     }}
                     label="Departure Date"
                     accentColor="sky"
                   />
                 </>
               ) : (
                 <Popover>
                   <PopoverTrigger asChild>
                     <Button
                       variant="ghost"
                       className="w-full bg-transparent h-14 pl-12 pt-4 justify-start text-left font-medium text-foreground hover:bg-transparent"
                     >
                       {departDate ? format(departDate, "MMM d") : "Select"}
                       {activeTab === "round-trip" && returnDate && (
                         <span className="text-muted-foreground ml-1">
                           – {format(returnDate, "MMM d")}
                         </span>
                       )}
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto p-0" align="start">
                     <CalendarComponent
                       mode="single"
                       selected={departDate}
                       onSelect={(date) => {
                         setDepartDate(date);
                         if (date && returnDate && isBefore(returnDate, date)) {
                           setReturnDate(addDays(date, 7));
                         }
                       }}
                       disabled={(date) => isBefore(date, startOfToday())}
                       initialFocus
                     />
                   </PopoverContent>
                 </Popover>
               )}
             </div>
           </div>
 
           {/* Passengers - 2 cols */}
           <div className="md:col-span-2 bg-muted/50 dark:bg-white/5 rounded-2xl border border-border/50 dark:border-white/10 p-1 flex relative hover:border-primary/30 transition-all duration-200">
             <div className="flex-1 relative flex items-center">
               <div className="absolute left-4 text-muted-foreground">
                 <Users className="w-4 h-4" />
               </div>
               
               {isMobile ? (
                 <>
                   <Button
                     variant="ghost"
                     onClick={() => setPassengerSheetOpen(true)}
                     className="w-full bg-transparent h-14 pl-10 justify-start text-left font-medium text-foreground"
                   >
                     {passengers} Traveler{passengers > 1 ? 's' : ''}
                   </Button>
                  <MobilePassengerCabinSheet
                     open={passengerSheetOpen}
                     onOpenChange={setPassengerSheetOpen}
                     passengers={passengers}
                     cabin={cabin}
                     onPassengersChange={setPassengers}
                     onCabinChange={setCabin}
                   />
                 </>
               ) : (
                 <Popover>
                   <PopoverTrigger asChild>
                     <Button
                       variant="ghost"
                       className="w-full bg-transparent h-14 pl-10 justify-start text-left font-medium text-foreground hover:bg-transparent"
                     >
                       {passengers} Traveler{passengers > 1 ? 's' : ''}
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-64 p-4" align="start">
                     <div className="space-y-4">
                       <div className="flex items-center justify-between">
                         <span className="text-sm font-medium">Travelers</span>
                         <div className="flex items-center gap-2">
                           <Button
                             variant="outline"
                             size="icon"
                             aria-label="Fewer travelers"
                             className="h-8 w-8"
                             onClick={() => setPassengers(Math.max(1, passengers - 1))}
                             disabled={passengers <= 1}
                           >
                             -
                           </Button>
                           <span className="w-8 text-center font-medium">{passengers}</span>
                           <Button
                             variant="outline"
                             size="icon"
                             aria-label="More travelers"
                             className="h-8 w-8"
                             onClick={() => setPassengers(Math.min(9, passengers + 1))}
                             disabled={passengers >= 9}
                           >
                             +
                           </Button>
                         </div>
                       </div>
                       <div>
                         <Label className="text-sm font-medium mb-2 block">Cabin Class</Label>
                         <div className="grid grid-cols-2 gap-2">
                           {["economy", "premium", "business", "first"].map((c) => (
                             <Button
                               key={c}
                               variant={cabin === c ? "default" : "outline"}
                               size="sm"
                               onClick={() => setCabin(c as CabinClass)}
                               className="capitalize"
                             >
                               {c === "premium" ? "Premium" : c}
                             </Button>
                           ))}
                         </div>
                       </div>
                     </div>
                   </PopoverContent>
                 </Popover>
               )}
             </div>
           </div>
 
           {/* Search Button - 2 cols */}
           <motion.button 
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
             onClick={handleSearch}
             disabled={!isFormValid}
             className={cn(
               "md:col-span-2 h-14 md:h-auto",
               "bg-primary rounded-2xl font-bold text-primary-foreground",
               "shadow-lg shadow-primary/25",
               "flex items-center justify-center gap-2",
               "disabled:opacity-50 disabled:cursor-not-allowed",
               "transition-all duration-200 active:scale-[0.98] touch-manipulation"
             )}
           >
             <span>Search</span>
             <ArrowRight className="w-4 h-4" />
           </motion.button>
         </div>
 
         {/* Error messages */}
         {Object.keys(errors).length > 0 && (
           <div className="mt-4 flex flex-wrap gap-2">
             {Object.values(errors).map((error, i) => (
               <span key={i} className="text-xs text-destructive flex items-center gap-1">
                 <AlertCircle className="w-3 h-3" />
                 {error}
               </span>
             ))}
           </div>
         )}
       </motion.div>
     </div>
   );
 }