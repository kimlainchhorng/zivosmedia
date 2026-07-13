# ZIVO Live Audit — Screenshots & Evidence

**Date:** 2026-06-08

## Why there are no PNG screenshots here
The audit ran in an environment with **no headless browser** (only `curl` and a markdown fetcher). Real desktop/mobile screenshots, console-error capture, and rendered-SPA inspection require a browser and could not be produced automatically. This folder instead contains the **raw server HTML** captured for each domain as primary evidence, plus the manual capture guide below.

## Evidence files (raw server responses, real, 2026-06-08)
| File | Domain | Bytes | Note |
| --- | --- | --- | --- |
| `zivosmedia.com.html` | zivosmedia.com | 25139 | Canonical super-app shell |
| `zivobusiness.com.html` | zivobusiness.com | 25139 | **Byte-identical** to zivosmedia |
| `zivodriver.com.html` | zivodriver.com | 25139 | **Byte-identical** to zivosmedia |
| `zivoemployee.com.html` | zivoemployee.com | 25139 | **Byte-identical** to zivosmedia |
| `zivoschat.com.html` | zivoschat.com | 25224 | After 302 → `/chat` |
| `zivosoftware.com.html` | zivosoftware.com | 26143 | After 302 → `/business` |
| `zivostravel.com.html` | zivostravel.com | 1136 | Separate dedicated build |
| _(zivoadmin.com)_ | zivoadmin.com | — | No file: DNS does not resolve |

## Manual screenshot capture guide (to close the gap)
Run on a machine with Chrome. Desktop (1440×900) and mobile (390×844) for each live domain:

```
zivosmedia.com   zivobusiness.com   zivodriver.com   zivoemployee.com
zivoschat.com    zivosoftware.com   zivostravel.com   zivostravel.com/hotels
```
(skip zivoadmin.com — DNS down)

For each: capture full page, open DevTools Console and note errors/warnings, confirm the app switcher renders, confirm "Continue with Zivosmedia" and ZivoChat support entries appear. Save as `<domain>-desktop.png` / `<domain>-mobile.png` in this folder.

Quick automated alternative (if Node available):
```bash
npx playwright install chromium
# then a short script: for each url -> page.setViewportSize(...), page.screenshot({fullPage:true})
```
