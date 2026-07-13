# ZIVO Domain Status Matrix

**Date:** 2026-06-08 · **Source:** live Playwright + curl audit · **Scope:** audit only.
Legend: ✅ pass · ❌ fail/wrong · ⚠️ partial/concern · 🔒 needs login · — n/a

## Domain-level summary

| Domain | DNS | HTTP | Redirect | Correct product? | Placeholder/wrong? | Continue w/ Zivosmedia | ZivoChat support | App switcher | Console errors | Priority |
|--------|-----|------|----------|------------------|--------------------|------------------------|------------------|-------------|----------------|----------|
| zivosmedia.com | ✅ | 200 | none | ✅ super-app | ⚠️ `/hotels` wrong | ❌ | ❌ | ❌ | 401 noise, emrld CSP, checkout crash | P0 (hotels), P1 |
| zivobusiness.com | ✅ | 200 | none | ❌ shows super-app | ❌ generic feed | ❌ | ❌ | ❌ | 401 noise | P0/P1 |
| zivodriver.com | ✅ | 200 | none | ❌ shows super-app | ❌ generic feed (PR#2 not live) | ❌ | ❌ | ❌ | 401 noise | **P0 deploy** |
| zivoemployee.com | ✅ | 200 | none | ❌ shows super-app | ❌ generic feed | ❌ | ❌ | ❌ | 401 noise | P0/P1 |
| zivoschat.com | ✅ | 200 | `/`→`/chat` | ✅ ZIVO Chat | ✅ correct | ⚠️ "Use ZIVO Media account" | ✅ | ❌ | missing Supabase env | P1 |
| zivosoftware.com | ✅ | 200 | `/`→`/business` | ✅ Software | ✅ correct | ❌ | ❌ | ❌ | none | P1/P2 |
| zivostravel.com | ✅ | 200 | none | ✅ Travel (all paths) | ✅ correct | ❌ (copy only) | ⚠️ handoff copy | ❌ | none | P1/P2 |
| zivoadmin.com | ❌ **NXDOMAIN** | — | — | ❌ does not load | — | — | — | — | — | **P0** |

## Page-level matrix

### zivosmedia.com
| Path | Status | Desktop shot | Mobile shot | Heading | CTA | Priority |
|------|--------|-------------|------------|---------|-----|----------|
| `/` | ✅ | desktop/zivosmedia_com__root.png | mobile/zivosmedia_com__root.png | Feed | Log in / Sign up | — |
| `/login` | ✅ | desktop/zivosmedia_com__login.png | mobile/zivosmedia_com__login.png | Zivo | Log in | — |
| `/signup` | ✅ | desktop/zivosmedia_com__signup.png | mobile/zivosmedia_com__signup.png | Zivo | Sign up | — |
| `/feed` | ✅ | desktop/zivosmedia_com__feed.png | mobile/zivosmedia_com__feed.png | Feed | Log in / Sign up | — |
| `/business` | ✅ | desktop/zivosmedia_com__business.png | mobile/zivosmedia_com__business.png | Software Business Page | Create Business Software | — |
| `/chat` | 🔒 | desktop/zivosmedia_com__chat.png | mobile/zivosmedia_com__chat.png | Zivo (sign in) | Log in | P2 |
| `/travel` | 🔒 | desktop/zivosmedia_com__travel.png | mobile/zivosmedia_com__travel.png | Zivo (sign in) | Log in | P2 |
| `/flights` | ✅ | desktop/zivosmedia_com__flights.png | mobile/zivosmedia_com__flights.png | Search & Compare Flights | Search | P1 (emrld) |
| `/hotels` | ❌ **wrong** | desktop/zivosmedia_com__hotels.png | mobile/zivosmedia_com__hotels.png | **Rides available in Cambodia** | Switch to Cambodia | **P0** |
| `/cars` | ✅ | desktop/zivosmedia_com__cars.png | mobile/zivosmedia_com__cars.png | Find Your Perfect Ride | Search | P1 (emrld) |
| `/bus` | ✅ | desktop/zivosmedia_com__bus.png | mobile/zivosmedia_com__bus.png | Book a Bus | Search buses | — |
| `/travel/checkout` | ❌ **crash** | desktop/zivosmedia_com__travel-checkout.png | mobile/zivosmedia_com__travel-checkout.png | Checkout Error | Try Again | **P1** |
| `/wallet` | 🔒 | desktop/zivosmedia_com__wallet.png | mobile/zivosmedia_com__wallet.png | Zivo (sign in) | Log in | P2 |
| `/support/new` | ✅ | desktop/zivosmedia_com__support-new.png | mobile/zivosmedia_com__support-new.png | Get help | Submit ticket | — |
| `/legal/privacy` | ✅ | desktop/zivosmedia_com__legal-privacy.png | mobile/zivosmedia_com__legal-privacy.png | Privacy Policy | — | — |
| `/settings` | 🔒 | desktop/zivosmedia_com__settings.png | mobile/zivosmedia_com__settings.png | Zivo (sign in) | Log in | P2 |

### zivodriver.com
| Path | Status | Desktop shot | Mobile shot | Heading | Priority |
|------|--------|-------------|------------|---------|----------|
| `/` | ❌ wrong | desktop/zivodriver_com__root.png | mobile/zivodriver_com__root.png | Feed (super-app) | **P0** |
| `/join` | ❌ wrong | desktop/zivodriver_com__join.png | mobile/zivodriver_com__join.png | Feed (super-app) | **P0** |
| `/signup` | ✅ | desktop/zivodriver_com__signup.png | mobile/zivodriver_com__signup.png | Zivo | — |
| `/login` | ✅ | desktop/zivodriver_com__login.png | mobile/zivodriver_com__login.png | Zivo | — |
| `/support` | 🔒 | desktop/zivodriver_com__support.png | mobile/zivodriver_com__support.png | Zivo (sign in) | P2 |
| `/privacy` | ✅ | desktop/zivodriver_com__privacy.png | mobile/zivodriver_com__privacy.png | Privacy Policy | — |
| `/terms` | ✅ | desktop/zivodriver_com__terms.png | mobile/zivodriver_com__terms.png | Terms of Service | — |

### zivostravel.com
| Path | Status | Desktop shot | Mobile shot | Heading | Priority |
|------|--------|-------------|------------|---------|----------|
| `/` | ✅ | desktop/zivostravel_com__root.png | mobile/zivostravel_com__root.png | Where will you go next? | — |
| `/flights` | ✅ | desktop/zivostravel_com__flights.png | mobile/zivostravel_com__flights.png | Flights PNH→REP | — |
| `/hotels` | ✅ | desktop/zivostravel_com__hotels.png | mobile/zivostravel_com__hotels.png | **Hotels in Siem Reap** | — |
| `/cars` | ✅ | desktop/zivostravel_com__cars.png | mobile/zivostravel_com__cars.png | Rental cars in Siem Reap | — |
| `/bus` | ✅ | desktop/zivostravel_com__bus.png | mobile/zivostravel_com__bus.png | Buses PNH→REP | — |
| `/support` | ✅ | desktop/zivostravel_com__support.png | mobile/zivostravel_com__support.png | Travel support | — |
| `/trips` | ✅ | desktop/zivostravel_com__trips.png | mobile/zivostravel_com__trips.png | My trips | — |

### Single-page domains
| Domain | Path | Status | Desktop shot | Mobile shot | Tablet shot | Heading |
|--------|------|--------|-------------|------------|------------|---------|
| zivobusiness.com | `/` | ❌ wrong | desktop/zivobusiness_com__root.png | mobile/zivobusiness_com__root.png | tablet/zivobusiness_com__root.png | Feed (super-app) |
| zivoemployee.com | `/` | ❌ wrong | desktop/zivoemployee_com__root.png | mobile/zivoemployee_com__root.png | tablet/zivoemployee_com__root.png | Feed (super-app) |
| zivoschat.com | `/` | ✅ | desktop/zivoschat_com__root.png | mobile/zivoschat_com__root.png | tablet/zivoschat_com__root.png | ZIVO Chat (sign in) |
| zivosoftware.com | `/` | ✅ | desktop/zivosoftware_com__root.png | mobile/zivosoftware_com__root.png | tablet/zivosoftware_com__root.png | ZIVO Software for local businesses |
| zivoadmin.com | `/` | ❌ DNS fail | desktop/zivoadmin_com__root.png (blank) | mobile/zivoadmin_com__root.png (blank) | tablet/zivoadmin_com__root.png (blank) | — |
