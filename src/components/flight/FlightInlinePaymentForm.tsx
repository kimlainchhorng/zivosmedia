/**
 * FlightInlinePaymentForm — embedded Stripe PaymentElement for flight checkout.
 *
 * Thin wrapper over the shared inline form. The flight PaymentIntent is
 * authorise-only (`capture_method: "manual"`); confirm-flight-payment captures
 * once Duffel issues the ticket and cancels the authorisation if it does not,
 * so the form says so before the customer commits.
 */
import InlineStripePaymentForm from "@/components/payments/InlineStripePaymentForm";

interface FlightInlinePaymentFormProps {
  clientSecret: string;
  /** PaymentIntent amount in the currency's smallest unit. */
  totalCents: number;
  currency: string;
  onCancel: () => void;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
}

export default function FlightInlinePaymentForm({
  clientSecret,
  totalCents,
  currency,
  onCancel,
  onSuccess,
}: FlightInlinePaymentFormProps) {
  return (
    <InlineStripePaymentForm
      clientSecret={clientSecret}
      amountMinorUnits={totalCents}
      currency={currency}
      onCancel={onCancel}
      onSuccess={onSuccess}
      ctaVerb="Pay"
      captureNotice="Your card is authorised now and charged only once the airline issues your ticket."
      submitClassName="bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90"
    />
  );
}
