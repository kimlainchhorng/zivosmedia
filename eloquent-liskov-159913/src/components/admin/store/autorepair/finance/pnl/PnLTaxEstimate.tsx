/**
 * P&L Tax estimate — sales tax collected + estimated income tax owed.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { fmtMoney } from "@/lib/admin/pnlCalculations";

interface Props {
  salesTax: number; // cents
  netProfit: number; // cents
  onJumpToTax?: () => void;
}

export default function PnLTaxEstimate({ salesTax, netProfit, onJumpToTax }: Props) {
  const [rate, setRate] = useState(15);
  const incomeTax = Math.max(0, Math.round((netProfit * rate) / 100));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Tax estimate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-2.5">
            <div className="text-[10px] text-muted-foreground">Sales tax collected</div>
            <div className="text-base font-semibold tabular-nums">{fmtMoney(salesTax)}</div>
          </div>
          <div className="rounded-lg border p-2.5">
            <div className="text-[10px] text-muted-foreground">Est. income tax owed</div>
            <div className="text-base font-semibold tabular-nums text-amber-700">{fmtMoney(incomeTax)}</div>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-[10px]">Income tax rate (%)</Label>
            <Input type="number" min={0} max={50} step={0.5} value={rate} onChange={(e) => setRate(Math.max(0, Math.min(50, Number(e.target.value) || 0)))} className="h-8 text-xs" />
          </div>
          {onJumpToTax && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onJumpToTax}>Open Tax & Payouts</Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Estimate only. Confirm actual liability with your CPA. Income tax is computed on net profit at the rate above.
        </p>
      </CardContent>
    </Card>
  );
}
