# ZIVO identity coupling — do not migrate

**Ruling (owner, 9 September 2026): do not change the identity model.** ZIVO runs
separate auth backends per app. This file records what is actually coupled, so
that a future change is made with the map in hand. It is a *record*, not a plan.

`IDENTITY_PLAN.md` is a different document: it proposes federating on Media as
the identity provider. That proposal is **not approved and not in progress.**
Nothing in this file should be read as a step toward it.

## What this repo actually reaches

Read from source (`src/config/*Domain.ts`, `src/integrations/supabase/client.ts`)
and confirmed against the built bundle in `dist/assets`, not from prose.

| Project ref | App | In this repo's source | In the shipped bundle |
| --- | --- | --- | --- |
| `slirphzzwcogdbkeicff` | Media (this app) | yes | **yes — 7 chunks** |
| `ydxztoresbdeoeijhxww` | zivosoftware | yes | **yes — 1 chunk** |
| `yiedlgoxwjmansszdypf` | Ride + Driver | yes (constant only) | no — 0 chunks |
| `xbllvmpomorawkcrtbcq` | Travel | yes (constant only) | no — 0 chunks |
| `gzyktwcanrrkosieecxs` | Business | yes — diagnostics observer only | no — tree-shaken |
| `wtdlbzgryuelpylijnkd` | Employees | **no** — absent entirely | no |

Three corrections to the working description of the topology:

1. **zivosoftware (`ydxztoresbdeoeijhxww`) is a sixth backend and it ships.** It is
   the only project besides Media present in the built bundle. Any statement of
   "five backends" that omits it is describing something other than this build.
2. **Travel (`xbllvmpomorawkcrtbcq`) exists** as a distinct project in
   `src/config/zivoTravelDomain.ts`.
3. **Business appears in exactly one file; Employees in none.**
   `src/config/identityTopology.ts` names the Business project, and
   `AuthContext` calls its `observeIdentitySession` on every session change.
   It returns immediately unless `VITE_IDENTITY_DIAGNOSTICS_ENABLED === "true"`,
   which is why the ref is tree-shaken out of the bundle. It decodes the access
   token to compare an issuer string and emits a DOM event; it authorizes
   nothing. The Employees project `wtdlbzgryuelpylijnkd` is absent from source
   entirely, and `/api/admin/login` has no reference here — both are unverified
   from this repo.

Travel and Driver are gated on env vars that are currently empty, so those
branches are dead code in the current build. They are still live *source* paths:
setting the env vars turns them on with no other change.

## The coupling that matters: auth and data can address different projects

`client.ts` exports two clients and then splices them:

- `authSupabase` — sessions. Follows `EFFECTIVE_AUTH_SUPABASE_URL`.
- `dataSupabase` — `.from`, `.functions`, `.storage`, `.channel`. Follows
  `EFFECTIVE_DATA_SUPABASE_URL`.
- `supabase` is `dataSupabase` with `auth` overwritten by `authSupabase.auth`.
- `dataSupabase` carries an `accessToken` callback that hands it
  **`authSupabase`'s** access token.

The two URLs are chosen by *different* conditions, and this is the trap:

```
DATA  switches project for  software | travel | driver
AUTH  switches project for  software                     <- travel and driver missing
```

`useDedicatedSoftwareAuth` moves auth to the software project so that, in the
code's own words, "owner checks compare user IDs from the same Supabase project
as the workspace data." **Travel and Driver never got the equivalent.** If
`VITE_ZIVO_DRIVER_SUPABASE_URL` and its key are set, `dataSupabase` addresses the
Driver project while `authSupabase` still addresses Media — and the `accessToken`
callback then presents a Media-signed JWT to the Driver project. A JWT is only
verifiable by the project that signed it, so `auth.uid()` would be null there and
every RLS-protected read would come back empty rather than erroring loudly.

This is **latent, not live**: both env vars are empty today, so the branch is
unreachable in the current build. It is written down because the failure mode is
silent, and because turning driver on looks like a one-line env change.

On `zivosmedia.com` itself all three host predicates are false, so auth and data
are both `slirphzzwcogdbkeicff` and the `accessToken` callback forwards a
same-project token. Media is single-project.

## Open: an unreviewed identity change is sitting in the working tree

As of 9 September 2026 this checkout has **111 modified and 175 untracked files**
that are not on any commit. One of them changes the identity model. In
`src/contexts/AuthContext.tsx`, the block that rejected driver accounts at
passenger login has been deleted:

```
-  if (isDriver) { await supabase.auth.signOut(); return { error: new Error("DRIVER_ACCOUNT") }; }
+  // Media is the shared account hub. Driver membership in another app is
+  // not a reason to reject a valid hub login; ...
```

The reasoning in the replacement comment is defensible — cross-app role checks
at login are exactly the coupling this file argues against — but it is a change
to who can sign in, it is uncommitted, unreviewed, and it contradicts the
standing "do not change the identity model" ruling. It has not been reverted
here because it is not this session's change to revert.

**Do not deploy from this working tree.** A build from the current directory
ships all 111 files, not the eight reviewed commits on
`fix/realtime-and-shared-language`.

## If you are about to change this

- Do not share JWT signing secrets between projects to make a cross-project token
  verify. That converts a silent empty read into a silent trust boundary failure.
- Do not consolidate on the strength of the FK counts in `IDENTITY_PLAN.md`
  (450 Media / 27 Ride+Driver / 124 Business). Those are direct `auth.users`
  foreign-key columns only — not UUID references without FKs, RLS expressions,
  storage paths, or provider metadata.
- If Travel or Driver is switched on, fix the auth/data asymmetry in the same
  change, or the app will read empty instead of failing.

## Guard

`src/test/identityTopology.test.ts` pins the table above against source. It fails
if a project ref is added, removed or renamed, or if the auth/data asymmetry is
altered — so a change to the identity model has to be deliberate.
