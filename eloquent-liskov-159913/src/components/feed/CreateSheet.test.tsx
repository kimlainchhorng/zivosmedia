import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreateSheet from "./CreateSheet";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current path">{location.pathname + location.search}</output>;
}

function renderCreateSheet() {
  return render(
    <MemoryRouter initialEntries={["/feed"]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <LocationProbe />
              <CreateSheet open onOpenChange={vi.fn()} authRedirectPath="/feed" />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe("CreateSheet", () => {
  it("searches across all studio modes, not only the selected tab", () => {
    renderCreateSheet();

    fireEvent.change(screen.getByPlaceholderText("Search create tools"), {
      target: { value: "marketplace" },
    });

    expect(screen.getByRole("button", { name: "Create Marketplace" })).toBeInTheDocument();
    expect(screen.getByText("Search results")).toBeInTheDocument();
  });

  it("exposes business management tools in Manage mode", () => {
    renderCreateSheet();

    fireEvent.click(screen.getByRole("button", { name: /Manage/i }));

    expect(screen.getByRole("button", { name: "Create Products" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Orders" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Analytics" })).toBeInTheDocument();
  });

  it("keeps the selected studio destination through login", () => {
    renderCreateSheet();

    fireEvent.click(screen.getByRole("button", { name: /Manage/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create Products" }));

    expect(screen.getByLabelText("current path")).toHaveTextContent(
      "/login?redirect=%2Fshop-dashboard%2Fproducts",
    );
  });
});
