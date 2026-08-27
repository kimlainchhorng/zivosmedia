import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { format } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { user: { id: "user-a" } as { id: string } | null },
  filters: [] as Array<{ table: string; column: string; value: unknown }>,
  from: vi.fn(),
  navigate: vi.fn(),
  rejections: new Map<string, unknown>(),
  responses: new Map<string, { data: unknown[] | null; error: unknown }>(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mocks.from(...args),
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

import TodayPlanWidget from "./TodayPlanWidget";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });
}

function createSupabaseBuilder(table: string) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    then: vi.fn(),
  };

  builder.select.mockImplementation(() => builder);
  builder.eq.mockImplementation((column: string, value: unknown) => {
    mocks.filters.push({ table, column, value });
    return builder;
  });
  builder.in.mockImplementation((column: string, value: unknown) => {
    mocks.filters.push({ table, column, value });
    return builder;
  });
  builder.then.mockImplementation(
    (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => {
      const rejection = mocks.rejections.get(table);
      const response = rejection
        ? Promise.reject(rejection)
        : Promise.resolve(
            mocks.responses.get(table) ?? { data: [], error: null },
          );
      return response.then(onFulfilled, onRejected);
    },
  );

  return builder;
}

function renderWidget(queryClient = createQueryClient()) {
  const result = render(
    <QueryClientProvider client={queryClient}>
      <TodayPlanWidget />
    </QueryClientProvider>,
  );

  return { ...result, queryClient };
}

function setSuccessfulResponses() {
  mocks.responses.set("flight_bookings", {
    data: [
      {
        id: "flight-1",
        origin: "PNH",
        destination: "SIN",
        booking_reference: "ZV123",
      },
    ],
    error: null,
  });
  mocks.responses.set("hotel_bookings", {
    data: [
      {
        id: "hotel-1",
        hotels: { name: "Mekong Hotel", city: "Phnom Penh" },
      },
    ],
    error: null,
  });
}

function tableReadCount(table: string) {
  return mocks.from.mock.calls.filter(([calledTable]) => calledTable === table)
    .length;
}

function getTodayPlanQueryKey(queryClient: QueryClient, userId: string) {
  const query = queryClient
    .getQueryCache()
    .getAll()
    .find(
      (candidate) =>
        candidate.queryKey[0] === "home-today-plan" &&
        candidate.queryKey[1] === userId,
    );
  if (!query) throw new Error(`Missing Today Plan query for ${userId}`);
  return query.queryKey;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.user = { id: "user-a" };
  mocks.filters.length = 0;
  mocks.rejections.clear();
  mocks.responses.clear();
  mocks.from.mockImplementation((table: string) =>
    createSupabaseBuilder(table),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TodayPlanWidget request cache", () => {
  it("reuses same-account same-day data on a quick Home remount", async () => {
    setSuccessfulResponses();
    const queryClient = createQueryClient();

    const first = renderWidget(queryClient);
    expect(await screen.findByText("PNH → SIN")).toBeInTheDocument();
    expect(screen.getByText("Check-in: Mekong Hotel")).toBeInTheDocument();
    expect(tableReadCount("flight_bookings")).toBe(1);
    expect(tableReadCount("hotel_bookings")).toBe(1);
    expect(tableReadCount("restaurant_reservations")).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: /PNH → SIN/ }));
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/flights/confirmation/flight-1",
    );

    first.unmount();
    renderWidget(queryClient);
    expect(screen.getByText("PNH → SIN")).toBeInTheDocument();

    await waitFor(() => {
      expect(tableReadCount("flight_bookings")).toBe(1);
      expect(tableReadCount("hotel_bookings")).toBe(1);
      expect(tableReadCount("restaurant_reservations")).toBe(0);
    });
  });

  it("isolates cached plans by account and local day", async () => {
    setSuccessfulResponses();
    const queryClient = createQueryClient();
    const first = renderWidget(queryClient);

    expect(await screen.findByText("PNH → SIN")).toBeInTheDocument();
    first.unmount();
    mocks.auth.user = { id: "user-b" };
    renderWidget(queryClient);

    await waitFor(() => expect(tableReadCount("flight_bookings")).toBe(2));
    expect(mocks.filters).toContainEqual({
      table: "flight_bookings",
      column: "customer_id",
      value: "user-a",
    });
    expect(mocks.filters).toContainEqual({
      table: "flight_bookings",
      column: "customer_id",
      value: "user-b",
    });

    expect(getTodayPlanQueryKey(queryClient, "user-a")[2]).toBe(
      format(new Date(), "yyyy-MM-dd"),
    );
    expect(getTodayPlanQueryKey(queryClient, "user-b")[2]).toBe(
      format(new Date(), "yyyy-MM-dd"),
    );
  });

  it("starts a new cache entry when the local day changes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 26, 23, 59));
    setSuccessfulResponses();
    const queryClient = createQueryClient();
    renderWidget(queryClient);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("PNH → SIN")).toBeInTheDocument();
    vi.setSystemTime(new Date(2026, 7, 27, 0, 1));
    setSuccessfulResponses();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });

    expect(tableReadCount("flight_bookings")).toBe(2);
    const localDays = queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => query.queryKey[0] === "home-today-plan")
      .map((query) => query.queryKey[2]);
    expect(localDays).toEqual(
      expect.arrayContaining(["2026-08-26", "2026-08-27"]),
    );
  });

  it("negative-caches a failed refresh without presenting old rows as current", async () => {
    setSuccessfulResponses();
    const queryClient = createQueryClient();
    const first = renderWidget(queryClient);
    expect(await screen.findByText("PNH → SIN")).toBeInTheDocument();

    mocks.responses.set("flight_bookings", {
      data: null,
      error: { message: "Flight plans are unavailable", status: 503 },
    });
    const key = getTodayPlanQueryKey(queryClient, "user-a");
    await queryClient.invalidateQueries({ queryKey: key, exact: true });

    await waitFor(() => {
      expect(queryClient.getQueryData(key)).toEqual({ status: "unavailable" });
      expect(screen.queryByText("PNH → SIN")).not.toBeInTheDocument();
    });
    expect(queryClient.getQueryState(key)?.status).toBe("success");
    expect(tableReadCount("flight_bookings")).toBe(2);

    first.unmount();
    renderWidget(queryClient);
    await waitFor(() => expect(tableReadCount("flight_bookings")).toBe(2));
    expect(screen.queryByText("PNH → SIN")).not.toBeInTheDocument();
  });

  it("negative-caches a rejected network read", async () => {
    mocks.responses.set("flight_bookings", { data: [], error: null });
    mocks.responses.set("hotel_bookings", { data: [], error: null });
    mocks.rejections.set("hotel_bookings", new Error("Network unavailable"));
    const queryClient = createQueryClient();
    const first = renderWidget(queryClient);
    const key = getTodayPlanQueryKey(queryClient, "user-a");

    await waitFor(() =>
      expect(queryClient.getQueryData(key)).toEqual({ status: "unavailable" }),
    );
    expect(tableReadCount("flight_bookings")).toBe(1);
    expect(tableReadCount("hotel_bookings")).toBe(1);

    first.unmount();
    renderWidget(queryClient);
    await waitFor(() => expect(tableReadCount("hotel_bookings")).toBe(1));
  });

  it("keeps a confirmed empty plan hidden", async () => {
    mocks.responses.set("flight_bookings", { data: [], error: null });
    mocks.responses.set("hotel_bookings", { data: [], error: null });
    const queryClient = createQueryClient();
    renderWidget(queryClient);
    const key = getTodayPlanQueryKey(queryClient, "user-a");

    await waitFor(() =>
      expect(queryClient.getQueryState(key)?.status).toBe("success"),
    );
    expect(
      screen.queryByRole("heading", { name: "Today's plan" }),
    ).not.toBeInTheDocument();
  });
});
