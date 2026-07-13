# postMessage credential leak + missing origin checks (cross-repo)

**Date:** 2026-06-15
**Scope:** zivosmedia + zivosoftware (shared autorepair module), zivodriver
**Class:** Sensitive `postMessage` with `targetOrigin: "*"`; message handlers without
`event.origin` validation; one push-payload open-redirect (`navigate(data.url)`).
**Status:** Done. Typechecks green: zivosmedia app+worker, zivosoftware, zivodriver.

## Finding 1 — supplier credentials posted with `targetOrigin: "*"` (real leak risk)

`SupplierBrowserModal.tsx` embeds a parts-supplier portal inside an `<iframe>` whose `src`
is a `blob:` URL (HTML fetched from the app's `supplier-proxy` edge function and rendered
**same-origin**; the sandbox includes `allow-same-origin`). To auto-fill the supplier login
it posted the shop's **saved supplier username + password** to the iframe:

```ts
win.postMessage({ type: "zivo-autofill", username: email, password, autoSubmit: true }, "*");
```

`"*"` means *any* origin currently in that frame receives the password. The iframe has
`allow-forms` + `allow-top-navigation-by-user-activation`, and the sends are delayed
(`setTimeout` 200–400 ms). If the frame navigates to a real cross-origin supplier page (form
submit / script redirect) before the timer fires, `"*"` would deliver the credentials to that
foreign origin.

**Fix:** target the app's own origin. Because the proxy document is a same-origin blob
(`allow-same-origin` ⇒ origin === `window.location.origin`, guaranteed in all major browsers),
`window.location.origin` delivers to the legitimate proxy page identically to `"*"`, but the
browser refuses to deliver if the frame has wandered cross-origin.

```ts
win.postMessage({ ...creds }, window.location.origin);
```
(3 send sites per repo: the `zivo-proxy-ready` auto-send, the save-credentials send, and the
manual "fill" button.)

## Finding 2 — supplier message handler had no `origin` check

The same modal's receive handler acted on `zivo-proxy-ready` (which triggers the credential
send) and `zivo-supplier-navigate` (which re-navigates the proxy iframe) **without checking
`ev.origin`**. Added a same-origin gate at the top:

```ts
if (ev.origin !== window.location.origin) return;
```
Legitimate messages come from the same-origin blob proxy page, so none are dropped; a
cross-origin frame (after a wander) can no longer trigger the credential send or drive
navigation. (`BuildROSectionDialog.tsx`'s `ar_navigate` handler already had this check.)

## Finding 3 — `ar_navigate` sender used `"*"`

`AutoRepairCustomersSection.tsx` (zivosmedia) posted the non-secret `ar_navigate` tab message
to `window.parent` with `"*"`; the sibling senders use `window.location.origin`. Aligned it
for consistency/defense-in-depth (the embed iframe is the app loading itself, same-origin).
zivosoftware's senders were already origin-scoped.

## Finding 4 — push-payload open redirect in zivodriver

`useNativePushRegistration.ts` handles `PUSH_NOTIFICATION_CLICK` service-worker messages and
did `navigate(data.url)` straight from the payload. (Service-worker messages are inherently
same-origin — their `event.origin` is empty — so an origin check would be *wrong* here and
would break the handler.) Instead applied the same backslash-aware internal-path guard used
on the other notification navigation sinks:

```ts
const probe = String(data.url).replace(/\\/g, "/");
if (probe.startsWith("/") && !probe.startsWith("//")) navigate(data.url);
```

## Files changed
- `zivosmedia/src/components/admin/store/autorepair/SupplierBrowserModal.tsx` — 3 sends + receive gate
- `zivosmedia/src/components/admin/store/autorepair/AutoRepairCustomersSection.tsx` — ar_navigate origin
- `zivosoftware/src/components/admin/store/autorepair/SupplierBrowserModal.tsx` — 3 sends + receive gate
- `zivodriver/src/hooks/useNativePushRegistration.ts` — push-url internal-path guard

## Verification
- Confirmed both `SupplierBrowserModal` iframes carry `sandbox="...allow-same-origin..."`, so
  the origin-scoped sends/receives are guaranteed to keep working (DeepSeek second opinion on
  the blob+sandbox origin semantics agreed).
- Grep: no `}, "*")` postMessage sends remain under `src/components/admin/store` in either repo.
- Cross-repo message-handler audit: ZIVO-CHAT / zivostravel / Zivo-Admin have no `window`
  message handlers; zivodriver's only one is the service-worker handler above.
- Typechecks: zivosmedia `type-check` + `type-check:worker` = 0; zivosoftware `typecheck` = 0;
  zivodriver `tsc --noEmit` = 0.

## Notes
- All changes are additive and strict (only ever restrict delivery/acceptance), so no
  legitimate same-origin flow regresses.
- Companion to the open-redirect and print-XSS hardening docs in this folder.
