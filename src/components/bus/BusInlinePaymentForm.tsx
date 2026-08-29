/**
 * BusInlinePaymentForm — embedded Stripe PaymentElement for the rider bus
 * booking flow. The bus PaymentIntent is authorise-only (manual capture); the
 * operator captures on confirmation via capture-bus-payment, so the CTA says
 * "Authorise" rather than promising a charge.
 */
import InlineStripePaymentForm from "@/components/payments/InlineStripePaymentForm";

interface BusInlinePaymentFormProps {
  clientSecret: string;
  /** PaymentIntent amount in the currency's smallest unit. */
  amountCents: number;
  currency: string;
  onCancel: () => void;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
}

export default function BusInlinePaymentForm({
  clientSecret,
  amountCents,
  currency,
  onCancel,
  onSuccess,
}: BusInlinePaymentFormProps) {
  return (
    <InlineStripePaymentForm
      clientSecret={clientSecret}
      amountMinorUnits={amountCents}
      currency={currency}
      onCancel={onCancel}
      onSuccess={onSuccess}
      ctaVerb="Authorise"
      captureNotice="We’ll authorise the fare now — your card is only charged once the operator confirms your seats."
    />
  );
}
