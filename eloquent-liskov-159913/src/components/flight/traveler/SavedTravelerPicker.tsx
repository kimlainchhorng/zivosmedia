/**
 * Saved Traveler Picker — Premium 3D spatial design
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, Check, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTravelerProfiles, type TravelerProfile } from "@/hooks/useTravelerProfiles";
import type { PassengerForm } from "./PassengerFormCard";

interface SavedTravelerPickerProps {
  passengerIndex: number;
  onSelect: (profile: TravelerProfile) => void;
  selectedProfileId?: string;
}

export function profileToPassenger(profile: TravelerProfile): Partial<PassengerForm> {
  return {
    given_name: profile.first_name || "",
    family_name: profile.last_name || "",
    gender: profile.gender === "male" ? "m" : profile.gender === "female" ? "f" : "",
    born_on: profile.date_of_birth || "",
    email: profile.email || "",
    phone_number: profile.phone || "",
    nationality: profile.nationality || "",
    passport_number: profile.passport_number || "",
    passport_expiry: profile.passport_expiry || "",
  };
}

export function SavedTravelerPicker({ passengerIndex, onSelect, selectedProfileId }: SavedTravelerPickerProps) {
  const { data: profiles, isLoading } = useTravelerProfiles();
  const [expanded, setExpanded] = useState(false);

  if (isLoading || !profiles || profiles.length === 0) return null;

  const getInitials = (p: TravelerProfile) => {
    const f = p.first_name?.[0] || "";
    const l = p.last_name?.[0] || "";
    return (f + l).toUpperCase() || "?";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-3"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left"
        style={{
          background: expanded
            ? "hsl(var(--flights) / 0.05)"
            : "hsl(var(--muted) / 0.15)",
          border: `1px solid ${expanded ? "hsl(var(--flights) / 0.15)" : "hsl(var(--border) / 0.25)"}`,
          boxShadow: expanded
            ? "0 4px 16px -4px hsl(var(--flights) / 0.1), inset 0 1px 0 hsl(0 0% 100% / 0.05)"
            : "inset 0 1px 2px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.03)",
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "hsl(var(--flights) / 0.1)",
            boxShadow: "0 2px 6px -2px hsl(var(--flights) / 0.15), inset 0 1px 0 hsl(0 0% 100% / 0.1)",
          }}
        >
          <Sparkles className="w-4 h-4 text-[hsl(var(--flights))]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold">
            {selectedProfileId ? "Change saved traveler" : `Autofill Passenger ${passengerIndex + 1}`}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {profiles.length} saved profile{profiles.length > 1 ? "s" : ""} available
          </p>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-300",
          expanded && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-2">
              {profiles.map((profile, i) => {
                const isSelected = selectedProfileId === profile.id;
                return (
                  <motion.button
                    key={profile.id}
                    type="button"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    onClick={() => {
                      onSelect(profile);
                      setExpanded(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                    style={{
                      background: isSelected
                        ? "hsl(var(--flights) / 0.08)"
                        : "hsl(var(--card))",
                      border: `1px solid ${isSelected ? "hsl(var(--flights) / 0.2)" : "hsl(var(--border) / 0.2)"}`,
                      boxShadow: isSelected
                        ? "0 4px 12px -4px hsl(var(--flights) / 0.12), inset 0 1px 0 hsl(0 0% 100% / 0.05)"
                        : "0 2px 6px -2px hsl(var(--foreground) / 0.04), inset 0 1px 0 hsl(0 0% 100% / 0.04)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{
                        background: isSelected
                          ? "hsl(var(--flights))"
                          : "hsl(var(--muted) / 0.5)",
                        color: isSelected
                          ? "hsl(var(--primary-foreground))"
                          : "hsl(var(--muted-foreground))",
                        boxShadow: isSelected
                          ? "0 3px 10px -2px hsl(var(--flights) / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.2)"
                          : "inset 0 1px 2px hsl(var(--foreground) / 0.04)",
                      }}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : getInitials(profile)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-semibold truncate">
                          {profile.first_name} {profile.last_name}
                        </p>
                        {profile.is_primary && (
                          <Star className="w-3 h-3 shrink-0" style={{ color: "hsl(38 92% 50%)", fill: "hsl(38 92% 50%)" }} />
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground truncate">
                        {[
                          profile.nationality,
                          profile.passport_number ? `Passport: ···${profile.passport_number.slice(-4)}` : null,
                        ].filter(Boolean).join(" · ") || "No passport info"}
                      </p>
                    </div>
                    {isSelected && (
                      <Badge
                        className="text-[7px] h-4 px-1.5 border-0 font-semibold rounded-md"
                        style={{
                          background: "hsl(var(--flights) / 0.12)",
                          color: "hsl(var(--flights))",
                        }}
                      >
                        Applied
                      </Badge>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
