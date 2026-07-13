export type EffectType = "confetti" | "fireworks" | "lasers" | "hearts" | "celebration" | null;

export function detectMessageEffect(text: string): EffectType {
  const lower = text.toLowerCase();
  if (lower.includes("🎉") || lower.includes("congrat") || lower.includes("celebrate")) return "celebration";
  if (lower.includes("🎆") || lower.includes("firework") || lower.includes("boom")) return "fireworks";
  if (lower.includes("❤️") || lower.includes("love you") || lower.includes("i love")) return "hearts";
  if (lower.includes("🎊") || lower.includes("party") || lower.includes("woohoo")) return "confetti";
  return null;
}
