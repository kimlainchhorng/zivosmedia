import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileTripsCard, { type TripBookingItem } from "./ProfileTripsCard";

const NOW = new Date("2026-04-30T12:00:00Z").getTime();

const makeBooking = (overrides: Partial<TripBookingItem> = {}): TripBookingItem => ({
  id: overrides.id ?? "b1",
  service_type: overrides.service_type ?? "flight",
  status: overrides.status ?? "confirmed",
  created_at: overrides.created_at ?? new Date(NOW - 60 * 60 * 1000).toISOString(),
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ProfileTripsCard", () => {
  it("renders header and View all link", () => {
    render(
      <ProfileTripsCard bookings={[]} onViewAll={vi.fn()} onOpen={vi.fn()} />,
    );
    expect(screen.getByText("Recent trips")).toBeInTheDocument();
    expect(screen.getByText("View all")).toBeInTheDocument();
  });

  it("shows the empty-state CTA when there are no bookings and not loading", () => {
    const onViewAll = vi.fn();
    render(<ProfileTripsCard bookings={[]} onViewAll={onViewAll} onOpen={vi.fn()} />);
    expect(screen.getByText("No trips yet")).toBeInTheDocument();
    fireEvent.click(screen.getByText("No trips yet"));
    expect(onViewAll).toHaveBeenCalled();
  });

  it("renders skeletons while loading", () => {
    const { container } = render(
      <ProfileTripsCard bookings={[]} loading onViewAll={vi.fn()} onOpen={vi.fn()} />,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("No trips yet")).not.toBeInTheDocument();
  });

  it("renders up to `limit` bookings (default 2) and trims the rest", () => {
    const bookings: TripBookingItem[] = [
      makeBooking({ id: "1", service_type: "flight" }),
      makeBooking({ id: "2", service_type: "hotel", status: "pending" }),
      makeBooking({ id: "3", service_type: "car", status: "completed" }),
      makeBooking({ id: "4", service_type: "bus" }),
    ];
    render(<ProfileTripsCard bookings={bookings} onViewAll={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByText("Flight")).toBeInTheDocument();
    expect(screen.getByText("Hotel")).toBeInTheDocument();
    expect(screen.queryByText("Car")).not.toBeInTheDocument();
    expect(screen.queryByText("Bus")).not.toBeInTheDocument();
  });

  it("respects a custom limit", () => {
    const bookings: TripBookingItem[] = [
      makeBooking({ id: "1", service_type: "flight" }),
      makeBooking({ id: "2", service_type: "hotel" }),
      makeBooking({ id: "3", service_type: "car" }),
    ];
    render(
      <ProfileTripsCard bookings={bookings} limit={1} onViewAll={vi.fn()} onOpen={vi.fn()} />,
    );
    expect(screen.getByText("Flight")).toBeInTheDocument();
    expect(screen.queryByText("Hotel")).not.toBeInTheDocument();
  });

  it("renders status pill text title-cased", () => {
    render(
      <ProfileTripsCard
        bookings={[makeBooking({ status: "PENDING" })]}
        onViewAll={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("formats relative time for created_at", () => {
    const bookings = [
      makeBooking({ id: "1", created_at: new Date(NOW - 30 * 1000).toISOString() }),
      makeBooking({ id: "2", created_at: new Date(NOW - 5 * 60 * 1000).toISOString() }),
      makeBooking({ id: "3", created_at: new Date(NOW - 3 * 60 * 60 * 1000).toISOString() }),
    ];
    render(
      <ProfileTripsCard bookings={bookings} limit={3} onViewAll={vi.fn()} onOpen={vi.fn()} />,
    );
    expect(screen.getByText("just now")).toBeInTheDocument();
    expect(screen.getByText("5m ago")).toBeInTheDocument();
    expect(screen.getByText("3h ago")).toBeInTheDocument();
  });

  it("calls onOpen with the booking when a row is clicked", () => {
    const onOpen = vi.fn();
    const booking = makeBooking({ id: "abc", service_type: "hotel" });
    render(<ProfileTripsCard bookings={[booking]} onOpen={onOpen} onViewAll={vi.fn()} />);
    fireEvent.click(screen.getByText("Hotel"));
    expect(onOpen).toHaveBeenCalledWith(booking);
  });

  it("calls onViewAll when the header link is clicked", () => {
    const onViewAll = vi.fn();
    render(
      <ProfileTripsCard
        bookings={[makeBooking()]}
        onViewAll={onViewAll}
        onOpen={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("View all"));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it("falls back to 'Booking' label when service_type is empty", () => {
    render(
      <ProfileTripsCard
        bookings={[makeBooking({ service_type: "" })]}
        onViewAll={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("Booking")).toBeInTheDocument();
  });

  it("falls back to '—' when status is empty", () => {
    render(
      <ProfileTripsCard
        bookings={[makeBooking({ status: "" })]}
        onViewAll={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
