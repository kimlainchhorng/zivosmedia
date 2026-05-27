/**
 * Passenger form card — Premium 3D spatial design
 */
import { motion } from "framer-motion";
import {
  Calendar, Globe, Mail, Info, AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface PassengerForm {
  title: string;
  given_name: string;
  family_name: string;
  gender: "m" | "f" | "";
  born_on: string;
  email: string;
  phone_number: string;
  nationality: string;
  passport_number: string;
  passport_expiry: string;
}

export const emptyPassenger = (): PassengerForm => ({
  title: "mr",
  given_name: "",
  family_name: "",
  gender: "",
  born_on: "",
  email: "",
  phone_number: "",
  nationality: "",
  passport_number: "",
  passport_expiry: "",
});

export const POPULAR_NATIONALITIES = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
  { code: "IN", label: "India" },
  { code: "SG", label: "Singapore" },
  { code: "KH", label: "Cambodia" },
  { code: "TH", label: "Thailand" },
  { code: "VN", label: "Vietnam" },
  { code: "PH", label: "Philippines" },
  { code: "MY", label: "Malaysia" },
  { code: "CN", label: "China" },
  { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" },
  { code: "AE", label: "UAE" },
  { code: "QA", label: "Qatar" },
];

function getPassportStatus(expiryDate: string): "valid" | "warning" | "expired" | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  const now = new Date();
  if (exp < now) return "expired";
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  if (exp < sixMonths) return "warning";
  return "valid";
}

export function getPassengerCompletion(p: PassengerForm, isInternational: boolean): number {
  const required = ["given_name", "family_name", "gender", "born_on"];
  const optional = isInternational
    ? ["nationality", "passport_number", "passport_expiry"]
    : [];
  const all = [...required, ...optional];
  const filled = all.filter((f) => !!(p as any)[f]).length;
  return Math.round((filled / all.length) * 100);
}

interface PassengerFormCardProps {
  passenger: PassengerForm;
  index: number;
  type: string;
  errors: Record<string, string>;
  isInternational: boolean;
  onUpdate: (field: keyof PassengerForm, value: string) => void;
}

export function PassengerFormCard({
  passenger,
  index,
  type,
  errors,
  isInternational,
  onUpdate,
}: PassengerFormCardProps) {
  const fieldError = (field: string) => errors[`${index}.${field}`];
  const completion = getPassengerCompletion(passenger, isInternational);
  const passportStatus = getPassportStatus(passenger.passport_expiry);

  const inputCn = (field: string) => cn(
    "h-11 rounded-xl text-[13px] transition-all",
    "focus:border-[hsl(var(--flights))]/50 focus:ring-1 focus:ring-[hsl(var(--flights))]/20",
    fieldError(field) && "border-destructive/60"
  );

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border) / 0.3)",
        boxShadow: `
          0 8px 24px -8px hsl(var(--foreground) / 0.07),
          0 16px 40px -12px hsl(var(--foreground) / 0.04),
          inset 0 1px 0 hsl(0 0% 100% / 0.06)
        `,
        transform: "perspective(600px) rotateX(0.3deg)",
      }}
    >
      {/* Card header with 3D number badge + completion */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0"
          style={{
            background: "hsl(var(--flights) / 0.1)",
            color: "hsl(var(--flights))",
            boxShadow: "0 2px 8px -2px hsl(var(--flights) / 0.15), inset 0 1px 0 hsl(0 0% 100% / 0.1)",
          }}
        >
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold leading-tight">
            {passenger.given_name && passenger.family_name
              ? `${passenger.given_name} ${passenger.family_name}`
              : `Passenger ${index + 1}`}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">{type}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {completion === 100 ? (
            <Badge
              className="text-[8px] h-[18px] px-2 border-0 font-semibold rounded-lg"
              style={{
                background: "hsl(var(--flights) / 0.1)",
                color: "hsl(var(--flights))",
                boxShadow: "0 1px 4px hsl(var(--flights) / 0.1)",
              }}
            >
              Complete
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[8px] h-[18px] px-2 tabular-nums font-medium rounded-lg"
              style={{
                background: "hsl(var(--muted) / 0.3)",
                border: "1px solid hsl(var(--border) / 0.25)",
                boxShadow: "inset 0 1px 2px hsl(var(--foreground) / 0.03)",
              }}
            >
              {completion}%
            </Badge>
          )}
        </div>
      </div>

      {/* 3D Completion bar */}
      <div className="mx-4 mb-3">
        <div
          className="h-[3px] rounded-full overflow-hidden"
          style={{
            background: "hsl(var(--muted) / 0.4)",
            boxShadow: "inset 0 1px 2px hsl(var(--foreground) / 0.04)",
          }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completion}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: "linear-gradient(90deg, hsl(var(--flights)), hsl(var(--flights) / 0.7))",
              boxShadow: "0 0 8px hsl(var(--flights) / 0.3)",
            }}
          />
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Title + Gender */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block">Title</label>
            <Select value={passenger.title} onValueChange={(v) => onUpdate("title", v)}>
              <SelectTrigger
                className={inputCn("title")}
                style={{
                  background: "hsl(var(--muted) / 0.3)",
                  boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.04)",
                }}
              >
                <SelectValue placeholder="Title" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mr">Mr</SelectItem>
                <SelectItem value="ms">Ms</SelectItem>
                <SelectItem value="mrs">Mrs</SelectItem>
                <SelectItem value="miss">Miss</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block">Gender</label>
            <Select value={passenger.gender} onValueChange={(v) => onUpdate("gender", v)}>
              <SelectTrigger
                className={cn(inputCn("gender"), !passenger.gender && "text-muted-foreground")}
                style={{
                  background: "hsl(var(--muted) / 0.3)",
                  boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.04)",
                }}
              >
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="m">Male</SelectItem>
                <SelectItem value="f">Female</SelectItem>
              </SelectContent>
            </Select>
            {fieldError("gender") && <p className="text-[9px] text-destructive mt-0.5 font-medium">{fieldError("gender")}</p>}
          </div>
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block">First name</label>
            <Input
              placeholder="As on passport"
              value={passenger.given_name}
              onChange={(e) => onUpdate("given_name", e.target.value)}
              className={inputCn("given_name")}
              autoComplete="given-name"
              style={{
                background: "hsl(var(--muted) / 0.3)",
                boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.04)",
              }}
            />
            {fieldError("given_name") && <p className="text-[9px] text-destructive mt-0.5 font-medium">{fieldError("given_name")}</p>}
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block">Last name</label>
            <Input
              placeholder="As on passport"
              value={passenger.family_name}
              onChange={(e) => onUpdate("family_name", e.target.value)}
              className={inputCn("family_name")}
              autoComplete="family-name"
              style={{
                background: "hsl(var(--muted) / 0.3)",
                boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.04)",
              }}
            />
            {fieldError("family_name") && <p className="text-[9px] text-destructive mt-0.5 font-medium">{fieldError("family_name")}</p>}
          </div>
        </div>

        {/* Date of birth */}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Date of Birth
          </label>
          <Input
            type="date"
            value={passenger.born_on}
            onChange={(e) => onUpdate("born_on", e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className={inputCn("born_on")}
            style={{
              background: "hsl(var(--muted) / 0.3)",
              boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.04)",
            }}
          />
          {fieldError("born_on") && <p className="text-[9px] text-destructive mt-0.5 font-medium">{fieldError("born_on")}</p>}
        </div>

        {/* Passport section */}
        {isInternational && (
          <>
            <div
              className="my-1 h-[1px]"
              style={{ background: "linear-gradient(90deg, transparent, hsl(var(--border) / 0.2), transparent)" }}
            />
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{
                  background: "hsl(var(--flights) / 0.1)",
                  boxShadow: "0 1px 3px hsl(var(--flights) / 0.1)",
                }}
              >
                <Globe className="w-3 h-3 text-[hsl(var(--flights))]" />
              </div>
              <span className="text-[11px] font-semibold text-[hsl(var(--flights))]">Travel document</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] max-w-[200px]">
                    Required for international travel. Passport must be valid for at least 6 months from travel date.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block">Nationality</label>
              <Select value={passenger.nationality} onValueChange={(v) => onUpdate("nationality", v)}>
                <SelectTrigger
                  className={cn(inputCn("nationality"), !passenger.nationality && "text-muted-foreground")}
                  style={{
                    background: "hsl(var(--muted) / 0.3)",
                    boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.04)",
                  }}
                >
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {POPULAR_NATIONALITIES.map(n => (
                    <SelectItem key={n.code} value={n.code}>{n.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block">Passport number</label>
                <Input
                  placeholder="AB1234567"
                  value={passenger.passport_number}
                  onChange={(e) => onUpdate("passport_number", e.target.value.toUpperCase())}
                  className={inputCn("passport_number")}
                  maxLength={20}
                  style={{
                    background: "hsl(var(--muted) / 0.3)",
                    boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.04)",
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block">Expiry date</label>
                <Input
                  type="date"
                  value={passenger.passport_expiry}
                  onChange={(e) => onUpdate("passport_expiry", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className={inputCn("passport_expiry")}
                  style={{
                    background: "hsl(var(--muted) / 0.3)",
                    boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.04)",
                  }}
                />
              </div>
            </div>

            {passportStatus === "warning" && (
              <div
                className="flex items-center gap-2.5 p-2.5 rounded-xl"
                style={{
                  background: "hsl(38 92% 50% / 0.06)",
                  border: "1px solid hsl(38 92% 50% / 0.15)",
                  boxShadow: "inset 0 1px 2px hsl(38 92% 50% / 0.04)",
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(38 92% 50%)" }} />
                <p className="text-[10px]" style={{ color: "hsl(38 92% 40%)" }}>
                  Passport expires within 6 months. Some countries require longer validity.
                </p>
              </div>
            )}
            {passportStatus === "expired" && (
              <div
                className="flex items-center gap-2.5 p-2.5 rounded-xl"
                style={{
                  background: "hsl(var(--destructive) / 0.06)",
                  border: "1px solid hsl(var(--destructive) / 0.15)",
                  boxShadow: "inset 0 1px 2px hsl(var(--destructive) / 0.04)",
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                <p className="text-[10px] text-destructive">
                  This passport has expired. Please update before traveling.
                </p>
              </div>
            )}
          </>
        )}

        {/* Contact (only first passenger) */}
        {index === 0 && (
          <>
            <div
              className="my-1 h-[1px]"
              style={{ background: "linear-gradient(90deg, transparent, hsl(var(--border) / 0.2), transparent)" }}
            />
            <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{
                  background: "hsl(var(--muted) / 0.5)",
                  boxShadow: "inset 0 1px 2px hsl(var(--foreground) / 0.04)",
                }}
              >
                <Mail className="w-3 h-3" />
              </div>
              Contact details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block">Email</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={passenger.email}
                  onChange={(e) => onUpdate("email", e.target.value)}
                  className={inputCn("email")}
                  autoComplete="email"
                  style={{
                    background: "hsl(var(--muted) / 0.3)",
                    boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.04)",
                  }}
                />
                {fieldError("email") && <p className="text-[9px] text-destructive mt-0.5 font-medium">{fieldError("email")}</p>}
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  Phone <span className="text-muted-foreground/50 font-normal">(optional)</span>
                </label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={passenger.phone_number}
                  onChange={(e) => onUpdate("phone_number", e.target.value)}
                  className={inputCn("phone_number")}
                  autoComplete="tel"
                  style={{
                    background: "hsl(var(--muted) / 0.3)",
                    boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.04)",
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
