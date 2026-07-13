/**
 * CambodiaOnlyGate
 * Blocks ride/drive routes for users outside Cambodia.
 * Shows a friendly "available in Cambodia only" screen with a country switcher.
 */
import { useCountry } from "@/hooks/useCountry";
import { Button } from "@/components/ui/button";
import { MapPin, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CambodiaOnlyGateProps {
  children: React.ReactNode;
}

const CambodiaOnlyGate = ({ children }: CambodiaOnlyGateProps) => {
  const { isCambodia, setCountry } = useCountry();
  const navigate = useNavigate();

  if (isCambodia) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Rides available in Cambodia</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ZIVO Rides currently operates in Cambodia 🇰🇭 only. We're expanding
            soon — switch your country to Cambodia to continue, or head back home.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            className="w-full h-12 rounded-xl font-bold gap-2"
            onClick={() => setCountry("KH")}
          >
            <Globe className="w-4 h-4" />
            Switch to Cambodia
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl font-bold"
            onClick={() => navigate("/")}
          >
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CambodiaOnlyGate;
