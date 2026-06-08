/**
 * CheckoutAuthGate
 * Routing guard for /travel/checkout.
 *
 * Travel checkout (useCreateOrder) requires a signed-in user, but the checkout
 * route is intentionally NOT wrapped in <ProtectedRoute> so that an empty cart
 * can still render its clean empty state without forcing a login. This gate
 * fills the gap:
 *   - while auth is resolving           -> spinner
 *   - signed in, OR cart is empty       -> render checkout (page shows the form
 *                                          or its own "cart is empty" state)
 *   - signed out WITH items to book     -> clear "Continue with Zivosmedia"
 *                                          sign-in path instead of a dead-end form
 *
 * It changes no payment or auth-backend behavior — it only routes the user to
 * the existing /login flow (preserving a redirect back to checkout).
 */
import { useLocation, useNavigate } from "react-router-dom";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import LogIn from "lucide-react/dist/esm/icons/log-in";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import { useAuth } from "@/contexts/AuthContext";
import { useTravelCart } from "@/contexts/TravelCartContext";
import { withRedirectParam } from "@/lib/authRedirect";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CheckoutAuthGateProps {
  children: React.ReactNode;
}

const CheckoutAuthGate = ({ children }: CheckoutAuthGateProps) => {
  const { user, isLoading } = useAuth();
  const { items } = useTravelCart();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Signed in, or nothing to check out: let the checkout page render (the page
  // owns the empty-cart state and the booking form).
  if (user || items.length === 0) {
    return <>{children}</>;
  }

  // Signed out with items to book: offer a clear sign-in path back to checkout.
  const redirectTarget = `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ShoppingBag className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Sign in to complete your booking</h2>
          <p className="text-muted-foreground mb-6">
            You have {itemCount} item{itemCount === 1 ? "" : "s"} ready to book. Continue with your
            Zivosmedia account to review and pay securely — your cart will be waiting.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full gap-2"
              onClick={() => navigate(withRedirectParam("/login", redirectTarget))}
            >
              <LogIn className="h-4 w-4" />
              Continue with Zivosmedia
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/hotels")}>
              Keep browsing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutAuthGate;
