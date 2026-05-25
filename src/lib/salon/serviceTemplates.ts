/**
 * Pre-built service menus for fast onboarding. Owners can pick a template
 * matching their salon type and get a starter catalog in one click.
 * All prices are USD in cents; durations in minutes.
 */

export interface ServiceTemplateItem {
  name: string;
  category: string;
  duration_minutes: number;
  price_cents: number;
  description?: string;
}

export interface ServiceTemplate {
  id: string;
  label: string;
  description: string;
  emoji: string;
  items: ServiceTemplateItem[];
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    id: "nails",
    label: "Nail Salon",
    description: "Manis, pedis, gels, acrylics — the essentials.",
    emoji: "💅",
    items: [
      { name: "Classic Manicure", category: "Nails", duration_minutes: 30, price_cents: 2500 },
      { name: "Gel Manicure", category: "Nails", duration_minutes: 45, price_cents: 3500 },
      { name: "Dipping Powder", category: "Nails", duration_minutes: 60, price_cents: 5000 },
      { name: "Acrylic Full Set", category: "Nails", duration_minutes: 90, price_cents: 6500 },
      { name: "Acrylic Fill", category: "Nails", duration_minutes: 60, price_cents: 4500 },
      { name: "Classic Pedicure", category: "Nails", duration_minutes: 45, price_cents: 3500 },
      { name: "Gel Pedicure", category: "Nails", duration_minutes: 60, price_cents: 5000 },
      { name: "Spa Pedicure", category: "Nails", duration_minutes: 75, price_cents: 6000 },
      { name: "Nail Art (per nail)", category: "Add-on", duration_minutes: 15, price_cents: 500 },
      { name: "Polish Change", category: "Add-on", duration_minutes: 15, price_cents: 1500 },
    ],
  },
  {
    id: "hair",
    label: "Hair Salon",
    description: "Cuts, color, blowouts, and treatments.",
    emoji: "💇",
    items: [
      { name: "Women's Haircut", category: "Hair", duration_minutes: 45, price_cents: 5500 },
      { name: "Men's Haircut", category: "Hair", duration_minutes: 30, price_cents: 3500 },
      { name: "Kids' Haircut (12 & under)", category: "Hair", duration_minutes: 30, price_cents: 2500 },
      { name: "Shampoo & Blowout", category: "Hair", duration_minutes: 45, price_cents: 4500 },
      { name: "Root Touch-up", category: "Color", duration_minutes: 90, price_cents: 9500 },
      { name: "All-over Color", category: "Color", duration_minutes: 120, price_cents: 13500 },
      { name: "Highlights – Partial", category: "Color", duration_minutes: 120, price_cents: 14500 },
      { name: "Highlights – Full", category: "Color", duration_minutes: 180, price_cents: 19500 },
      { name: "Balayage", category: "Color", duration_minutes: 180, price_cents: 22500 },
      { name: "Deep Conditioning", category: "Treatment", duration_minutes: 30, price_cents: 3500 },
      { name: "Keratin Smoothing", category: "Treatment", duration_minutes: 180, price_cents: 25000 },
    ],
  },
  {
    id: "barber",
    label: "Barber Shop",
    description: "Cuts, fades, beard work, hot-towel shaves.",
    emoji: "💈",
    items: [
      { name: "Classic Haircut", category: "Hair", duration_minutes: 30, price_cents: 3000 },
      { name: "Skin Fade", category: "Hair", duration_minutes: 45, price_cents: 4000 },
      { name: "Cut + Beard Trim", category: "Hair", duration_minutes: 45, price_cents: 4500 },
      { name: "Beard Trim & Line-up", category: "Beard", duration_minutes: 20, price_cents: 2000 },
      { name: "Hot Towel Shave", category: "Beard", duration_minutes: 30, price_cents: 3500 },
      { name: "Kids' Cut (10 & under)", category: "Hair", duration_minutes: 25, price_cents: 2000 },
      { name: "Buzz Cut", category: "Hair", duration_minutes: 15, price_cents: 1500 },
      { name: "Hair Color / Tint", category: "Color", duration_minutes: 60, price_cents: 6500 },
      { name: "Eyebrow Cleanup", category: "Add-on", duration_minutes: 10, price_cents: 1000 },
    ],
  },
  {
    id: "spa",
    label: "Beauty & Spa",
    description: "Facials, waxing, brows, lashes.",
    emoji: "💆",
    items: [
      { name: "Express Facial", category: "Spa", duration_minutes: 30, price_cents: 4500 },
      { name: "Classic Facial", category: "Spa", duration_minutes: 60, price_cents: 7500 },
      { name: "Anti-Aging Facial", category: "Spa", duration_minutes: 75, price_cents: 11000 },
      { name: "Acne Facial", category: "Spa", duration_minutes: 60, price_cents: 8500 },
      { name: "Eyebrow Wax", category: "Waxing", duration_minutes: 15, price_cents: 1500 },
      { name: "Lip Wax", category: "Waxing", duration_minutes: 10, price_cents: 1000 },
      { name: "Brazilian Wax", category: "Waxing", duration_minutes: 30, price_cents: 6500 },
      { name: "Leg Wax (full)", category: "Waxing", duration_minutes: 45, price_cents: 7500 },
      { name: "Brow Shaping & Tint", category: "Brows & Lashes", duration_minutes: 30, price_cents: 3500 },
      { name: "Lash Lift", category: "Brows & Lashes", duration_minutes: 45, price_cents: 6500 },
      { name: "Lash Extensions – Classic Full Set", category: "Brows & Lashes", duration_minutes: 120, price_cents: 14500 },
    ],
  },
];
