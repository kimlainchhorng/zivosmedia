/**
 * Built-in starter marketing templates — ready-to-send copy a shop owner can
 * pick to fill the campaign content, so the picker is never empty. Discount and
 * win-back templates embed an auto-filled offer-expiry date (default two weeks
 * out) that the owner can edit in the body before sending.
 */
import type { MarketingTemplate } from "@/hooks/useMarketingTemplates";

type StarterChannel = "push" | "email" | "sms" | "inapp";
type Ctx = { store: string; expiry: string };

/** Default offer expiry: `daysOut` from today, e.g. "June 24, 2026". */
export function defaultOfferExpiry(daysOut = 14): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOut);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

interface StarterDef {
  id: string;
  name: string;
  /** Store categories this fits; "*" applies to any business. */
  categories: string[];
  channels: StarterChannel[];
  subject?: (c: Ctx) => string;
  body: (c: Ctx) => string;
  /** Shorter copy used for SMS when present. */
  sms?: (c: Ctx) => string;
}

const DEFS: StarterDef[] = [
  {
    id: "discount",
    name: "Limited-time discount",
    categories: ["auto-repair", "*"],
    channels: ["email", "push", "sms", "inapp"],
    subject: () => "Save 15% on your next service",
    body: ({ store, expiry }) =>
      `Save 15% on your next service at ${store}! Book your appointment by ${expiry} to claim this offer. We look forward to taking care of your vehicle.`,
    sms: ({ store, expiry }) => `${store}: Save 15% on your next service! Book by ${expiry}. Reply STOP to opt out.`,
  },
  {
    id: "winback",
    name: "We miss you (win-back)",
    categories: ["auto-repair", "*"],
    channels: ["email", "push", "sms", "inapp"],
    subject: () => "It's been a while — come back and save",
    body: ({ store, expiry }) =>
      `It's been a few months since your last visit to ${store}, and your vehicle may be due for service. Come back by ${expiry} and enjoy 10% off your next visit.`,
    sms: ({ store, expiry }) => `${store}: It's been a while! Your vehicle may be due for service. Visit by ${expiry} for 10% off.`,
  },
  {
    id: "maintenance",
    name: "Maintenance due reminder",
    categories: ["auto-repair"],
    channels: ["email", "push", "sms"],
    subject: () => "Time for your next service?",
    body: ({ store, expiry }) =>
      `Based on your last visit, your vehicle may be due for an oil change or inspection. Schedule with ${store} before ${expiry} and save $10.`,
    sms: ({ store, expiry }) => `${store}: Your vehicle may be due for service. Book by ${expiry} and save $10.`,
  },
  {
    id: "seasonal",
    name: "Seasonal check special",
    categories: ["auto-repair", "*"],
    channels: ["email", "push", "inapp"],
    subject: () => "Get road-trip ready",
    body: ({ store, expiry }) =>
      `Planning a trip this season? Get a full vehicle check at ${store} so you can drive with confidence. Special pricing through ${expiry}.`,
  },
  {
    id: "review",
    name: "Review request",
    categories: ["auto-repair", "*"],
    channels: ["email", "sms", "push"],
    subject: () => "How did we do?",
    body: ({ store }) =>
      `Thank you for trusting ${store} with your vehicle. We'd love to hear how we did — a quick review means the world to a local shop like ours!`,
    sms: ({ store }) => `Thanks for visiting ${store}! Mind leaving us a quick review? It really helps our shop.`,
  },
  {
    id: "thankyou",
    name: "Thank-you / loyalty reward",
    categories: ["auto-repair", "*"],
    channels: ["email", "push", "inapp"],
    subject: () => "A thank-you from all of us",
    body: ({ store, expiry }) =>
      `Thanks for being a valued customer of ${store}. As our thanks, here's 10% off your next visit — valid through ${expiry}.`,
  },

  // ── Salon / spa ──
  {
    id: "salon-rebook",
    name: "Book your next appointment",
    categories: ["salon"],
    channels: ["email", "push", "sms"],
    subject: () => "Time to freshen up?",
    body: ({ store, expiry }) =>
      `It's been a few weeks — treat yourself! Book your next appointment at ${store} by ${expiry} and save 10%.`,
    sms: ({ store, expiry }) => `${store}: Time to freshen up! Book your next appointment by ${expiry} and save 10%.`,
  },
  {
    id: "salon-newclient",
    name: "New client special",
    categories: ["salon"],
    channels: ["email", "push", "sms", "inapp"],
    subject: () => "Your first visit is on us (almost)",
    body: ({ store, expiry }) =>
      `First time at ${store}? Enjoy 15% off any service when you book by ${expiry}. We can't wait to pamper you.`,
    sms: ({ store, expiry }) => `${store}: New here? 15% off your first service. Book by ${expiry}.`,
  },

  // ── Restaurant / café / food ──
  {
    id: "food-special",
    name: "Today's special",
    categories: ["cafe", "drink", "food-market", "restaurant", "grocery"],
    channels: ["email", "push", "inapp", "sms"],
    subject: () => "Today's special is calling",
    body: ({ store, expiry }) =>
      `Craving something good? Stop by ${store} for our latest special — available through ${expiry}. See you soon!`,
    sms: ({ store, expiry }) => `${store}: Today's special is here! Stop by before ${expiry}.`,
  },
  {
    id: "food-comeback",
    name: "We miss you at the table",
    categories: ["cafe", "drink", "food-market", "restaurant"],
    channels: ["email", "push", "sms"],
    subject: () => "We saved your table",
    body: ({ store, expiry }) =>
      `It's been a while! Come back to ${store} before ${expiry} and enjoy a little something on us.`,
    sms: ({ store, expiry }) => `${store}: We miss you! Visit by ${expiry} for a treat on us.`,
  },

  // ── Retail / boutique ──
  {
    id: "retail-newarrivals",
    name: "New arrivals",
    categories: ["boutique", "food-market", "grocery", "retail"],
    channels: ["email", "push", "inapp"],
    subject: () => "Just landed: new arrivals",
    body: ({ store, expiry }) =>
      `Fresh arrivals just dropped at ${store}! Be the first to shop the new collection — preview pricing through ${expiry}.`,
  },
  {
    id: "retail-flashsale",
    name: "Flash sale",
    categories: ["boutique", "food-market", "grocery", "retail"],
    channels: ["email", "push", "sms", "inapp"],
    subject: () => "Flash sale — today only",
    body: ({ store, expiry }) =>
      `Flash sale at ${store}! Save 20% storewide through ${expiry}. Don't miss it.`,
    sms: ({ store, expiry }) => `${store}: Flash sale! 20% off storewide through ${expiry}.`,
  },
];

/**
 * Returns starter templates shaped like saved MarketingTemplates so the picker
 * can render and pick them the same way. Filtered by store category + channel.
 */
export function getStarterTemplates(opts: { category?: string; channel?: string; store?: string }): MarketingTemplate[] {
  const expiry = defaultOfferExpiry();
  const cat = (opts.category || "").toLowerCase();
  const ch = opts.channel as StarterChannel | undefined;
  const ctx: Ctx = { store: (opts.store || "").trim() || "your shop", expiry };
  return DEFS
    .filter((d) => (d.categories.includes("*") || (cat && d.categories.includes(cat))) && (!ch || d.channels.includes(ch)))
    .map((d) => {
      const channel = (ch || "email") as MarketingTemplate["channel"];
      const body = ch === "sms" && d.sms ? d.sms(ctx) : d.body(ctx);
      return {
        id: `starter:${d.id}:${channel}`,
        store_id: "",
        channel,
        name: d.name,
        subject: d.subject ? d.subject(ctx) : null,
        body,
        preview_image_url: null,
        variables_jsonb: [],
        usage_count: 0,
        last_used_at: null,
        created_at: "",
        updated_at: "",
      } as MarketingTemplate;
    });
}

export interface StarterSeed {
  channel: MarketingTemplate["channel"];
  name: string;
  subject: string | null;
  body: string;
  variables_jsonb: string[];
}

/**
 * Insert-ready rows for seeding the saved template library: one row per
 * (template × channel) matching the store category. The caller adds store_id.
 */
export function getStarterTemplateSeeds(category?: string, store?: string): StarterSeed[] {
  const expiry = defaultOfferExpiry();
  const cat = (category || "").toLowerCase();
  const ctx: Ctx = { store: (store || "").trim() || "your shop", expiry };
  const seeds: StarterSeed[] = [];
  for (const d of DEFS) {
    if (!(d.categories.includes("*") || (cat && d.categories.includes(cat)))) continue;
    for (const ch of d.channels) {
      seeds.push({
        channel: ch as MarketingTemplate["channel"],
        name: d.name,
        subject: d.subject ? d.subject(ctx) : null,
        body: ch === "sms" && d.sms ? d.sms(ctx) : d.body(ctx),
        variables_jsonb: [],
      });
    }
  }
  return seeds;
}
