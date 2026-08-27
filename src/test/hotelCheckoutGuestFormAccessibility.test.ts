import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );

const checkoutSource = read("src/pages/lodging/HotelRoomCheckoutPage.tsx");
const compactCheckoutSource = checkoutSource
  .replace(/\{" "\}/g, " ")
  .replace(/\s+/g, " ");

describe("hotel checkout guest form accessibility", () => {
  it("connects the guest labels, fields, hints, and validation errors", () => {
    expect(compactCheckoutSource).toContain(
      '<motion.form id="hotel-guest-details-form" noValidate onSubmit={handleCheckoutSubmit} onKeyDown={handleGuestFormKeyDown} aria-labelledby="hotel-guest-details-heading"',
    );
    expect(compactCheckoutSource).toContain(
      '<Label htmlFor="hotel-guest-name"',
    );
    expect(compactCheckoutSource).toContain(
      'id="hotel-guest-name" name="guest_name" required autoComplete="name"',
    );
    expect(compactCheckoutSource).toMatch(
      /aria-describedby=\{\s*nameError \? "hotel-guest-name-error" : undefined\s*\}/,
    );
    expect(compactCheckoutSource).toContain(
      '<p id="hotel-guest-name-error" role="alert"',
    );

    expect(compactCheckoutSource).toContain(
      '<Label htmlFor="hotel-guest-phone"',
    );
    expect(compactCheckoutSource).toContain(
      'id="hotel-guest-phone" value={phone}',
    );
    expect(compactCheckoutSource).toContain(
      'name="guest_phone" required autoComplete="tel-national"',
    );
    expect(compactCheckoutSource).toMatch(
      /aria-describedby=\{\s*phoneError \? "hotel-guest-phone-error" : undefined\s*\}/,
    );
    expect(compactCheckoutSource).toContain(
      '<p id="hotel-guest-phone-error" role="alert"',
    );

    expect(compactCheckoutSource).toContain(
      '<Label htmlFor="hotel-guest-email"',
    );
    expect(compactCheckoutSource).toContain(
      'id="hotel-guest-email" name="guest_email"',
    );
    expect(compactCheckoutSource).toContain('autoComplete="email"');
    expect(compactCheckoutSource).toContain(
      '<Label htmlFor="hotel-special-requests"',
    );
    expect(compactCheckoutSource).toContain(
      'id="hotel-special-requests" name="special_requests" autoComplete="off"',
    );
  });

  it("uses the outside confirm button as the form submit control", () => {
    expect(compactCheckoutSource).toContain(
      '<Button type="submit" form="hotel-guest-details-form"',
    );
    expect(checkoutSource).not.toContain("onClick={handleConfirm}");
    expect(compactCheckoutSource).toMatch(
      /const handleCheckoutSubmit = \(\s*event: FormEvent<HTMLFormElement>,?\s*\) => \{ event\.preventDefault\(\); void handleConfirm\(\); \};/,
    );
    expect(compactCheckoutSource).toMatch(
      /const handleGuestFormKeyDown = \(\s*event: ReactKeyboardEvent<HTMLFormElement>,?\s*\) => \{ if \(\s*event\.key !== "Enter" \|\| event\.defaultPrevented \|\| event\.nativeEvent\.isComposing\s*\) return; if \(\s*event\.target instanceof HTMLTextAreaElement \|\| event\.target instanceof HTMLButtonElement\s*\) return; event\.preventDefault\(\); event\.currentTarget\.requestSubmit\(\); \};/,
    );
  });

  it("focuses the first invalid required field before reservation work", () => {
    const handlerStart = checkoutSource.indexOf(
      "const handleConfirm = async () => {",
    );
    const handlerEnd = checkoutSource.indexOf(
      "const handleCheckoutSubmit =",
      handlerStart,
    );
    const handler = checkoutSource.slice(handlerStart, handlerEnd);
    const compactHandler = handler.replace(/\s+/g, " ");

    expect(handlerStart).toBeGreaterThan(-1);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    expect(handler).toContain("if (submitInFlightRef.current) return;");
    expect(handler).toContain("setGuestValidationAttempted(true);");
    expect(compactHandler).toContain(
      "const firstInvalidField = nameInvalid ? nameInputRef.current : phoneInputRef.current;",
    );
    expect(handler).toContain(
      "firstInvalidField?.focus({ preventScroll: true });",
    );
    expect(handler.indexOf("if (nameInvalid || phoneInvalid)")).toBeLessThan(
      handler.indexOf("await supabase.auth.getUser()"),
    );
    expect(handler.indexOf("await supabase.auth.getUser()")).toBeLessThan(
      handler.indexOf("createLodgeGuestReservation({"),
    );
    expect(handler.indexOf("submitInFlightRef.current = true;")).toBeLessThan(
      handler.indexOf("createLodgeGuestReservation({"),
    );
    expect(handler).toContain("submitInFlightRef.current = false;");
    expect(handler.match(/createLodgeGuestReservation\(\{/g)).toHaveLength(1);
  });

  it("preserves the reservation payload after client-side validation", () => {
    for (const payloadLine of [
      "store_id: storeId",
      "room_id: roomId",
      "guest_name: name.trim()",
      "guest_phone: phone.trim()",
      "guest_email: email.trim() || null",
      "payment_method: payMethod",
      "notes: notes.trim() || null",
    ]) {
      expect(checkoutSource).toContain(payloadLine);
    }
  });
});
