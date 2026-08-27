import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { CurrencyProvider, useCurrency } from "./CurrencyContext";

const HOTEL_PATH = "/hotel/51518d9b-8621-4727-8a7e-a94765102f6b";
const KHR_ROUTE = `${HOTEL_PATH}?ci=2026-09-08&co=2026-09-10&adults=2&children=0&currency=KHR`;

function CurrencyRouteHarness() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currency } = useCurrency();

  return (
    <>
      <output aria-label="Current currency">{currency}</output>
      <output aria-label="Current route">{`${location.pathname}${location.search}`}</output>
      <button type="button" onClick={() => navigate(KHR_ROUTE)}>Open KHR hotel link</button>
      <button type="button" onClick={() => navigate(`${HOTEL_PATH}?adults=2`)}>Remove currency</button>
      <button type="button" onClick={() => navigate(`${HOTEL_PATH}?currency=ZZZ`)}>Use invalid currency</button>
    </>
  );
}

function renderHarness() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <CurrencyProvider>
        <CurrencyRouteHarness />
      </CurrencyProvider>
    </MemoryRouter>,
  );
}

describe("CurrencyProvider route synchronization", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("zivo_currency", "USD");
    localStorage.setItem("zivo_fx_rates", JSON.stringify({
      rates: { USD: 1, KHR: 4100 },
      fetchedAt: Date.now(),
    }));
  });

  it("adopts a valid currency parameter delivered after mount without rewriting or persisting it", async () => {
    renderHarness();

    expect(screen.getByLabelText("Current currency")).toHaveTextContent("USD");
    fireEvent.click(screen.getByRole("button", { name: "Open KHR hotel link" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Current currency")).toHaveTextContent("KHR");
    });
    expect(screen.getByLabelText("Current route")).toHaveTextContent(KHR_ROUTE);
    expect(localStorage.getItem("zivo_currency")).toBe("USD");
  });

  it("keeps the current session currency when later routes omit or reject the parameter", async () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Open KHR hotel link" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Current currency")).toHaveTextContent("KHR");
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove currency" }));
    expect(screen.getByLabelText("Current currency")).toHaveTextContent("KHR");

    fireEvent.click(screen.getByRole("button", { name: "Use invalid currency" }));
    expect(screen.getByLabelText("Current currency")).toHaveTextContent("KHR");
  });
});
