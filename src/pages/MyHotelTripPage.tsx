import { Navigate, useParams } from "react-router-dom";

export default function MyHotelTripPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>();

  return (
    <Navigate
      to={bookingId ? `/my-trips/lodging/${bookingId}` : "/my-trips"}
      replace
    />
  );
}
