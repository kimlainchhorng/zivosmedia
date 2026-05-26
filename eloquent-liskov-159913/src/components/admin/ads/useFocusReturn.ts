/**
 * useFocusReturn — stash the focused element when `open` flips true, restore it
 * when `open` flips false. Survives the Sheet ↔ Dialog swap that happens when
 * the viewport crosses the mobile breakpoint mid-render.
 */
import * as React from "react";

export function useFocusReturn(open: boolean) {
  const triggerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      triggerRef.current = (document.activeElement as HTMLElement) ?? null;
    } else if (triggerRef.current) {
      // Defer one frame so Radix has finished its own focus management
      const el = triggerRef.current;
      requestAnimationFrame(() => {
        try { el.focus({ preventScroll: true }); } catch { /* noop */ }
      });
      triggerRef.current = null;
    }
  }, [open]);
}
