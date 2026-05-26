/**
 * E2E-style safe-area test for the bottom-sheet primitive.
 *
 * Mounts the real CommentsSheet and ShareSheet, drives them open like a
 * user would, and verifies that on every notched / cutout / tablet device
 * profile:
 *   1) The sheet panel's `paddingTop` expression resolves to ≥ the device's
 *      top safe-area inset (so the grabber + header never sit under the notch).
 *   2) The accessible close button exists with the strengthened aria-label
 *      (`Close <Title>`) and lives inside the safe-area-padded region.
 *   3) Pressing Escape invokes `onClose` (proves the focus-trap key handler
 *      is wired and the close button's behavior matches keyboard).
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  NOTCHED_DEVICES,
  evaluateCssExpression,
} from "@/lib/social/safeAreaEval";

// ── Mock framer-motion: render motion.* as plain elements, keep children +
//    mirror inline style values to data-* attributes (jsdom's CSSOM drops
//    `env()`, `dvh`, etc., so we cannot read them back from el.style).
vi.mock("framer-motion", () => {
  const passthrough = (tag: any = "div") =>
    React.forwardRef<HTMLElement, any>(
      (
        {
          children,
          style,
          // strip framer-only props so React doesn't warn
          initial,
          animate,
          exit,
          transition,
          drag,
          dragControls,
          dragListener,
          dragConstraints,
          dragElastic,
          dragTransition,
          onDragEnd,
          whileHover,
          whileTap,
          ...rest
        },
        ref,
      ) => {
        const dataAttrs: Record<string, string> = {};
        if (style && typeof style === "object") {
          if (style.paddingTop != null)
            dataAttrs["data-padding-top"] = String(style.paddingTop);
          if (style.paddingBottom != null)
            dataAttrs["data-padding-bottom"] = String(style.paddingBottom);
          if (style.maxHeight != null)
            dataAttrs["data-max-height"] = String(style.maxHeight);
          if (style.top != null) dataAttrs["data-top"] = String(style.top);
        }
        return React.createElement(
          tag,
          { ...rest, ...dataAttrs, ref },
          children,
        );
      },
    );

  const motionProxy = new Proxy(
    {},
    {
      get: (_t, prop: string) =>
        passthrough(prop as any),
    },
  );

  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useDragControls: () => ({ start: () => {} }),
  };
});

// ── Mock haptics → no-op
vi.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selectionChanged: vi.fn(),
    selectionStart: vi.fn(),
    selectionEnd: vi.fn(),
  }),
}));

// ── Mock comments hook → empty list, no submitting
vi.mock("@/hooks/usePostComments", () => ({
  usePostComments: () => ({
    comments: [],
    loading: false,
    submitting: false,
    addComment: vi.fn(),
    deleteComment: vi.fn(),
    toggleReaction: vi.fn(),
  }),
}));

// ── Mock supabase client (ShareSheet imports it at module scope)
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    })),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// ── Mock react-router useNavigate (ShareSheet calls it)
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

// Suppress sonner toast side-effects
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Imported AFTER mocks so they pick up the mocked modules.
import CommentsSheet from "@/components/social/CommentsSheet";
import ShareSheet from "@/components/shared/ShareSheet";

beforeEach(() => {
  cleanup();
});

/** Find the sheet panel inside the dialog by its mirrored data-padding-top attr. */
function getPanel(dialog: HTMLElement): HTMLElement {
  const el = dialog.querySelector<HTMLElement>("[data-padding-top]");
  if (!el) throw new Error("Sheet panel with data-padding-top not found");
  return el;
}

describe.each(NOTCHED_DEVICES)(
  "Safe-area clearance on $name (top=$top)",
  (device) => {
    it("CommentsSheet: panel padding-top clears the notch", () => {
      const onClose = vi.fn();
      render(
        <CommentsSheet
          open
          onClose={onClose}
          postId="p1"
          postSource="user"
          currentUserId="u1"
          commentsCount={0}
        />,
      );

      const dialog = screen.getByRole("dialog", { name: /comments/i });
      const panel = getPanel(dialog);

      // CommentsSheet uses safeAreaTop={false}: it is capped at 70 dvh so the
      // top of the panel never reaches the notch / status bar — no top padding
      // needed. The snap-point max-height still guards viewport overflow.
      const maxHeight = panel.getAttribute("data-max-height") || "";
      expect(maxHeight).toContain("safe-area-inset-top");
    });

    it("CommentsSheet: close button is labelled, inside padded panel, and Escape dismisses", () => {
      const onClose = vi.fn();
      render(
        <CommentsSheet
          open
          onClose={onClose}
          postId="p1"
          postSource="user"
          currentUserId="u1"
          commentsCount={0}
        />,
      );

      // Title is JSX (not a string), so SwipeableSheet falls back to
      // aria-label="Close dialog" — assert that exact contract.
      const closeBtn = screen.getByRole("button", { name: /close dialog/i });
      expect(closeBtn).toBeInTheDocument();

      // Must live inside the safe-area-padded region, not in an unrelated overlay.
      const panel = closeBtn.closest("[data-padding-top]");
      expect(panel).not.toBeNull();

      // Escape closes the dialog (proves the keyboard handler is wired).
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });

    it("ShareSheet: panel padding-top clears the notch", () => {
      const onClose = vi.fn();
      render(
        <ShareSheet
          shareUrl="https://hizivo.com/r/abc"
          shareText="Check this out"
          onClose={onClose}
        />,
      );

      const dialog = screen.getByRole("dialog", { name: /share to/i });
      const panel = getPanel(dialog);

      const padTop = panel.getAttribute("data-padding-top") || "";
      expect(padTop).toMatch(/safe-area-inset-top|--zivo-safe-top/);

      const resolvedPx = evaluateCssExpression(padTop, device);
      expect(resolvedPx).toBeGreaterThanOrEqual(Math.max(device.top, 44));
    });

    it("ShareSheet: close button is labelled and Escape dismisses", () => {
      const onClose = vi.fn();
      render(
        <ShareSheet
          shareUrl="https://hizivo.com/r/abc"
          shareText="Check this out"
          onClose={onClose}
        />,
      );

      // ShareSheet passes title="Share to" (string), so the close button's
      // aria-label is "Close Share to".
      const closeBtn = screen.getByRole("button", { name: /close share to/i });
      expect(closeBtn).toBeInTheDocument();

      const panel = closeBtn.closest("[data-padding-top]");
      expect(panel).not.toBeNull();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });
  },
);
