import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import ConfigurationUnavailable from "./ConfigurationUnavailable";

afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); });
it("gives visitors a service recovery action without blaming their connection", () => {
  render(<ConfigurationUnavailable />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("temporarily unavailable");
  expect(screen.getByRole("button", { name: "Reload page" })).toBeVisible();
  expect(screen.getByRole("alert")).not.toHaveTextContent("VITE_");
});
it("honors the Khmer query parameter before app providers start", () => {
  window.history.replaceState({}, "", "/login?lang=km");
  render(<ConfigurationUnavailable />);
  expect(screen.getByRole("main")).toHaveAttribute("lang", "km");
  expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/[\u1780-\u17ff]/);
});
