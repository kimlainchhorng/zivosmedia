# Design QA — authenticated mobile home, ZIVO Bus artwork

## Inputs

- Source reference: `C:\Users\chhor\.codex\codex-remote-attachments\019fb373-9641-7b81-bc37-f5492508a8d8\31071BE5-4369-4DE9-82BD-2CEAE8C1F36E\1-Photo-1.jpg`
- Source dimensions: 591 × 1280 px JPEG. The UI geometry corresponds to an approximately 390 × 844 CSS-pixel phone viewport at 1.515× image density.
- Bus visual source: `C:\Users\chhor\.codex\generated_images\019fb373-9641-7b81-bc37-f5492508a8d8\exec-2f7b4eda-8d3b-4afb-a86b-e3be8bd93167.png`, a 1254 × 1254 px normalized studio extraction of the owner-supplied white ZIVO coach image.
- Implementation: `https://zivosmedia.com/?fresh=bus-ff7f0ef3`
- Implementation screenshot: `C:\Users\chhor\.codex\visualizations\2026\07\30\019fb373-9641-7b81-bc37-f5492508a8d8\home-bus-live-ff7f0ef3.png`
- Implementation viewport: 390 × 844 CSS px at DPR 1.
- Combined full and focused comparison: `C:\Users\chhor\.codex\visualizations\2026\07\30\019fb373-9641-7b81-bc37-f5492508a8d8\home-bus-comparison-ff7f0ef3.png`. It contains, in one image, the normalized home reference, live implementation, coach source, and enlarged live Bus tile crop.
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
4. Imagery and icons: passed. The Bus launcher now uses an optimized 640 × 400 WebP crop of the supplied ZIVO coach, rendered at 52 × 41 CSS px inside the unchanged white service card. The full coach is visible, the white studio background blends cleanly into the tile, and the source remains crisp at its actual mobile size.
5. Interaction and responsive behavior: passed. The Bus launcher remains an 84 × 88 CSS-pixel target and opens `/bus`; existing routes, prefetching, haptics, focus rings, account avatar, notification badges, safe-area behavior, and expanded tap regions remain intact. The live viewport has no horizontal document overflow and a post-reload console check found zero warnings or errors.

## Iteration history

- Iteration 1 (`0a00b7df-8772-4b16-b161-e4a557abd982`): replaced generic pastel service tiles and tinted cards with the supplied white/gradient language. QA found action cards 16–22 px too tall and insufficient breathing room above the fixed navigation.
- Iteration 2 (`8d2f2aeb-b20d-4cd6-891b-5547bbf27756`): aligned Concierge and reduced card padding. QA found Trip Bundle 6 px too tall and Network 10 px too low.
- Iteration 3 (`b4758376-9ddd-4b58-bd0d-3cbb4168f7c8`): finalized the measured card and navigation geometry. Visual comparison and browser console checks passed.
- Bus artwork iteration (`ff7f0ef3-84e5-4558-89a3-1b24112fb9b5`): replaced only the Bus line icon with the owner-supplied ZIVO coach treatment. The combined comparison found no P0/P1/P2 mismatch; live image loading, tap navigation, overflow, and console checks passed.

passed
