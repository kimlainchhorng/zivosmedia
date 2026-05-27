const chatMessageHighlightBase =
  "rounded-2xl transition-[background-color,box-shadow] duration-500 ease-out";

const chatMessageHighlightActive =
  "bg-sky-500/10 shadow-[inset_4px_0_0_rgba(14,165,233,0.78),0_0_0_1px_rgba(14,165,233,0.32),0_12px_30px_rgba(14,165,233,0.12)] dark:bg-sky-400/10 dark:shadow-[inset_4px_0_0_rgba(56,189,248,0.8),0_0_0_1px_rgba(56,189,248,0.34),0_12px_30px_rgba(56,189,248,0.16)]";

export function getChatMessageHighlightClass(isHighlighted: boolean) {
  return isHighlighted
    ? `${chatMessageHighlightBase} ${chatMessageHighlightActive}`
    : chatMessageHighlightBase;
}
