import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { zivoRouteUrl } from "@/lib/maps/openInZivoMap";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft, Wrench, Car, User, Clock, CheckCircle2, Calendar as CalIcon, Phone, MapPin, UserPlus, Store as StoreIcon, Share2, Navigation, CalendarPlus, Sparkles, RotateCcw, Copy, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { getServiceImage } from "@/config/autoRepairServiceImages";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

const TIME_SLOTS = [
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM",
];

const VEHICLE_MODELS: Record<string, string[]> = {
  Acura: ["ILX","Integra","MDX","RDX","TLX"],
  Audi: ["A3","A4","A5","A6","A7","Q3","Q5","Q7","Q8","e-tron"],
  BMW: ["2 Series","3 Series","4 Series","5 Series","7 Series","X1","X3","X5","X7","iX"],
  Buick: ["Enclave","Encore","Envision"],
  Cadillac: ["CT4","CT5","Escalade","XT4","XT5","XT6","Lyriq"],
  Chevrolet: ["Blazer","Camaro","Colorado","Corvette","Equinox","Malibu","Silverado","Suburban","Tahoe","Trailblazer","Traverse"],
  Chrysler: ["300","Pacifica"],
  Dodge: ["Challenger","Charger","Durango","Hornet"],
  Ford: ["Bronco","Edge","Escape","Explorer","F-150","Maverick","Mustang","Ranger","Transit"],
  Genesis: ["G70","G80","G90","GV70","GV80"],
  GMC: ["Acadia","Canyon","Sierra","Terrain","Yukon"],
  Honda: ["Accord","Civic","CR-V","HR-V","Odyssey","Passport","Pilot","Ridgeline"],
  Hyundai: ["Elantra","Ioniq","Kona","Palisade","Santa Fe","Sonata","Tucson","Venue"],
  Infiniti: ["Q50","Q60","QX50","QX55","QX60","QX80"],
  Jaguar: ["E-Pace","F-Pace","F-Type","XF"],
  Jeep: ["Cherokee","Compass","Gladiator","Grand Cherokee","Renegade","Wagoneer","Wrangler"],
  Kia: ["Carnival","EV6","Forte","K5","Seltos","Sorento","Sportage","Stinger","Telluride"],
  "Land Rover": ["Defender","Discovery","Range Rover","Range Rover Sport","Range Rover Velar"],
  Lexus: ["ES","GX","IS","LC","LS","LX","NX","RX","TX","UX"],
  Lincoln: ["Aviator","Corsair","Nautilus","Navigator"],
  Mazda: ["CX-30","CX-5","CX-50","CX-90","Mazda3","MX-5 Miata"],
  "Mercedes-Benz": ["A-Class","C-Class","E-Class","GLA","GLB","GLC","GLE","GLS","S-Class","EQS"],
  Mini: ["Clubman","Countryman","Cooper","Hardtop"],
  Mitsubishi: ["Eclipse Cross","Mirage","Outlander","Outlander Sport"],
  Nissan: ["Altima","Ariya","Frontier","Kicks","Maxima","Murano","Pathfinder","Rogue","Sentra","Titan","Versa"],
  Porsche: ["911","Cayenne","Macan","Panamera","Taycan"],
  Ram: ["1500","2500","3500","ProMaster"],
  Subaru: ["Ascent","BRZ","Crosstrek","Forester","Impreza","Legacy","Outback","Solterra","WRX"],
  Tesla: ["Model 3","Model S","Model X","Model Y","Cybertruck"],
  Toyota: ["4Runner","Camry","Corolla","GR86","Highlander","Prius","RAV4","Sequoia","Sienna","Tacoma","Tundra","Venza"],
  Volkswagen: ["Atlas","Golf","ID.4","Jetta","Taos","Tiguan"],
  Volvo: ["C40","S60","S90","V60","V90","XC40","XC60","XC90"],
};

export default function ServiceBookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [store, setStore] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState<Date>();
  const [confirmation, setConfirmation] = useState<{ ref: string } | null>(null);

  const [form, setForm] = useState({
    product_id: "",
    service_name: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_year: "",
    preferred_time: "",
    notes: "",
  });

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: s } = await supabase
        .from("store_profiles")
        .select("id, name, logo_url, address, phone, category")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!s) { setLoading(false); return; }
      setStore(s);

      // @ts-ignore - deep type instantiation
      const { data: p } = await supabase
        .from("store_products")
        .select("id, name, price, category, image_url")
        .eq("store_id", s.id);
      setServices(p || []);
      // Auto-select service from URL query param
      const preselect = searchParams.get("service");
      if (preselect) {
        const svc = (p || []).find((s: any) => s.name?.toLowerCase() === preselect.toLowerCase());
        setForm(f => ({ ...f, service_name: preselect, product_id: svc?.id || "" }));
      }
      setLoading(false);
    })();
  }, [slug]);

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) {
      toast.error("Store not loaded. Please refresh the page.");
      return;
    }
    if (!form.service_name) {
      toast.error("Please select a service", { description: "Scroll up to choose what you need." });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!date) {
      toast.error("Please pick a preferred date");
      return;
    }
    if (!form.preferred_time) {
      toast.error("Please pick a preferred time");
      return;
    }
    if (!form.customer_name?.trim() || !form.customer_email?.trim() || !form.customer_phone?.trim()) {
      toast.error("Please fill in your name, email, and phone");
      return;
    }
    if (!emailPattern.test(form.customer_email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    const bookingRef = `BK-${Date.now().toString(36).toUpperCase()}`;
    setSubmitting(true);
    const { error } = await supabase.from("service_bookings").insert({
      store_id: store.id,
      product_id: form.product_id || null,
      service_name: form.service_name,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      vehicle_make: form.vehicle_make || null,
      vehicle_model: form.vehicle_model || null,
      vehicle_year: form.vehicle_year || null,
      preferred_date: format(date, "yyyy-MM-dd"),
      preferred_time: form.preferred_time,
      notes: form.notes || null,
    });
    setSubmitting(false);
    if (error) {
      console.error("Booking insert error:", error);
      toast.error("Failed to submit booking", { description: error.message || "Please try again." });
      return;
    }
    toast.success("Booking submitted!");
    setConfirmation({ ref: bookingRef });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!store) return <div className="flex flex-col items-center justify-center min-h-screen gap-4"><p className="text-muted-foreground">Store not found</p><Button onClick={() => navigate("/")}>Go Home</Button></div>;

  /* ───── Booking Confirmation Screen ───── */
  if (confirmation) {
    const dateStr = date ? format(date, "yyyyMMdd") : "";
    const [timeRaw, ampm] = (form.preferred_time || "9:00 AM").split(" ");
    const [hRaw, mRaw] = timeRaw.split(":");
    let hour = parseInt(hRaw, 10);
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    const startTime = `${String(hour).padStart(2, "0")}${(mRaw || "00").padStart(2, "0")}00`;
    const endHour = (hour + 1) % 24;
    const endTime = `${String(endHour).padStart(2, "0")}${(mRaw || "00").padStart(2, "0")}00`;
    const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${form.service_name} @ ${store.name}`)}&dates=${dateStr}T${startTime}/${dateStr}T${endTime}&details=${encodeURIComponent(`Booking Ref: ${confirmation.ref}\nVehicle: ${form.vehicle_year} ${form.vehicle_make} ${form.vehicle_model}\nNotes: ${form.notes || "—"}`)}&location=${encodeURIComponent(store.address || store.name)}`;
    const directionsUrl = (store.address || store.name)
      ? zivoRouteUrl({
          lat: typeof (store as any).latitude === "number" ? (store as any).latitude : undefined,
          lng: typeof (store as any).longitude === "number" ? (store as any).longitude : undefined,
          label: store.name,
          address: store.address,
        })
      : "";
    const shareText = `I just booked ${form.service_name} at ${store.name} on ZIVO! Confirmation: ${confirmation.ref}`;

    const copyToClipboard = async (text: string): Promise<boolean> => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {}
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    };

    const handleShare = async () => {
      const shareUrl = `${getPublicOrigin()}/store/${slug}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: "ZIVO Booking", text: shareText, url: shareUrl });
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") return; // user cancelled
        }
      }
      const ok = await copyToClipboard(`${shareText} ${shareUrl}`);
      toast[ok ? "success" : "error"](ok ? "Copied to clipboard!" : "Couldn't copy — please copy manually");
    };

    const copyRef = async () => {
      const ok = await copyToClipboard(confirmation.ref);
      toast[ok ? "success" : "error"](ok ? "Confirmation # copied!" : "Couldn't copy");
    };

    const bookAnother = () => {
      setConfirmation(null);
      setDate(undefined);
      setForm(f => ({ ...f, service_name: "", product_id: "", preferred_time: "", notes: "" }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-emerald-50/30 dark:from-emerald-950/30 dark:via-background dark:to-emerald-950/20 safe-area-top relative overflow-hidden">
        {/* Confetti dots */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm animate-in fade-in slide-in-from-top-10"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${-10 + (i % 5) * 8}%`,
                backgroundColor: ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5],
                animationDelay: `${(i % 8) * 100}ms`,
                animationDuration: "1200ms",
                transform: `rotate(${(i * 31) % 360}deg)`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>

        <div className="max-w-xl mx-auto px-4 py-8 md:py-14 relative z-10">
          {/* Hero */}
          <div className="text-center mb-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-2xl animate-pulse" />
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-2xl shadow-emerald-500/40">
                <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 mb-3">
              <PartyPopper className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Booked Successfully</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2 tracking-tight">You're all set! 🎉</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {store.name} will reach out to <span className="font-semibold text-foreground">{form.customer_phone}</span> shortly to confirm your appointment.
            </p>
          </div>

          {/* Quick action chips */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button type="button"
              onClick={() => window.open(calendarUrl, "_blank")}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card hover:bg-accent border border-border transition active:scale-95"
            >
              <CalendarPlus className="w-5 h-5 text-primary" />
              <span className="text-[11px] font-bold">Add Calendar</span>
            </button>
            <button type="button"
              onClick={() => store.phone && window.open(`tel:${store.phone}`, "_self")}
              disabled={!store.phone}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card hover:bg-accent border border-border transition active:scale-95 disabled:opacity-40"
            >
              <Phone className="w-5 h-5 text-primary" />
              <span className="text-[11px] font-bold">Call Shop</span>
            </button>
            <button type="button"
              onClick={() => directionsUrl && navigate(directionsUrl)}
              disabled={!directionsUrl}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card hover:bg-accent border border-border transition active:scale-95 disabled:opacity-40"
            >
              <Navigation className="w-5 h-5 text-primary" />
              <span className="text-[11px] font-bold">Directions</span>
            </button>
          </div>

          {/* Booking summary card */}
          <Card className="mb-4 shadow-xl border-emerald-100 dark:border-emerald-900/40 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Confirmation #</p>
                <p className="font-mono font-black text-base text-primary">{confirmation.ref}</p>
              </div>
              <button type="button" onClick={copyRef} className="p-2 rounded-lg hover:bg-primary/10 transition" aria-label="Copy">
                <Copy className="w-4 h-4 text-primary" />
              </button>
            </div>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Service</p>
                  <p className="font-bold text-sm text-foreground">{form.service_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CalIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Appointment</p>
                  <p className="font-bold text-sm text-foreground">
                    {date ? format(date, "EEEE, MMMM d") : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{form.preferred_time}</p>
                </div>
              </div>
              {(form.vehicle_make || form.vehicle_model) && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Vehicle</p>
                    <p className="font-bold text-sm text-foreground">{form.vehicle_year} {form.vehicle_make} {form.vehicle_model}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <StoreIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Shop</p>
                  <p className="font-bold text-sm text-foreground">{store.name}</p>
                  {store.address && <p className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{store.address}</p>}
                  {store.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{store.phone}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What happens next */}
          <Card className="mb-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900/40">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-bold text-foreground">What happens next</p>
              </div>
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2"><span className="font-bold text-foreground">1.</span> Shop reviews your request and confirms availability.</li>
                <li className="flex gap-2"><span className="font-bold text-foreground">2.</span> You'll receive a confirmation call/text at <span className="font-semibold text-foreground">{form.customer_phone}</span>.</li>
                <li className="flex gap-2"><span className="font-bold text-foreground">3.</span> Arrive 10 min early on appointment day with your vehicle.</li>
              </ol>
            </CardContent>
          </Card>

          {!user && (
            <Card className="mb-4 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm mb-1">Save this booking to your ZIVO account</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Track appointments, get reminders, and rebook in one tap.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/auth?redirect=${encodeURIComponent(`/store/${slug}`)}`)}
                      className="rounded-lg font-bold h-9"
                    >
                      Create Free Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Primary actions */}
          <div className="flex flex-col gap-2.5">
            <Button
              onClick={() => {
                const shopUrl = `${getPublicOrigin()}/store/${slug}`;
                if (typeof window !== "undefined" && window.location.origin !== getPublicOrigin()) {
                  window.location.href = shopUrl;
                } else {
                  navigate(`/store/${slug}`);
                }
              }}
              className="w-full h-12 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20"
            >
              <StoreIcon className="w-4 h-4" /> Back to Shop
            </Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="outline" onClick={bookAnother} className="h-11 rounded-xl font-bold gap-2">
                <RotateCcw className="w-4 h-4" /> Book Another
              </Button>
              <Button variant="outline" onClick={handleShare} className="h-11 rounded-xl font-bold gap-2">
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-center text-muted-foreground mt-6">
            Confirmation sent to <span className="font-semibold text-foreground">{form.customer_email}</span>
          </p>
        </div>
      </div>
    );
  }

  const selectedService = services.find(s => s.name === form.service_name);
  const serviceImg = form.service_name ? (selectedService?.image_url || getServiceImage(form.service_name)) : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 safe-area-top z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center gap-3">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            {store.logo_url && <img src={store.logo_url} alt="" className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover" />}
            <div>
              <h1 className="font-semibold text-foreground text-sm md:text-base">{store.name}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Book a Service</p>
            </div>
          </div>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit} className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5 md:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 items-start">
        {/* Service Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" /> Select Service
            </CardTitle>
          </CardHeader>
           <CardContent className="space-y-3">
            <select
              value={form.service_name}
              onChange={(e) => {
                const name = e.target.value;
                update("service_name", name);
                const svc = services.find(s => s.name === name);
                update("product_id", svc?.id || "");
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose a service...</option>
              <optgroup label="🛢️ Oil & Fluids">
                <option>Oil Change - Conventional</option>
                <option>Oil Change - Synthetic</option>
                <option>Oil Change - Full Synthetic</option>
                <option>Transmission Fluid Change</option>
                <option>Coolant Flush</option>
                <option>Brake Fluid Flush</option>
                <option>Power Steering Fluid Flush</option>
              </optgroup>
              <optgroup label="🛑 Brake System">
                <option>Front Brake Pads - Replace</option>
                <option>Rear Brake Pads - Replace</option>
                <option>Front Brake Rotors - Replace</option>
                <option>Rear Brake Rotors - Replace</option>
                <option>Brake Caliper - Replace</option>
                <option>Brake Line Repair</option>
              </optgroup>
              <optgroup label="⚙️ Engine">
                <option>Engine Tune-Up</option>
                <option>Spark Plug Replacement</option>
                <option>Timing Belt Replacement</option>
                <option>Serpentine Belt Replacement</option>
                <option>Engine Diagnostic</option>
                <option>Head Gasket Repair</option>
                <option>Engine Mount Replacement</option>
              </optgroup>
              <optgroup label="🔧 Transmission">
                <option>Transmission Repair</option>
                <option>Transmission Rebuild</option>
                <option>Clutch Replacement</option>
                <option>CV Axle Replacement</option>
                <option>Differential Service</option>
              </optgroup>
              <optgroup label="🛞 Tires & Wheels">
                <option>Tire Rotation</option>
                <option>Tire Balance</option>
                <option>Tire Replacement (per tire)</option>
                <option>Wheel Alignment - 2 Wheel</option>
                <option>Wheel Alignment - 4 Wheel</option>
                <option>Flat Tire Repair</option>
              </optgroup>
              <optgroup label="🔩 Suspension & Steering">
                <option>Shock Absorber - Replace</option>
                <option>Strut Assembly - Replace</option>
                <option>Ball Joint Replacement</option>
                <option>Control Arm Replacement</option>
                <option>Tie Rod End Replacement</option>
                <option>Power Steering Pump - Replace</option>
                <option>Steering Rack Replacement</option>
              </optgroup>
              <optgroup label="🔋 Electrical & Battery">
                <option>Battery Replacement</option>
                <option>Alternator Replacement</option>
                <option>Starter Motor Replacement</option>
                <option>Headlight Bulb Replacement</option>
                <option>Fuse Diagnosis & Replace</option>
                <option>Wiring Repair</option>
              </optgroup>
              <optgroup label="❄️ AC / Heating">
                <option>AC Recharge</option>
                <option>AC Compressor Replacement</option>
                <option>Heater Core Replacement</option>
                <option>Thermostat Replacement</option>
                <option>Radiator Replacement</option>
              </optgroup>
              <optgroup label="💨 Exhaust">
                <option>Exhaust Pipe Repair</option>
                <option>Muffler Replacement</option>
                <option>Catalytic Converter Replacement</option>
              </optgroup>
              <optgroup label="🔍 Diagnostics & Inspection">
                <option>Check Engine Light Diagnostic</option>
                <option>Pre-Purchase Inspection</option>
                <option>State Inspection</option>
                <option>Multi-Point Inspection</option>
              </optgroup>
              <optgroup label="🪟 Windshield & Glass">
                <option>Windshield Replacement</option>
                <option>Windshield Chip Repair</option>
              </optgroup>
              <optgroup label="🎨 Body & Paint">
                <option>Paint Correction</option>
                <option>Dent Repair (PDR)</option>
                <option>Bumper Repair</option>
              </optgroup>
              <optgroup label="✨ Detailing">
                <option>Full Detail - Interior & Exterior</option>
                <option>Interior Detail</option>
                <option>Exterior Detail</option>
              </optgroup>
            </select>
            {serviceImg && (
              <img src={serviceImg} alt={form.service_name} className="w-full h-40 object-cover rounded-lg" />
            )}
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Preferred Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Time *</Label>
              <Select value={form.preferred_time} onValueChange={(v) => update("preferred_time", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Full Name *</Label>
              <Input required value={form.customer_name} onChange={e => update("customer_name", e.target.value)} placeholder="John Doe" className="mt-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Email *</Label>
                <Input required type="email" value={form.customer_email} onChange={e => update("customer_email", e.target.value)} placeholder="john@example.com" className="mt-1" />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input required type="tel" value={form.customer_phone} onChange={e => update("customer_phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" /> Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Make</Label>
                <select
                  value={form.vehicle_make}
                  onChange={e => { update("vehicle_make", e.target.value); update("vehicle_model", ""); }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring mt-1"
                >
                  <option value="">Select</option>
                  {["Acura","Audi","BMW","Buick","Cadillac","Chevrolet","Chrysler","Dodge","Ford","Genesis","GMC","Honda","Hyundai","Infiniti","Jaguar","Jeep","Kia","Land Rover","Lexus","Lincoln","Mazda","Mercedes-Benz","Mini","Mitsubishi","Nissan","Porsche","Ram","Subaru","Tesla","Toyota","Volkswagen","Volvo"].map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Model</Label>
                <select
                  value={form.vehicle_model}
                  onChange={e => update("vehicle_model", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring mt-1"
                >
                  <option value="">Select</option>
                  {(VEHICLE_MODELS[form.vehicle_make] || []).map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Year</Label>
                <select
                  value={form.vehicle_year}
                  onChange={e => update("vehicle_year", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring mt-1"
                >
                  <option value="">Select</option>
                  {Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() + 1 - i)).map(y => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="pt-6">
            <Label>Additional Notes</Label>
            <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Any specific issues or requests..." className="mt-1" rows={3} />
          </CardContent>
        </Card>

        </div>

        <Button type="submit" className="w-full md:w-auto md:min-w-[280px] md:mx-auto md:flex h-12 text-base" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Booking Request"}
        </Button>
      </form>
    </div>
  );
}
