import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CountryPhoneInput } from "./CountryPhoneInput";

afterEach(cleanup);

describe("CountryPhoneInput accessibility", () => {
  it("forwards native field semantics and its ref to the telephone input", () => {
    const inputRef = createRef<HTMLInputElement>();

    render(
      <div>
        <label htmlFor="guest-phone">Phone number</label>
        <CountryPhoneInput
          ref={inputRef}
          id="guest-phone"
          name="guest_phone"
          value="+1"
          onChange={() => undefined}
          required
          autoComplete="tel-national"
          aria-invalid="true"
          aria-describedby="guest-phone-error"
        />
        <p id="guest-phone-error">Enter a valid phone number.</p>
      </div>,
    );

    const input = screen.getByLabelText("Phone number");
    expect(input).toBe(inputRef.current);
    expect(input).toHaveAttribute("type", "tel");
    expect(input).toHaveAttribute("name", "guest_phone");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("autocomplete", "tel-national");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute(
      "aria-describedby",
      "guest-phone-hint guest-phone-error",
    );
    expect(document.getElementById("guest-phone-hint")).toHaveTextContent(
      "United States • 10 digits",
    );

    inputRef.current?.focus();
    expect(input).toHaveFocus();
  });

  it("keeps E.164 emission and the existing autocomplete default", () => {
    const onChange = vi.fn();

    render(
      <CountryPhoneInput
        aria-label="Mobile number"
        value="+1"
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Mobile number" });
    expect(input).toHaveAttribute("autocomplete", "off");

    fireEvent.change(input, { target: { value: "201 555 0123" } });
    expect(onChange).toHaveBeenLastCalledWith("+12015550123");
  });
});
