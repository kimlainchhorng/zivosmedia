/**
 * Build R.O. — renders the estimate number as a scannable CODE128 barcode
 * (the strip at the bottom of the VSM repair-order screen). Scanning it pulls
 * the RO back up via the hub's "Search by Estimate #".
 */
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  value: string;
  className?: string;
}

export default function BuildROBarcode({ value, className }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        displayValue: false,
        height: 38,
        width: 1.6,
        margin: 0,
        background: "transparent",
        lineColor: "#0f172a",
      });
    } catch {
      /* invalid value — leave the SVG empty */
    }
  }, [value]);

  return <svg ref={ref} className={className} aria-label={`Barcode for ${value}`} />;
}
