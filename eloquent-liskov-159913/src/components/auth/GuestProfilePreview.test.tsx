import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import GuestProfilePreview from "./GuestProfilePreview";

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current path">{`${location.pathname}${location.search}`}</output>;
}

describe("GuestProfilePreview", () => {
  it("redirects anonymous profile visits to login with the profile destination preserved", () => {
    render(
      <MemoryRouter initialEntries={["/profile?tab=posts"]}>
        <Routes>
          <Route path="/profile" element={<GuestProfilePreview />} />
          <Route path="/login" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("current path")).toHaveTextContent(
      "/login?redirect=%2Fprofile%3Ftab%3Dposts",
    );
  });
});
