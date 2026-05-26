import { toast } from "sonner";
import { format } from "date-fns";
import AITripSuggestions from "./AITripSuggestions";
import { airports } from "@/data/airports";

interface FlightDiscoverySectionsProps {
  fromCity: string;
  toCity: string;
  fromCode: string;
  toCode: string;
  departDate?: Date;
  returnDate?: Date;
  passengers: string;
  setFromCity: (city: string) => void;
  setToCity: (city: string) => void;
  setDepartDate: (date: Date | undefined) => void;
  setPassengers: (pax: string) => void;
  setSelectedLoyaltyProgram: (id: string | null) => void;
}

export default function FlightDiscoverySections({
  fromCity,
  toCity,
  fromCode,
  toCode,
  departDate,
  returnDate,
  passengers,
  setFromCity,
  setToCity,
  setDepartDate,
  setPassengers,
  setSelectedLoyaltyProgram,
}: FlightDiscoverySectionsProps) {
  return (
    <>
      {/* AI Trip Suggestions */}
      <section className="py-12 border-t border-border/50">
        <div className="container mx-auto px-4">
          <AITripSuggestions
            origin={fromCity.split(" (")[0] || "New York"}
            onSelectDestination={(airportCode, city) => {
              const airport = airports.find((a) => a.code === airportCode);
              if (airport) {
                setToCity(`${airport.city} (${airport.code})`);
                toast.success(`Selected ${city} as your destination`);
              } else {
                setToCity(`${city} (${airportCode})`);
              }
            }}
            className="max-w-4xl mx-auto"
          />
        </div>
      </section>
    </>
  );
}
