/**
 * CarRentalInlinePaymentForm — embedded Stripe PaymentElement for the
 * customer-facing car rental booking flow.
 *
 * Under `captureMode: "manual"` the intent is an authorisation hold, not a
 * charge, so the CTA reads "Hold" and the notice says what that means.
 */
import InlineStripePaymentForm from "@/components/payments/InlineStripePaymentForm";

interface CarRentalInlinePaymentFormProps {
  clientSecret: string;
  /** PaymentIntent amount in the currency's smallest unit. */
  amountCents: number;
  currency: string;
  /** "manual" holds the amount as an authorisation; "immediate" charges now. */
  captureMode: "manual" | "immediate";
  onCancel: () => void;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
}

export default function CarRentalInlinePaymentForm({
  clientSecret,
  amountCents,
  currency,
  captureMode,
  onCancel,
  onSuccess,
}: CarRentalInlinePaymentFormProps) {
  const isHold = captureMode === "manual";

  return (
    <InlineStripePaymentForm
      clientSecret={clientSecret}
      amountMinorUnits={amountCents}
      currency={currency}
      onCancel={onCancel}
      onSuccess={onSuccess}
      ctaVerb={isHold ? "Hold" : "Pay"}
      captureNotice={
        isHold
          ? "This is an authorisation hold, not a charge. The balance is settled when you collect the vehicle."
          : undefined
      }
    />
  );
}
