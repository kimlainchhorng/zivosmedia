# 🌐 WEBSITE CONTENT — hizivo.com (ZIVO)

**Edit only the text inside the boxes. These are the strings the marketing site & SEO use.**

When you change a value here, update the matching file:
- SEO title / description / keywords → `index.html` (lines 96–100)
- Open Graph titles → `index.html` (lines 369–372)
- Landing-page hero & features → `src/pages/` (e.g. About.tsx, BrandMission.tsx)

---

## 1. Browser Tab Title  (max 60 characters — for SEO)

```
ZIVO – Free Super-App: Travel, Social, Shop, Jobs & Creators
```

## 2. Meta Description  (max 160 characters — for Google snippet)

```
All-in-one free app: book flights, hotels & cars, order rides & food, share reels, follow creators, open a shop, post or apply for jobs, chat & call. Join free.
```

## 3. Meta Keywords  (comma-separated)

```
ZIVO, hizivo, ZIVO LLC, super app, social network, short video, reels, creator platform, fan subscriptions, online shop, POS, business tools, jobs, hiring, find employees, apply for jobs, flights, hotels, car rentals, ride share, food delivery, chat, video call
```

## 4. Homepage Hero — Headline  (max 70 characters)

```
One free app for travel, social, shop, jobs, chat & creators.
```

## 5. Homepage Hero — Subheadline  (max 160 characters)

```
Book flights, hotels & cars. Share reels. Open a shop. Post jobs. Chat & call — all on ZIVO. Free to join, free to use.
```

## 6. Primary CTA Button

```
Get the App
```

## 7. Secondary CTA Button

```
Open Web App
```

## 8. Feature Grid (6 cards — title + 1-line description each)

```
1. Travel        → Compare flights, hotels & car rentals from 500+ partners.
2. Social        → Share reels, follow creators, subscribe to your favorites.
3. Shop          → Open an online shop in minutes — no monthly fees.
4. Jobs          → Find work or hire talent. Unlimited posts.
5. Chat & Call   → Free HD voice and video calls, channels, audio spaces.
6. AI Planner    → Build a full trip itinerary in seconds.
```

## 9. FAQ (matches schema.org/FAQPage in index.html)

```
Q1: What is ZIVO?
A1: ZIVO is an all-in-one super-app combining travel booking (flights, hotels, car rentals), rides and food delivery, social feed and reels, creator subscriptions and live streaming, online shop and POS, jobs and hiring, and chat with voice and video calls.

Q2: Is ZIVO free to use?
A2: Yes. Creating a ZIVO account and using core features is free. ZIVO does not charge booking fees on travel searches; some premium features and creator subscriptions may have a price.

Q3: Can businesses sell or hire on ZIVO?
A3: Yes. Businesses can open an online shop, manage orders with a built-in POS, post jobs, and receive applications — all from one ZIVO account.

Q4: Where can I download the ZIVO app?
A4: ZIVO is available on iOS and Android, and works as a fast web app at hizivo.com.
```

## 10. Footer / Contact Block

```
Company:    ZIVO LLC
Support:    support@hizivo.com
Press:      info@hizivo.com
Twitter/X:  @ZivoApp
App Store:  https://apps.apple.com/app/id6759480121
Play Store: https://play.google.com/store/apps/details?id=com.myzivo.app
```

## 11. Languages Supported (display order on site)

```
English (default)
Khmer (km)
Arabic (ar)
French (fr)
```

## 12. Social Share Image  (Open Graph + Twitter Card)

```
Path:  /public/og-image.png
Size:  1200 × 630 PNG
Alt:   ZIVO – Compare Flights, Hotels & Car Rentals
```

---

### How to publish
1. Edit fields above
2. Mirror copy into `index.html` (SEO tags) and relevant pages in `src/pages/`
3. `bun run build`
4. Push to main → hosting (Lovable / Vercel / Netlify) deploys automatically
5. Verify live at https://hizivo.com and re-share to refresh OG cache (use https://www.opengraph.xyz)
