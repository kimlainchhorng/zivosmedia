/**
 * marketing-tokens.ts — Shared responsive class utilities for the Marketing & Ads UI.
 * Use these everywhere instead of ad-hoc class strings to keep typography, spacing,
 * and touch targets consistent across desktop, iPad, and mobile.
 */

export const mkHeading = "text-base sm:text-lg lg:text-xl font-semibold tracking-tight";
export const mkSubheading = "text-sm sm:text-[15px] font-medium";
export const mkBody = "text-[13px] sm:text-sm leading-relaxed";
export const mkMeta = "text-[11px] sm:text-xs text-muted-foreground";
export const mkLabel = "text-[11px] sm:text-xs font-medium text-muted-foreground";

export const mkCardPad = "p-3 sm:p-4 lg:p-5";
export const mkCardPadTight = "p-2.5 sm:p-3 lg:p-4";
export const mkSection = "space-y-3 sm:space-y-4 lg:space-y-5";
export const mkRow = "py-2.5 sm:py-3";

// Touch targets — bigger on mobile, denser on desktop
export const mkButton = "h-10 sm:h-9";
export const mkButtonSm = "h-9 sm:h-8";
export const mkIconButton = "h-9 w-9 sm:h-8 sm:w-8 p-0";
export const mkInput = "h-10 sm:h-9 text-sm";

// Tables
export const mkTableCell = "px-2.5 py-2 sm:px-3 sm:py-2.5";
export const mkTableHeader = "text-[11px] uppercase tracking-wide font-semibold text-muted-foreground";
export const mkTableNum = "tabular-nums text-right";

// Sticky footer for sheets/dialogs (safe-area aware on mobile)
export const mkStickyFooter =
  "sticky bottom-0 left-0 right-0 bg-background border-t border-border px-3 sm:px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]";
