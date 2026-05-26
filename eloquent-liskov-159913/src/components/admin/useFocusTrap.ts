/**
 * useFocusTrap — when `active` is true, traps Tab/Shift+Tab focus inside
 * the container element. Focuses the first focusable child on activation.
 */
import * as React from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean
) {
  React.useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("aria-hidden") && el.offsetParent !== null
      );

    // Focus first focusable on activation
    requestAnimationFrame(() => {
      const focusables = getFocusable();
      if (focusables.length > 0) {
        try { focusables[0].focus({ preventScroll: true }); } catch { /* noop */ }
      } else {
        try { container.focus({ preventScroll: true }); } catch { /* noop */ }
      }
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusable();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}
