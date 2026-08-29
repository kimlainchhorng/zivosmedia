/**
 * GroceryInlinePaymentForm — embedded Stripe PaymentElement for the grocery
 * checkout drawer.
 *
 * Wallets lead the method order here: grocery is a repeat, high-frequency
 * basket where Apple Pay / Google Pay is the fastest path.
 */
import InlineStripePaymentForm from "@/components/payments/InlineStripePaymentForm";

interface GroceryInlinePaymentFormProps {
  clientSecret: string;
  /** PaymentIntent amount in the currency's smallest unit. */
  totalCents: number;
  /**
   * ISO code of the PaymentIntent. create-grocery-payment-intent charges USD
   * today; the prop exists so the button cannot silently print "$" if that
   * ever changes.
   */
  currency?: string;
  onCancel: () => void;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
}

export default function GroceryInlinePaymentForm({
  clientSecret,
  totalCents,
  currency = "USD",
  onCancel,
  onSuccess,
}: GroceryInlinePaymentFormProps) {
  return (
    <InlineStripePaymentForm
      clientSecret={clientSecret}
      amountMinorUnits={totalCents}
      currency={currency}
      onCancel={onCancel}
      onSuccess={onSuccess}
      ctaVerb="Pay"
      paymentMethodOrder={["apple_pay", "google_pay", "card"]}
      securityNote="Secured by Stripe · Card, Apple Pay, Google Pay (when available)"
    />
  );
}
