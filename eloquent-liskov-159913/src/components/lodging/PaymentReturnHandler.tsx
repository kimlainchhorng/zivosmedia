/**
 * PaymentReturnHandler
 * --------------------
 * Mounted once at the app shell. Watches the URL for the redirect-back markers
 * dropped by create-lodging-paypal-order and create-lodging-square-checkout
 * (`?paypal_return=<reservation>` / `?square_return=<reservation>`).
 *
 *  - PayPal: invokes capture-lodging-paypal-order with the order_id (PayPal
 *    appends ?token=ORDER_ID to the return URL).
 *  - Square: realtime updates flow through the existing payment_status
 *    subscription on lodge_reservations once Square's webhook lands; this
 *    handler just clears the URL param and toasts a "verifying" status.
 *
 * The component renders nothing.
 */
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function PaymentReturnHandler() {
  const [params, setParams] = useSearchParams();
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const paypalRes = params.get("paypal_return");
    const paypalCancelled = params.get("paypal_cancel");
    const paypalToken = params.get("token");
    const squareRes = params.get("square_return");
    const eatsPaypalRes = params.get("eats_paypal_return");
    const eatsPaypalCancelled = params.get("eats_paypal_cancel");
    const eatsSquareRes = params.get("eats_square_return");
    const groceryPaypalRes = params.get("grocery_paypal_return");
    const groceryPaypalCancelled = params.get("grocery_paypal_cancel");
    const grocerySquareRes = params.get("grocery_square_return");
    const tipPaypalRes = params.get("tip_paypal_return");
    const tipPaypalCancelled = params.get("tip_paypal_cancel");
    const tipSquareRes = params.get("tip_square_return");

    // Lodging PayPal
    if (paypalRes && paypalToken && !handledRef.current.has(paypalToken)) {
      handledRef.current.add(paypalToken);
      (async () => {
        const t = toast.loading("Confirming PayPal payment…");
        try {
          const { data, error } = await supabase.functions.invoke("capture-lodging-paypal-order", {
            body: { order_id: paypalToken },
          });
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          toast.success("Payment confirmed via PayPal", { id: t });
        } catch (e: any) {
          toast.error(e?.message || "PayPal capture failed", { id: t });
        } finally {
          const next = new URLSearchParams(params);
          next.delete("paypal_return");
          next.delete("token");
          next.delete("PayerID");
          setParams(next, { replace: true });
        }
      })();
    }

    if (paypalCancelled && !handledRef.current.has(`cancel-${paypalCancelled}`)) {
      handledRef.current.add(`cancel-${paypalCancelled}`);
      toast.info("PayPal payment cancelled");
      const next = new URLSearchParams(params);
      next.delete("paypal_cancel");
      next.delete("token");
      setParams(next, { replace: true });
    }

    if (squareRes && !handledRef.current.has(`sq-${squareRes}`)) {
      handledRef.current.add(`sq-${squareRes}`);
      toast.info("Verifying Square payment…", { description: "We'll update your booking as soon as Square confirms." });
      const next = new URLSearchParams(params);
      next.delete("square_return");
      setParams(next, { replace: true });
    }

    // Eats PayPal
    if (eatsPaypalRes && paypalToken && !handledRef.current.has(`eats-${paypalToken}`)) {
      handledRef.current.add(`eats-${paypalToken}`);
      (async () => {
        const t = toast.loading("Confirming PayPal payment…");
        try {
          const { data, error } = await supabase.functions.invoke("capture-eats-paypal-order", {
            body: { order_id: paypalToken },
          });
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          toast.success("Order paid via PayPal", { id: t });
        } catch (e: any) {
          toast.error(e?.message || "PayPal capture failed", { id: t });
        } finally {
          const next = new URLSearchParams(params);
          next.delete("eats_paypal_return");
          next.delete("token");
          next.delete("PayerID");
          setParams(next, { replace: true });
        }
      })();
    }

    if (eatsPaypalCancelled && !handledRef.current.has(`eats-cancel-${eatsPaypalCancelled}`)) {
      handledRef.current.add(`eats-cancel-${eatsPaypalCancelled}`);
      toast.info("PayPal payment cancelled");
      const next = new URLSearchParams(params);
      next.delete("eats_paypal_cancel");
      next.delete("token");
      setParams(next, { replace: true });
    }

    if (eatsSquareRes && !handledRef.current.has(`eats-sq-${eatsSquareRes}`)) {
      handledRef.current.add(`eats-sq-${eatsSquareRes}`);
      toast.info("Verifying Square payment…", { description: "We'll update your order as soon as Square confirms." });
      const next = new URLSearchParams(params);
      next.delete("eats_square_return");
      setParams(next, { replace: true });
    }

    // Grocery PayPal
    if (groceryPaypalRes && paypalToken && !handledRef.current.has(`grocery-${paypalToken}`)) {
      handledRef.current.add(`grocery-${paypalToken}`);
      (async () => {
        const t = toast.loading("Confirming PayPal payment…");
        try {
          const { data, error } = await supabase.functions.invoke("capture-grocery-paypal-order", {
            body: { order_id: paypalToken },
          });
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          toast.success("Order paid via PayPal", { id: t });
        } catch (e: any) {
          toast.error(e?.message || "PayPal capture failed", { id: t });
        } finally {
          const next = new URLSearchParams(params);
          next.delete("grocery_paypal_return");
          next.delete("token");
          next.delete("PayerID");
          setParams(next, { replace: true });
        }
      })();
    }

    if (groceryPaypalCancelled && !handledRef.current.has(`grocery-cancel-${groceryPaypalCancelled}`)) {
      handledRef.current.add(`grocery-cancel-${groceryPaypalCancelled}`);
      toast.info("PayPal payment cancelled");
      const next = new URLSearchParams(params);
      next.delete("grocery_paypal_cancel");
      next.delete("token");
      setParams(next, { replace: true });
    }

    if (grocerySquareRes && !handledRef.current.has(`grocery-sq-${grocerySquareRes}`)) {
      handledRef.current.add(`grocery-sq-${grocerySquareRes}`);
      toast.info("Verifying Square payment…", { description: "We'll update your order as soon as Square confirms." });
      const next = new URLSearchParams(params);
      next.delete("grocery_square_return");
      setParams(next, { replace: true });
    }

    // Creator tips — PayPal
    if (tipPaypalRes && paypalToken && !handledRef.current.has(`tip-${paypalToken}`)) {
      handledRef.current.add(`tip-${paypalToken}`);
      (async () => {
        const t = toast.loading("Confirming tip…");
        try {
          const { data, error } = await supabase.functions.invoke("capture-tip-paypal-order", {
            body: { order_id: paypalToken },
          });
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          toast.success("Tip sent via PayPal 🎉", { id: t });
        } catch (e: any) {
          toast.error(e?.message || "PayPal capture failed", { id: t });
        } finally {
          const next = new URLSearchParams(params);
          next.delete("tip_paypal_return");
          next.delete("token");
          next.delete("PayerID");
          setParams(next, { replace: true });
        }
      })();
    }

    if (tipPaypalCancelled && !handledRef.current.has("tip-cancel")) {
      handledRef.current.add("tip-cancel");
      toast.info("Tip cancelled");
      const next = new URLSearchParams(params);
      next.delete("tip_paypal_cancel");
      next.delete("token");
      setParams(next, { replace: true });
    }

    if (tipSquareRes && !handledRef.current.has("tip-sq")) {
      handledRef.current.add("tip-sq");
      toast.info("Verifying Square tip…");
      const next = new URLSearchParams(params);
      next.delete("tip_square_return");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  return null;
}
