# Supabase Migration Reconciliation — OWNER RUNBOOK (slirphzzwcogdbkeicff)

Owner-facing, executable plan to reconcile this repo's `supabase/migrations` against the
live migration bookkeeping of the MAIN project (`slirphzzwcogdbkeicff`). Companion to the
generated artifacts (`supabase-migration-drift-report.md`, `…reconciliation-plan.md`,
`…repair-draft.sql`, `…candidates.csv`, `…unmatched-*.csv`), which were refreshed by
`npm run supabase:migrations:report` on 2026-09-03.

> **OPERATIONAL RISK — read before Phase 1.** The repair phase (Phases 1–2) changes
> **bookkeeping only** — rows in `supabase_migrations.schema_migrations` — and **nothing
> in this plan mutates data**: no table, row, function, policy, or schema object is
> created, altered, or dropped by any step. It **MUST be executed by the owner**, on a
> machine with `SUPABASE_ACCESS_TOKEN` configured (the linked CLI commands require it),
> and the **546 unmatched local migrations must go through the Phase 3 decision tree
> one file at a time** — they must never be bulk-applied. `supabase db push` and
> `db pull` remain forbidden on this project for exactly this reason.

**Nothing in this runbook has been executed.** Every write is owner-run. The scan and the
verification queries below are read-only.

---

## 1. Verified state (re-confirmed live 2026-09-03)

| Fact | Value | How verified |
|---|---|---|
| Remote bookkeeping rows | **1625** (all distinct versions), range `20260126182059` → `20260903182301` | `select count(*), min(version), max(version) from supabase_migrations.schema_migrations` |
| Local migration files | **1176**, range `20260126182101` → `20260831041439`, 6 allowed legacy duplicate versions | drift report |
| Exact version matches | **13** | drift report |
| One-to-one timestamp-drift candidates | **617** (584 high ≤5s, 33 medium ≤60s) | candidates CSV |
| Unmatched local | **546** (465 = security/auth) | unmatched-local CSV |
| Unmatched remote | **995** inside local range + **1** after it (`20260903182301` = `noop_context_reset`, literally `select 1;`) | unmatched-remote CSV + live query |
| Pending local work (newer than remote, creates objects) | **0** | drift report risk scan |

### Spot-check evidence (high-confidence map is real)

Three pairs verified — remote `statements[1]` is byte-identical to the local file head:

| Remote version | Local file | Content |
|---|---|---|
| `20260126184429` | `20260126184430_15d3dc46….sql` | driver-documents storage RLS policies |
| `20260126185226` | `20260126185227_cda82eb4….sql` | `saved_locations` table |
| `20260126195811` | `20260126195812_4c0fbc98….sql` | admin role insert (same user id) |

### What the drift IS (interpretation)

The live history was **applied by hand in finer increments** — several remote rows per
local file, timestamps seconds apart, empty `name` fields — while the repo later acquired
**re-timestamped (mostly +1s) and consolidated copies** with UUID filenames. The local repo
is a mirror of a hand-applied history, **not a divergent schema plan**: zero pending local
table-creating work, and every probed pair has identical SQL. This is the same disease the
Driver project's ~302 invisible hand-applied migrations were diagnosed with (Zivo-Admin
`docs/usa-launch-readiness.md` step 0a) — here it is larger but benign, because the live
DB already contains the effects.

---

## 2. Non-negotiable guardrails (read first)

1. **Never run `supabase db push` on this project.** The CLI considers ~1163 local files
   "pending" and would apply them blindly — that is the one move that can wreck the live
   schema. This runbook aligns *bookkeeping*, it does not apply schema.
2. **Never run `db pull` into `supabase/migrations/`** — it would dump 1600+ remote rows as
   files and bury the repo.
3. **Never `DELETE` from `supabase_migrations.schema_migrations`.** Remote-only rows are
   real applied history. Repairs below are **renames and inserts only**.
4. Run every write step inside the transaction blocks already present in the repair draft,
   and only after the Phase 0 backup.
5. Re-run `npm run supabase:migrations:report` after each phase; stop and re-read if the
   numbers do not move exactly as predicted.

---

## 3. Phase 0 — Backup (required, owner-run)

Bookkeeping-only backup + counts, via SQL editor or `supabase db query --linked`:

```sql
create table supabase_migrations.schema_migrations_backup_20260903 as
  select * from supabase_migrations.schema_migrations;

select count(*) as before_total,
       count(*) filter (where version in (
         select local_version from (
           values -- paste the 584 local_version values from candidates.csv, confidence=high
         ) as v(local_version)
       )) as will_rename_check;
```

(If the backup table already exists from a prior attempt, drop it first or use today's date.)

---

## 4. Phase 1 — Apply the 584 high-confidence repairs (bookkeeping renames)

Each repair renames a remote version to the local version **only when no row already has
the local version** (guarded `UPDATE`s, already drafted in
`docs/supabase-migration-reconciliation-repair-draft.sql`, all commented).

**Per-batch protocol (batches of ~50–100 pairs):**

1. **Verify before trusting** — for each pair in the batch, confirm SQL equivalence with
   this read-only probe (substitute both versions):

   ```sql
   select version, array_length(statements,1) as stmts,
          substring(statements[1] from 1 for 400) as head
   from supabase_migrations.schema_migrations
   where version = '<remote_version>';
   ```

   then compare against `head -<same lines> supabase/migrations/<local_file>`.
   Spot-rate observed so far: 3/3 exact. If a pair does NOT match, drop it from the batch
   and move it to the Phase 2 list.

2. **Uncomment that batch's blocks** in the repair draft (keep the `begin;`/`commit;`).

3. **Execute**, then assert the batch landed:

   ```sql
   select count(*) as renamed_so_far from supabase_migrations.schema_migrations
   where version in ( /* paste the batch's local versions */ );
   ```

   Expected: equal to the batch size.

4. **Re-run** `npm run supabase:migrations:report` — "Exact version matches" must rise by
   exactly the batch size; "Unmatched remote versions" must fall by the same amount.

End state after all 584: exact matches ≈ **597** (13 + 584), unmatched remote ≈ **411**.

---

## 5. Phase 2 — Medium-confidence pairs (33)

Same protocol as Phase 1 but **verify every pair before repair** (nearby timestamp does not
prove equivalence). Any pair whose SQL differs: leave BOTH rows untouched, add it to the
unmatched lists' narrative, and treat the local file via the Phase 3 decision tree.

---

## 6. Phase 3 — 546 unmatched local migrations (decision tree)

These are consolidations/renames with no 1:1 remote twin. Process in domain batches
(security/auth first — 465 files), one file at a time:

```
For local file F:
  a. Identify F's principal object(s) (table / function / policy names in its SQL).
  b. Probe live existence (read-only), e.g.:
       to_regclass('public.<table>')                                                -- tables
       select 1 from pg_proc where proname = '<function>' and pronamespace = 'public'::regnamespace limit 1;   -- functions
       select 1 from pg_policies where policyname = '<policy>' limit 1;             -- policies
  c. Decide:
     - Object(s) EXIST and match F's intent  → record-only:
         supabase migration repair --status applied <local_version>   (repeat per version)
       (This inserts the bookkeeping row with the repo's filename; it applies no SQL.)
     - Object(s) MISSING and F is still wanted → apply deliberately by hand (SQL editor,
       one file at a time, after reading it), THEN `supabase migration repair --status applied`.
       Note: the drift scan found 0 create-table-missing cases, so this should be rare
       (mostly policy/function refinements if any).
     - F is obsolete (superseded by a later migration) → move to `supabase/migrations-archived/`
       (keep git history; do not delete) and record nothing.
  d. Log the decision (file → outcome) in this runbook's appendix table.
```

Practical tip: `supabase migration repair` requires the linked CLI
(`SUPABASE_ACCESS_TOKEN` is configured per the drift report; `npm run supabase:migrations:report`
already proves linked access). Batch the repair calls in a shell loop over a reviewed list file.

---

## 7. Phase 4 — 995 unmatched remote versions: NO ACTION

They are the finer-grained hand-applied increments already reflected in the live schema —
including the trailing `noop_context_reset` (`select 1;`). Deleting them would erase real
history; re-creating them locally would bury the repo. The accepted end state is:
**remote history stays a superset of the repo's files**, documented by this runbook. After
Phases 1–2 the unmatched-remote count drops to ~411 (the genuinely hand-incremented rows).

---

## 8. Phase 5 — Final validation

```bash
npm run supabase:migrations:report      # expect: exact matches ≈ 597–630+, pending local = 0
npm run supabase:migrations:check:main  # strict, non-linked — must stay green
supabase migration list --linked        # expect: no "not applied" local rows after Phase 3
```

Then re-run the repo's normal gates (`npm run update`). Do **not** run
`supabase:migrations:linked:strict` until Phase 3 completes — it treats unmatched local
files as failures by design.

---

## 9. Rollback

If a repair batch is wrong: `delete from supabase_migrations.schema_migrations where version = '<local_version>';` for the affected rows only, or restore the whole bookkeeping table from
the Phase 0 backup (`insert into supabase_migrations.schema_migrations select * from
supabase_migrations.schema_migrations_backup_20260903 where version not in (select version
from supabase_migrations.schema_migrations);`). All repairs are reversible because they
never touch user data or schema objects.
