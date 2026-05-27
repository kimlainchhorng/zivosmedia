/**
 * cancellationCopy - Translate lodge cancellation policy keys into human-friendly text.
 */
export type CancellationKey = "flexible" | "moderate" | "strict" | "non_refundable" | string;

export function cancellationLabel(key?: string | null): string {
  switch ((key || "").toLowerCase()) {
    case "flexible": return "Flexible";
    case "moderate": return "Moderate";
    case "strict": return "Strict";
    case "non_refundable": return "Non-refundable";
    default: return "Standard";
  }
}

export function cancellationDescription(key?: string | null): string {
  switch ((key || "").toLowerCase()) {
    case "flexible":
      return "Free cancellation up to 24 hours before check-in. After that, the first night is non-refundable.";
    case "moderate":
      return "Free cancellation up to 5 days before check-in. After that, 50% of the total stay is non-refundable.";
    case "strict":
      return "Free cancellation up to 14 days before check-in. After that, the full stay is non-refundable.";
    case "non_refundable":
      return "This rate is non-refundable. No refund will be issued for changes or cancellations.";
    default:
      return "Cancellation terms will be confirmed by the property. Please contact the host for changes.";
  }
}
