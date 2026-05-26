export const lodgingCategoryFixtures = ["Hotel", "Hotels", "Resort", "Resorts", "Guesthouse", "Guest House", "Guesthouse / B&B", "Bed and Breakfast", "B&B", "  b&b  ", "guesthouse_b&b", "BED-AND-BREAKFAST"];

export const nonLodgingCategoryFixtures = ["restaurant", "grocery", "auto-repair", "spa", "", null, undefined];

export const lodgingNormalizationFixtures = [
  { input: " Guesthouse / B&B ", expected: "guesthouse bed and breakfast" },
  { input: "BED-AND-BREAKFAST", expected: "bed and breakfast" },
  { input: "  b&b  ", expected: "bed and breakfast" },
];