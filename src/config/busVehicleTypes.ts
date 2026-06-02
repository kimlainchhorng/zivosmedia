/**
 * Bus / van vehicle types — the single source of truth shared by the operator
 * console (trip scheduling) and the rider booking view.
 *
 * `bus_trips.bus_type` is a free-text column, so the `value` strings below are
 * stored verbatim and also shown to riders. Picking a type in the trip form
 * pre-fills sensible seat count + amenities (operators can still adjust).
 *
 * @module busVehicleTypes
 */
export type BusVehicleAmenity = "wifi" | "ac" | "charging";

export interface BusVehicleType {
  /** Stored verbatim in bus_trips.bus_type and echoed to riders. */
  value: string;
  /** Display label (kept separate from value for future i18n). */
  label: string;
  /** Short rider-facing blurb. */
  description: string;
  /** Default seat count applied when an operator picks this type. */
  defaultSeats: number;
  /** Seat layout hint (seats per side incl. aisle), e.g. "2-2", "2-1". */
  seatLayout: string;
  /** Amenities typically included; pre-selected in the trip form. */
  amenities: BusVehicleAmenity[];
}

export const BUS_VEHICLE_TYPES: BusVehicleType[] = [
  { value: "Standard Bus", label: "Standard Bus", description: "Everyday seated coach", defaultSeats: 45, seatLayout: "2-2", amenities: [] },
  { value: "AC Bus", label: "AC Bus", description: "Air-conditioned seated coach", defaultSeats: 45, seatLayout: "2-2", amenities: ["ac"] },
  { value: "VIP Bus", label: "VIP Bus", description: "Premium wide seats & extras", defaultSeats: 28, seatLayout: "2-1", amenities: ["wifi", "ac", "charging"] },
  { value: "Sleeper Bus", label: "Sleeper Bus", description: "Lie-flat sleeper berths", defaultSeats: 32, seatLayout: "2-1", amenities: ["ac", "charging"] },
  { value: "Night Sleeper", label: "Night Sleeper", description: "Overnight sleeper service", defaultSeats: 30, seatLayout: "2-1", amenities: ["wifi", "ac", "charging"] },
  { value: "Minibus", label: "Minibus", description: "Compact ~19-seat coach", defaultSeats: 19, seatLayout: "2-2", amenities: ["ac"] },
  { value: "Van", label: "Van", description: "Shared passenger van", defaultSeats: 15, seatLayout: "2-2", amenities: ["ac"] },
  { value: "VIP Van", label: "VIP Van", description: "Premium van, fewer seats", defaultSeats: 11, seatLayout: "2-1", amenities: ["wifi", "ac", "charging"] },
];

/** Fallback type for new trips and rider rows with an unknown/blank type. */
export const DEFAULT_BUS_VEHICLE_TYPE = BUS_VEHICLE_TYPES[0].value;

/** Case-insensitive lookup of a vehicle type by its stored value/label. */
export const getBusVehicleType = (
  value: string | null | undefined,
): BusVehicleType | undefined =>
  BUS_VEHICLE_TYPES.find(
    (t) => t.value.toLowerCase() === (value || "").trim().toLowerCase(),
  );
