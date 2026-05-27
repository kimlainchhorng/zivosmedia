/**
 * ReservationPage — Restaurant table booking flow
 *
 * Funnel:
 *   1. Pick / confirm restaurant (prefilled via ?restaurantId=)
 *   2. Choose date, party size, time slot
 *   3. Add guest details + special request
 *   4. Confirm — show confirmation card with cross-service CTAs
 *
 * Persists to the existing `restaurant_reservations` table. If the insert
 * fails, the user stays in the flow and sees a real error.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Users from "lucide-react/dist/esm/icons/users";
import Clock from "lucide-react/dist/esm/icons/clock";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CrossServiceCTAs from "@/components/shared/CrossServiceCTAs";
import { downloadICS } from "@/lib/buildICS";
import CalendarPlus from "lucide-react/dist/esm/icons/calendar-plus";

type Step = "details" | "confirm" | "done";
type ReservationInsertResult = { id: string | null };
type ReservationError = { message?: string };
type ReservationMutationResult = {
  data: ReservationInsertResult | null;
  error: ReservationError | null;
};
type ReservationMutation = PromiseLike<ReservationMutationResult> & {
  insert: (payload: unknown) => ReservationMutation;
  select: (columns: string) => ReservationMutation;
  maybeSingle: () => Promise<ReservationMutationResult>;
};
type ReservationClient = {
  from: (table: "restaurant_reservations") => ReservationMutation;
};

interface RestaurantLite {
  id: string;
  name: string;
  cuisine_type?: string | null;
  address?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
}

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const TIMES = [
  "11:30", "12:00", "12:30", "13:00", "13:30",
  "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00",
] as const;

export default function ReservationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const restaurantId = params.get("restaurantId") ?? undefined;
  const presetName = params.get("restaurantName") ?? undefined;

  const [restaurant, setRestaurant] = useState<RestaurantLite | null>(
    restaurantId || presetName
      ? { id: restaurantId ?? "preset", name: presetName ?? "Restaurant" }
      : null,
  );
  const [step, setStep] = useState<Step>("details");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [party, setParty] = useState<number>(2);
  const [time, setTime] = useState<string>("19:00");
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId || restaurant?.cuisine_type) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id,name,cuisine_type,address,cover_image_url,logo_url")
        .eq("id", restaurantId)
        .maybeSingle();
      if (!cancelled && data) setRestaurant(data as RestaurantLite);
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, restaurant?.cuisine_type]);

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isValid = !!restaurant && date >= minDate && party > 0 && !!time && name.trim().length >= 2;
  const arrivalDateTime = `${date}T${time}:00`;

  async function submit() {
    if (!isValid || !restaurant) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        restaurant_id: restaurant.id,
        user_id: user?.id ?? null,
        guest_name: name.trim(),
        guest_phone: phone.trim() || null,
        party_size: party,
        reservation_date: date,
        reservation_time: time,
        special_request: note.trim() || null,
        status: "confirmed" as const,
      };
      const reservationClient = supabase as unknown as ReservationClient;
      const { data, error } = await reservationClient
        .from("restaurant_reservations")
        .insert(payload)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) throw new Error("Reservation was not confirmed by the server.");
      setConfirmedId(data.id);
      setStep("done");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "We could not confirm this reservation. Please try again.";
      setSubmitError(message);
      toast({
        title: "Reservation not confirmed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const cover =
    restaurant?.cover_image_url ||
    restaurant?.logo_url ||
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200";

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      {/* Header */}
      <div className="relative h-44 w-full overflow-hidden">
        <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/20" />
        <button type="button"
          onClick={() => navigate(-1)}
          style={{ top: 'calc(var(--zivo-safe-top,0px) + 0.75rem)' }}
          className="absolute left-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="absolute bottom-3 left-4 right-4">
          <div className="text-[11px] uppercase tracking-wider text-white/80 font-bold">Reserve a table</div>
          <div className="text-2xl font-extrabold text-white drop-shadow">
            {restaurant?.name ?? "Pick a restaurant"}
          </div>
          {restaurant?.cuisine_type || restaurant?.address ? (
            <div className="text-xs text-white/85 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{[restaurant?.cuisine_type, restaurant?.address].filter(Boolean).join(" · ")}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-5 max-w-screen-sm mx-auto space-y-5">
        {step !== "done" ? (
          <>
            {/* Date */}
            <section>
              <Label className="flex items-center gap-2 text-sm font-bold mb-2">
                <Calendar className="w-4 h-4 text-primary" /> Date
              </Label>
              <Input
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 text-base"
              />
            </section>

            {/* Party size */}
            <section>
              <Label className="flex items-center gap-2 text-sm font-bold mb-2">
                <Users className="w-4 h-4 text-primary" /> Party size
              </Label>
              <div className="flex flex-wrap gap-2">
                {PARTY_SIZES.map((n) => (
                  <button type="button"
                    key={n}
                    onClick={() => setParty(n)}
                    className={`min-w-[44px] h-11 px-4 rounded-xl border text-sm font-bold transition-all touch-manipulation ${
                      party === n
                        ? "bg-primary text-primary-foreground border-primary shadow"
                        : "bg-card border-border/60 text-foreground"
                    }`}
                  >
                    {n}
                    {n === 8 ? "+" : ""}
                  </button>
                ))}
              </div>
            </section>

            {/* Time */}
            <section>
              <Label className="flex items-center gap-2 text-sm font-bold mb-2">
                <Clock className="w-4 h-4 text-primary" /> Time
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {TIMES.map((t) => (
                  <button type="button"
                    key={t}
                    onClick={() => setTime(t)}
                    className={`h-11 rounded-xl border text-sm font-semibold transition-all touch-manipulation ${
                      time === t
                        ? "bg-primary text-primary-foreground border-primary shadow"
                        : "bg-card border-border/60 text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>

            {/* Guest details */}
            <section className="space-y-3">
              <div>
                <Label htmlFor="r-name" className="text-sm font-bold mb-2 block">
                  Name on reservation
                </Label>
                <Input
                  id="r-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="r-phone" className="text-sm font-bold mb-2 block">
                  Phone
                </Label>
                <Input
                  id="r-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="So the restaurant can reach you"
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="r-note" className="text-sm font-bold mb-2 block">
                  Special request <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="r-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Birthday, allergies, seating preference"
                  className="h-12 text-base"
                />
              </div>
              {submitError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {submitError}
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <DoneCard
            restaurantName={restaurant?.name ?? "the restaurant"}
            date={date}
            time={time}
            party={party}
            confirmedId={confirmedId ?? "—"}
          />
        )}
      </div>

      {/* Sticky CTA */}
      {step !== "done" && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(var(--zivo-safe-bottom,0px)+12px)] pt-3 bg-gradient-to-t from-background via-background/95 to-background/0"
        >
          <Button
            disabled={!isValid || submitting}
            onClick={submit}
            className="w-full h-14 text-base font-bold rounded-2xl shadow-lg"
          >
            <UtensilsCrossed className="w-4 h-4 mr-2" />
            {submitting
              ? "Reserving..."
              : `Reserve for ${party} · ${formatDate(date)} · ${time}`}
          </Button>
        </motion.div>
      )}

      {/* Cross-service follow-up after success */}
      {step === "done" && (
        <div className="px-4 mt-4 max-w-screen-sm mx-auto space-y-3">
          <Button
            variant="outline"
            onClick={() =>
              downloadICS(
                {
                  title: `Table at ${restaurant?.name ?? "Restaurant"}`,
                  description: `${party} guest${party === 1 ? "" : "s"}${
                    note.trim() ? ` · ${note.trim()}` : ""
                  } · Booked via ZIVO`,
                  start: arrivalDateTime,
                  location: restaurant?.name ?? undefined,
                  url:
                    typeof window !== "undefined"
                      ? `${window.location.origin}/eats/restaurant/${restaurant?.id ?? ""}`
                      : undefined,
                },
                `zivo-reservation-${restaurant?.name ?? "table"}`,
              )
            }
            className="w-full h-12 rounded-2xl gap-2"
          >
            <CalendarPlus className="w-4 h-4" /> Add to calendar
          </Button>
          <CrossServiceCTAs
            variant="after-reservation"
            context={{
              restaurantName: restaurant?.name,
              restaurantId: restaurant?.id,
              arrivalDate: arrivalDateTime,
            }}
          />
          <Button
            variant="outline"
            onClick={() => navigate("/eats")}
            className="w-full h-12 rounded-2xl"
          >
            Back to Eats
          </Button>
        </div>
      )}
    </div>
  );
}

function DoneCard({
  restaurantName,
  date,
  time,
  party,
  confirmedId,
}: {
  restaurantName: string;
  date: string;
  time: string;
  party: number;
  confirmedId: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-6 text-center shadow"
    >
      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </div>
      <div className="text-lg font-extrabold text-foreground">Table reserved</div>
      <div className="text-sm text-muted-foreground mt-1">
        {restaurantName} · {formatDate(date)} · {time} · {party} {party === 1 ? "guest" : "guests"}
      </div>
      <div className="text-[11px] text-muted-foreground mt-2">Confirmation: {confirmedId.slice(0, 12)}</div>
    </motion.div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
