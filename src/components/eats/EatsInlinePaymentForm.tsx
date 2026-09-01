/**
 * EatsInlinePaymentForm — embedded Stripe PaymentElement for the food-order
 * checkout flow.
 *
 * Eats uses an automatic-capture USD PaymentIntent, so this wrapper says the
 * payment is charged immediately and returns redirect-capable methods to the
 * already-saved order instead of a resubmittable checkout.
 */
import InlineStripePaymentForm from "@/components/payments/InlineStripePaymentForm";

export interface EatsInlinePaymentFormProps {
  clientSecret: string;
  /** PaymentIntent amount in USD cents. */
  amountCents: number;
  /** Absolute URL for authentication-required Stripe redirects. */
  returnUrl: string;
  onCancel: () => void;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
}

export default function EatsInlinePaymentForm({
  clientSecret,
  amountCents,
  returnUrl,
  onCancel,
  onSuccess,
}: EatsInlinePaymentFormProps) {
  return (
    <InlineStripePaymentForm
      clientSecret={clientSecret}
      amountMinorUnits={amountCents}
      currency="USD"
      returnUrl={returnUrl}
      onCancel={onCancel}
      onSuccess={onSuccess}
      ctaVerb="Pay"
      captureNotice="Your payment method is charged immediately. The restaurant receives your order after Stripe confirms payment."
      paymentMethodOrder={["card", "apple_pay", "google_pay"]}
      securityNote="Secured by Stripe · Card, Apple Pay, Google Pay (when available)"
    />
  );
}
