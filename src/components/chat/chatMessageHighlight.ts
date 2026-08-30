const chatMessageHighlightBase =
  "rounded-2xl transition-[background-color,box-shadow] duration-500 ease-out";

const chatMessageHighlightActive =
  // Real class, not an arbitrary value: Tailwind splits an arbitrary value at
  // its last "/" to find an opacity modifier, and hsl(var(--primary)/0.78)
  // is full of them. See .zivo-chat-message-highlight in index.css.
  "zivo-chat-message-highlight";

export function getChatMessageHighlightClass(isHighlighted: boolean) {
  return isHighlighted
    ? `${chatMessageHighlightBase} ${chatMessageHighlightActive}`
    : chatMessageHighlightBase;
}
