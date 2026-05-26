/**
 * Guest Essentials — Wi-Fi, emergency contacts, accepted IDs.
 * Stored on `lodge_property_profile.contact` (existing JSONB column) under namespaced keys.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Wifi, Siren, IdCard } from "lucide-react";

export interface GuestEssentialsValue {
  wifi_ssid?: string;
  wifi_password?: string;
  wifi_show_to_guests?: boolean;
  emergency_police?: string;
  emergency_medical?: string;
  emergency_fire?: string;
  accepted_ids?: string[];
}

interface Props {
  value: GuestEssentialsValue;
  onChange: (patch: Partial<GuestEssentialsValue>) => void;
}

const ID_TYPES = ["Passport", "National ID", "Driver's license"];

export default function GuestEssentialsCard({ value, onChange }: Props) {
  const accepted = value.accepted_ids || [];
  const toggleId = (t: string) => {
    onChange({ accepted_ids: accepted.includes(t) ? accepted.filter(x => x !== t) : [...accepted, t] });
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-2.5"><CardTitle className="text-[12px] flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5" /> Wi-Fi</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">Network (SSID)</Label>
              <Input className="h-9" value={value.wifi_ssid || ""} onChange={(e) => onChange({ wifi_ssid: e.target.value })} placeholder="GuestWiFi" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Password</Label>
              <Input className="h-9" value={value.wifi_password || ""} onChange={(e) => onChange({ wifi_password: e.target.value })} placeholder="••••••••" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-2">
            <p className="text-[11px] text-muted-foreground">Show on guest screens (booking confirmation, in-room)</p>
            <Switch checked={!!value.wifi_show_to_guests} onCheckedChange={(v) => onChange({ wifi_show_to_guests: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2.5"><CardTitle className="text-[12px] flex items-center gap-1.5"><Siren className="h-3.5 w-3.5" /> Local emergency contacts</CardTitle></CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Police</Label>
            <Input className="h-9" value={value.emergency_police || ""} onChange={(e) => onChange({ emergency_police: e.target.value })} placeholder="+1 555 0100" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Medical</Label>
            <Input className="h-9" value={value.emergency_medical || ""} onChange={(e) => onChange({ emergency_medical: e.target.value })} placeholder="+1 555 0101" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Fire</Label>
            <Input className="h-9" value={value.emergency_fire || ""} onChange={(e) => onChange({ emergency_fire: e.target.value })} placeholder="+1 555 0102" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2.5"><CardTitle className="text-[12px] flex items-center gap-1.5"><IdCard className="h-3.5 w-3.5" /> Accepted ID types at check-in</CardTitle></CardHeader>
        <CardContent className="pt-0 flex flex-wrap gap-1.5">
          {ID_TYPES.map((t) => {
            const on = accepted.includes(t);
            return (
              <button type="button" key={t} onClick={() => toggleId(t)}
                className={`px-2.5 py-1 rounded-full text-[11px] border transition ${on ? "bg-primary text-primary-foreground border-primary font-semibold" : "bg-background border-border text-foreground hover:border-primary/40"}`}>
                {t}
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
