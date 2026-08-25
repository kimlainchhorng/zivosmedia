# Design QA — authenticated mobile home

## Inputs

- Source reference: `C:\Users\chhor\.codex\codex-remote-attachments\019fb373-9641-7b81-bc37-f5492508a8d8\31071BE5-4369-4DE9-82BD-2CEAE8C1F36E\1-Photo-1.jpg`
- Source dimensions: 591 × 1280 px JPEG. The UI geometry corresponds to an approximately 390 × 844 CSS-pixel phone viewport at 1.515× image density.
- Implementation: `https://zivosmedia.com/?fresh=home-reference-b4758376`
- Implementation screenshot: `C:\Users\chhor\.codex\visualizations\2026\07\30\019fb373-9641-7b81-bc37-f5492508a8d8\home-reference-implementation-final.png`
- Implementation viewport: 390 × 844 CSS px at DPR 1. The screenshot was normalized to 591 × 1280 px only for the comparison board.
- Full comparison, source left and implementation right: `C:\Users\chhor\.codex\visualizations\2026\07\30\019fb373-9641-7b81-bc37-f5492508a8d8\home-reference-comparison-full.png`
- Focused comparison, source left and implementation right: `C:\Users\chhor\.codex\visualizations\2026\07\30\019fb373-9641-7b81-bc37-f5492508a8d8\home-reference-comparison-focused.png`
- State: authenticated English home, live production data, user-specific avatar/name, optional data widgets absent, first viewport before scrolling.

## Comparison findings

- P0: none.
- P1: none.
- P2: none.
- P3: the reference shows six bottom destinations, including Chat. The production super-app intentionally keeps five stable destinations because Chat now opens in the dedicated ZIVO Chat app; reintroducing a local Chat tab would create a redirect-only tab with no stable active state.
- Platform note: the source includes iOS status-bar chrome. The browser implementation intentionally begins below browser/device chrome instead of drawing a fake status bar.

## Fidelity surfaces

1. Geometry and spacing: passed. At the 390 × 844 reference viewport, Concierge is 384–471 px, Trip Bundle is 487–568 px, Network is 580–649 px, and the bottom navigation is 750–820 px. These align to the measured source geometry within 0–2 px for the primary card surfaces.
2. Typography: passed. The existing Inter-based system is retained, with reference-sized greeting, service labels, compact uppercase eyebrows, chip labels, and network copy.
3. Color and surface treatment: passed. The canvas and cards are white, dividers are hairline neutral borders, and the orange-to-magenta brand gradient is limited to the supplied accent locations.
4. Imagery and icons: passed. Existing transparent ZIVO artwork is used for Ride, Eats, Flights, Hotels, Rental Cars, and Shopping; Bus and Delivery retain the simple black line treatment shown in the reference.
5. Interaction and responsive behavior: passed. Existing routes, prefetching, haptics, focus rings, account avatar, notification badges, safe-area behavior, and expanded tap regions remain intact. The live viewport has no horizontal document overflow.

## Iteration history

- Iteration 1 (`0a00b7df-8772-4b16-b161-e4a557abd982`): replaced generic pastel service tiles and tinted cards with the supplied white/gradient language. QA found action cards 16–22 px too tall and insufficient breathing room above the fixed navigation.
- Iteration 2 (`8d2f2aeb-b20d-4cd6-891b-5547bbf27756`): aligned Concierge and reduced card padding. QA found Trip Bundle 6 px too tall and Network 10 px too low.
- Iteration 3 (`b4758376-9ddd-4b58-bd0d-3cbb4168f7c8`): finalized the measured card and navigation geometry. Visual comparison and browser console checks passed.

passed
