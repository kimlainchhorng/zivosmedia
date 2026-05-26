# ZIVO Brand & Design System

## Official Documentation for Developers & Designers

---

## 1. BRAND IDENTITY

### Brand Name
**ZIVO** - A modern global travel comparison platform

### Brand Values
- **Simple** - Clean, uncluttered interfaces
- **Transparent** - Clear pricing, honest comparisons
- **Reliable** - Trusted partners, secure redirects
- **Fast** - Real-time search, instant results

### Tone of Voice
- Professional but approachable
- Confident but not arrogant
- Helpful and informative
- Never salesy or pushy

---

## 2. COLOR SYSTEM

### Primary Brand Color
- **Electric Teal** - The core ZIVO identity
- HSL: `198 93% 59%`
- HEX: `#38BDF8`
- Usage: Logo, primary CTAs, key highlights

### Secondary Brand Color
- **Deep Slate** - Supporting backgrounds
- HSL: `217 32% 17%`
- HEX: `#1E293B`
- Usage: Cards, containers, secondary elements

### Product Accent Colors

#### Flights (Sky Blue)
| Token | HSL | HEX | Usage |
|-------|-----|-----|-------|
| `--flights-primary` | `199 89% 48%` | `#0EA5E9` | Flight CTAs, badges |
| `--flights-light` | `199 95% 73%` | `#7DD3FC` | Highlights, hovers |
| `--flights-dark` | `200 98% 39%` | `#0284C7` | Pressed states |
| `--flights-muted` | `199 89% 48% / 0.1` | — | Backgrounds |

#### Hotels (Warm Amber)
| Token | HSL | HEX | Usage |
|-------|-----|-----|-------|
| `--hotels-primary` | `38 92% 50%` | `#F59E0B` | Hotel CTAs, badges |
| `--hotels-light` | `45 93% 58%` | `#FBBF24` | Highlights, hovers |
| `--hotels-dark` | `32 95% 44%` | `#D97706` | Pressed states |
| `--hotels-muted` | `38 92% 50% / 0.1` | — | Backgrounds |

#### Car Rental (Purple Indigo)
| Token | HSL | HEX | Usage |
|-------|-----|-----|-------|
| `--cars-primary` | `263 70% 58%` | `#8B5CF6` | Car CTAs, badges |
| `--cars-light` | `270 95% 75%` | `#C084FC` | Highlights, hovers |
| `--cars-dark` | `256 77% 51%` | `#7C3AED` | Pressed states |
| `--cars-muted` | `263 70% 58% / 0.1` | — | Backgrounds |

### Neutral Colors
| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | `222 47% 11%` | Page background |
| `--foreground` | `210 40% 98%` | Primary text |
| `--muted` | `215 16% 46%` | Secondary text |
| `--muted-foreground` | `210 40% 98%` | Muted text |
| `--border` | `215 19% 34%` | Dividers, borders |
| `--card` | `217 32% 17%` | Card backgrounds |

### Semantic Colors
| Token | HSL | Usage |
|-------|-----|-------|
| `--success` | `142 72% 45%` | Confirmations |
| `--warning` | `38 92% 50%` | Alerts |
| `--destructive` | `0 84% 60%` | Errors, delete |

### ⚠️ COLOR RULES
1. **NEVER** use raw color values in components
2. **ALWAYS** use CSS variables via Tailwind classes
3. Keep product colors consistent across all pages
4. Maintain sufficient contrast ratios (4.5:1 minimum)

---

## 3. TYPOGRAPHY

### Font Families
```css
--font-display: 'Outfit', system-ui, sans-serif; /* Headings */
--font-sans: 'Inter', system-ui, sans-serif;     /* Body */
--font-mono: 'Space Mono', monospace;            /* Code/Data */
```

### Type Scale
| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | `text-4xl / text-5xl` | 700-800 | 1.1 |
| H2 | `text-2xl / text-3xl` | 700 | 1.2 |
| H3 | `text-xl` | 600 | 1.3 |
| Body | `text-base` | 400 | 1.5 |
| Small | `text-sm` | 400-500 | 1.4 |
| Caption | `text-xs` | 400 | 1.4 |

### Button Typography
- **Primary CTA**: `font-semibold text-base`
- **Secondary CTA**: `font-medium text-sm`
- **Text links**: `font-medium underline-offset-4`

### ⚠️ TYPOGRAPHY RULES
1. Use `font-display` for all headings
2. Use `font-sans` for body text
3. Maintain consistent line-heights
4. Keep headings bold (600-800)

---

## 4. ICONOGRAPHY

### Icon Style
- **Library**: Lucide React (exclusively)
- **Style**: Rounded, outlined, modern
- **Stroke width**: 1.5-2px (default)
- **Size scale**: 16px, 20px, 24px, 32px

### Product Icons
| Product | Primary Icon | Secondary Icons |
|---------|--------------|-----------------|
| Flights | `Plane` | `Globe, Clock, Shield, Luggage` |
| Hotels | `Hotel` / `Building2` | `Bed, Star, MapPin, Wifi` |
| Cars | `Car` | `Key, Fuel, Users, Briefcase` |

### Trust & Feature Icons
| Concept | Icon |
|---------|------|
| Security | `Shield`, `Lock` |
| Support | `Headphones`, `MessageCircle` |
| Speed | `Zap`, `Clock` |
| Compare | `Search`, `ArrowLeftRight` |
| Price | `CreditCard`, `BadgeDollarSign` |
| Rating | `Star`, `ThumbsUp` |

### ⚠️ ICON RULES
1. **ONLY** use Lucide React icons
2. Never mix icon libraries
3. Keep icon sizes consistent
4. Use semantic colors for icons

---

## 5. COMPONENT LIBRARY

### Search Forms
- Use `ProfessionalSearchCard` wrapper
- Consistent field heights: `h-11`
- Product-colored accent bars
- Include redirect notice

### Result Cards
- Use product-specific cards:
  - `FlightResultCardPro`
  - `HotelResultCardPro`
  - `CarResultCardPro`
- Clear price display with "From" prefix
- Prominent CTA buttons

### CTA Buttons
```tsx
// Flights
<Button className="bg-gradient-to-r from-sky-500 to-blue-600">
  Search Flights / View Deal / Book Flight
</Button>

// Hotels
<Button className="bg-gradient-to-r from-amber-500 to-orange-600">
  Search Hotels / View Hotel / Book Hotel
</Button>

// Cars
<Button className="bg-gradient-to-r from-violet-500 to-purple-600">
  Search Cars / Rent a Car
</Button>
```

### Badges
| Type | Colors | Usage |
|------|--------|-------|
| Hot | `bg-red-500` | Trending items |
| New | `bg-emerald-500` | New features |
| Save | `bg-amber-500` | Discounts |
| Popular | `bg-sky-500` | Top picks |

### Trust Blocks
- Use `WhyBookSection` component
- Include `TrustSignals` component
- Always show affiliate disclaimer

---

## 6. BUTTON & CTA RULES

### Primary CTA Sizes
- Mobile: `h-12 px-6 text-base`
- Desktop: `h-11 px-8 text-base`

### Button Text Standards
| Product | Search | Select | Book |
|---------|--------|--------|------|
| Flights | "Search Flights" | "View Deal" | "Book Flight" |
| Hotels | "Search Hotels" | "View Hotel" | "Book Hotel" |
| Cars | "Search Cars" | "View Details" | "Rent a Car" |

### ⚠️ CTA RULES
1. CTAs must be large and touch-friendly (min 44px)
2. Use product gradients for primary CTAs
3. Include external link icon on booking CTAs
4. Show redirect notice near all booking CTAs

---

## 7. SPACING SYSTEM

### Base Unit: 4px (0.25rem)

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Inline elements |
| `gap-2` | 8px | Related items |
| `gap-3` | 12px | List items |
| `gap-4` | 16px | Card content |
| `gap-6` | 24px | Section elements |
| `gap-8` | 32px | Major sections |

### Container Padding
- Mobile: `px-4`
- Desktop: `container mx-auto px-4`

---

## 8. IMAGERY & ILLUSTRATIONS

### Style Guide
- **Tone**: Premium, travel-focused, aspirational
- **Colors**: Complementary to product accents
- **Quality**: High-resolution, modern
- **Format**: WebP preferred, with fallbacks

### Usage Rules
1. Use emoji placeholders for destinations (🗼🗽🏯)
2. Maintain consistent aspect ratios
3. Include proper alt text
4. Lazy-load non-critical images

---

## 9. ANIMATION SYSTEM

### Timing
- **Fast**: 200ms (hovers, micro-interactions)
- **Normal**: 300ms (transitions, toggles)
- **Slow**: 500ms+ (complex animations)

### Easing
- **Standard**: `ease-out` (most interactions)
- **Entrance**: `ease-in-out` (appear animations)
- **Spring**: Use Framer Motion for physics-based

### Available Animations
- `animate-float` - Gentle floating
- `animate-pulse-glow` - Glowing pulse
- `animate-slide-up` - Entrance from below
- `animate-fade-in` - Simple fade
- `animate-shimmer` - Loading shimmer

---

## 10. WHAT MUST NEVER CHANGE

### ⛔ LOCKED PATTERNS (DO NOT MODIFY)

1. **Affiliate Flow**
   - All booking CTAs open external partner sites
   - No internal checkout or payment processing
   - Always include SubID tracking

2. **CTA Behavior**
   - "View Deal", "Book" buttons → External redirect
   - Always use `target="_blank"` and `noopener,noreferrer`

3. **Disclaimers**
   - Price disclaimer always visible
   - Affiliate disclosure on all pages
   - Redirect notice near CTAs

4. **No Guarantees**
   - Never claim "Best Price Guarantee"
   - Never claim "Lowest Price"
   - Use "Search & Compare" language only

5. **Price Display**
   - Always prefix with "From"
   - Always suffix with "*"
   - Include "prices may change" notice

---

## 11. ADDING NEW PAGES

When creating new pages, follow this checklist:

### Required Elements
- [ ] SEOHead component with meta tags
- [ ] Header and Footer components
- [ ] ProfessionalHero or similar hero section
- [ ] WhyBookSection for trust
- [ ] TravelFAQ with schema
- [ ] AffiliateRedirectNotice
- [ ] Mobile-responsive layout

### Required Styling
- [ ] Use product accent colors
- [ ] Use design tokens, not raw colors
- [ ] Follow typography scale
- [ ] Use Lucide icons only
- [ ] Include proper animations

### Required Compliance
- [ ] Affiliate disclosure visible
- [ ] Price disclaimer present
- [ ] External redirect notices
- [ ] No guarantee claims

---

## 12. QUICK REFERENCE

### Tailwind Classes by Product

```tsx
// FLIGHTS
className="text-sky-500"              // Text
className="bg-sky-500/10"             // Light bg
className="border-sky-500/30"         // Border
className="from-sky-500 to-blue-600"  // Gradient
className="shadow-sky-500/25"         // Glow

// HOTELS
className="text-amber-500"              // Text
className="bg-amber-500/10"             // Light bg
className="border-amber-500/30"         // Border
className="from-amber-500 to-orange-600" // Gradient
className="shadow-amber-500/25"          // Glow

// CARS
className="text-violet-500"              // Text
className="bg-violet-500/10"             // Light bg
className="border-violet-500/30"         // Border
className="from-violet-500 to-purple-600" // Gradient
className="shadow-violet-500/25"          // Glow
```

---

**Last Updated**: January 2026
**Maintained by**: ZIVO Design Team
