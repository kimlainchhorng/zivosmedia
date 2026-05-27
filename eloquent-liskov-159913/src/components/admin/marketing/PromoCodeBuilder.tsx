/**
 * PromoCodeBuilder — Create one or bulk-generate promo codes.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertPromoCode, useBulkGeneratePromoCodes } from "@/hooks/useMarketingPromoCodes";

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  bulk: boolean;
}

export default function PromoCodeBuilder({ open, onClose, storeId, bulk }: Props) {
  const [code, setCode] = useState("");
  const [prefix, setPrefix] = useState("ZIVO");
  const [count, setCount] = useState(50);
  const [type, setType] = useState<"percent" | "flat" | "free_shipping">("percent");
  const [value, setValue] = useState(10);
  const [minOrder, setMinOrder] = useState(0);
  const [expiresAt, setExpiresAt] = useState("");

  const upsert = useUpsertPromoCode(storeId);
  const bulkGen = useBulkGeneratePromoCodes(storeId);

  const handleSave = async () => {
    if (bulk) {
      await bulkGen.mutateAsync({ count, prefix, type, value, expires_at: expiresAt || null });
    } else {
      if (!code.trim()) return;
      await upsert.mutateAsync({
        code,
        type,
        value,
        min_order_cents: Math.round(minOrder * 100),
        expires_at: expiresAt || null,
      });
    }
    onClose();
    setCode(""); setValue(10); setMinOrder(0); setExpiresAt("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{bulk ? "Bulk-generate codes" : "New promo code"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {bulk ? (
            <>
              <div>
                <Label className="text-xs">Prefix</Label>
                <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} maxLength={6} className="mt-1 font-mono" />
              </div>
              <div>
                <Label className="text-xs">Count (max 1000)</Label>
                <Input type="number" value={count} onChange={(e) => setCount(parseInt(e.target.value) || 0)} min={1} max={1000} className="mt-1" />
              </div>
            </>
          ) : (
            <div>
              <Label className="text-xs">Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SPRING20" className="mt-1 font-mono" />
            </div>
          )}
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent off</SelectItem>
                <SelectItem value="flat">Flat amount off</SelectItem>
                <SelectItem value="free_shipping">Free shipping</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type !== "free_shipping" && (
            <div>
              <Label className="text-xs">Value ({type === "percent" ? "%" : "$"})</Label>
              <Input type="number" value={value} onChange={(e) => setValue(parseFloat(e.target.value) || 0)} className="mt-1" />
            </div>
          )}
          {!bulk && (
            <div>
              <Label className="text-xs">Min order ($)</Label>
              <Input type="number" value={minOrder} onChange={(e) => setMinOrder(parseFloat(e.target.value) || 0)} className="mt-1" />
            </div>
          )}
          <div>
            <Label className="text-xs">Expires at (optional)</Label>
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={upsert.isPending || bulkGen.isPending}>
              {(upsert.isPending || bulkGen.isPending) ? "Saving..." : bulk ? `Generate ${count}` : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
