import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hotelSearch = vi.hoisted(() => ({
  isLoading: false,
  error: "Supplier unavailable",
  results: [] as unknown[],
  searchHotels: vi.fn(),
}));

function PassThrough({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

function Button({ children, size: _size, variant: _variant, ...props }: {
  children?: ReactNode;
  size?: unknown;
  variant?: unknown;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props}>{children}</button>;
}

vi.mock("@/hooks/useTripadvisorSearch", () => ({
  useTripadvisorSearch: () => hotelSearch,
}));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("@/components/hotel/HotelResultsSkeleton", () => ({ default: () => null }));
vi.mock("@/components/ui/button", () => ({ Button }));
vi.mock("@/components/ui/input", () => ({ Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/badge", () => ({ Badge: PassThrough }));
vi.mock("@/components/ui/calendar", () => ({ Calendar: () => null }));
vi.mock("@/components/ui/popover", () => ({
  Popover: PassThrough,
  PopoverContent: PassThrough,
  PopoverTrigger: PassThrough,
}));
vi.mock("@/components/ui/select", () => ({
  Select: PassThrough,
  SelectContent: PassThrough,
  SelectItem: PassThrough,
  SelectTrigger: PassThrough,
  SelectValue: () => null,
}));
vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children, ...props }: { children?: ReactNode } & HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  AlertDescription: PassThrough,
}));
vi.mock("@/components/hotel/HotelResultCardPro", () => ({ default: () => null }));
vi.mock("@/components/hotel/HotelPartnerSelector", () => ({ default: () => null }));
vi.mock("@/components/shared/AffiliateRedirectNotice", () => ({ default: () => null }));
vi.mock("@/components/hotel/HotelTopSearchCTA", () => ({ default: () => null }));
vi.mock("@/components/hotel/HotelStickyBookingCTA", () => ({ default: () => null }));
vi.mock("@/components/shared/ImageHero", () => ({ default: PassThrough }));
vi.mock("@/components/shared/BigSearchCard", () => ({ default: PassThrough }));
vi.mock("@/components/shared/DestinationCardsGrid", () => ({ default: () => null }));
vi.mock("@/components/shared/TrustSection", () => ({ default: () => null }));
vi.mock("@/components/travel-extras", () => ({ EnhanceYourTrip: () => null }));
vi.mock("@/components/shared/TravelFAQ", () => ({ default: () => null }));
vi.mock("@/components/shared/MobileBottomNav", () => ({ default: () => null }));
vi.mock("@/components/marketing", () => ({ OGImageMeta: () => null, TrustFeatureCards: () => null }));
vi.mock("@/components/seo", () => ({
  InternalLinkGrid: () => null,
  PopularDestinationsGrid: () => null,
  SEOContentBlock: () => null,
}));
vi.mock("@/components/hotel/HotelImageShowcase", () => ({ default: () => null }));
vi.mock("@/components/hotel/HotelExperienceGallery", () => ({ default: () => null }));
vi.mock("@/components/hotel/HotelInspirationalBanner", () => ({ default: () => null }));

import HotelBooking from "./HotelBooking";

describe("HotelBooking failed search recovery", () => {
  beforeEach(() => {
    hotelSearch.isLoading = false;
    hotelSearch.error = "Supplier unavailable";
    hotelSearch.results = [];
    hotelSearch.searchHotels.mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a retryable unavailable result instead of claiming no hotels were found", async () => {
    render(<HotelBooking />);

    fireEvent.change(screen.getByPlaceholderText("City, hotel name, or destination"), {
      target: { value: "Phnom Penh" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Search Hotels" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't search hotels in Phnom Penh");
    expect(screen.queryByText("No hotels found")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });

    expect(hotelSearch.searchHotels).toHaveBeenLastCalledWith("Phnom Penh");
  });
});
