/**
 * PetChildPolicyCard - compact rows with allowed switch + reveal extras.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dog, Baby } from "lucide-react";
import type { PetPolicy, ChildPolicy } from "@/hooks/lodging/useLodgePropertyProfile";

interface Props {
  pet: PetPolicy;
  child: ChildPolicy;
  onPet: (patch: Partial<PetPolicy>) => void;
  onChild: (patch: Partial<ChildPolicy>) => void;
}

export default function PetChildPolicyCard({ pet, child, onPet, onChild }: Props) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-[13px]">Pet & children policies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Pets */}
        <div className="space-y-2 p-2.5 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-semibold flex items-center gap-1.5"><Dog className="h-3.5 w-3.5" /> Pets allowed</Label>
            <Switch checked={!!pet.allowed} onCheckedChange={v => onPet({ allowed: v })} />
          </div>
          {pet.allowed && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">Fee (USD)</Label>
                <Input
                  type="number" step="0.01" className="h-8"
                  value={pet.fee_cents == null ? "" : (pet.fee_cents / 100).toString()}
                  onChange={e => onPet({ fee_cents: e.target.value === "" ? undefined : Math.round(parseFloat(e.target.value) * 100) })}
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Max weight (kg)</Label>
                <Input
                  type="number" inputMode="numeric" className="h-8"
                  value={pet.max_weight_kg ?? ""}
                  onChange={e => onPet({ max_weight_kg: e.target.value === "" ? undefined : parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Notes</Label>
                <Input className="h-8" value={pet.notes || ""} onChange={e => onPet({ notes: e.target.value })} placeholder="e.g. dogs only" />
              </div>
            </div>
          )}
        </div>

        {/* Children */}
        <div className="space-y-2 p-2.5 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-semibold flex items-center gap-1.5"><Baby className="h-3.5 w-3.5" /> Children welcome</Label>
            <Switch checked={!!child.allowed} onCheckedChange={v => onChild({ allowed: v })} />
          </div>
          {child.allowed && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">Min age</Label>
                <Input
                  type="number" inputMode="numeric" className="h-8"
                  value={child.min_age ?? ""}
                  onChange={e => onChild({ min_age: e.target.value === "" ? undefined : parseInt(e.target.value) })}
                />
              </div>
              <div className="flex flex-col">
                <Label className="text-[11px] text-muted-foreground">Cot available</Label>
                <div className="h-8 flex items-center">
                  <Switch checked={!!child.cot_available} onCheckedChange={v => onChild({ cot_available: v })} />
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Extra bed (USD)</Label>
                <Input
                  type="number" step="0.01" className="h-8"
                  value={child.extra_bed_fee_cents == null ? "" : (child.extra_bed_fee_cents / 100).toString()}
                  onChange={e => onChild({ extra_bed_fee_cents: e.target.value === "" ? undefined : Math.round(parseFloat(e.target.value) * 100) })}
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Notes</Label>
                <Input className="h-8" value={child.notes || ""} onChange={e => onChild({ notes: e.target.value })} placeholder="" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
