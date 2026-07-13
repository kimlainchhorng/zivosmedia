# ZIVO Security Watchdog

A **read-only**, 24/7 defensive guard. It watches the repo (and optionally the
live Supabase backend) for attacks and new vulnerabilities, asks **DeepSeek** and
**Xiaomi MiMo** to judge the evidence, and writes reports + alerts.

It **never** edits code, touches the database, commits, or deploys. Every fix is
proposed only — a human (or Claude/Codex) applies it. This is the "detect + alert"
posture; it cannot break production on its own.

## Run it

```bash
npm run security:watch          # one cycle now
npm run security:watch:force    # one cycle, force the AI pass even if nothing changed
npm run security:watch:quick    # skip npm audit (faster)
npm run security:watch:loop     # loop forever in this terminal (stops when closed)
```

For real 24/7 (survives reboots, runs when no terminal is open) use the Windows
Scheduled Task — see **Scheduling** below.

## What each cycle checks (all read-only)

- **npm audit** — vulnerable dependencies.
- **Repo secret scan** + **Supabase token-fragment scan** (the repo's own gates).
- **Static attack-surface scan** — `service_role` in client code, Stripe *secret*
  keys, private keys/AWS keys, `eval`/`new Function`, RLS disabled or `GRANT … TO
  anon` in migrations, wide-open CORS, plain `http://`, `dangerouslySetInnerHTML`,
  `target=_blank` without `rel=noopener`.
- **Git surface** — uncommitted changes and recent commits touching
  auth/RLS/Stripe/CSP/worker.
- **Live backend (optional)** — Supabase security advisors + auth-log
  attack-signature scan (a burst of 4xx from one IP = likely brute force). Only
  runs if `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` are set; skipped
  otherwise.

Secrets are **redacted before anything leaves the machine** — the AI models only
ever see masked placeholders.

To save cost, if the signal set is unchanged since the last cycle and there is no
live-attack indicator, the AI pass is skipped (a cheap heartbeat is still
recorded). `--force` overrides this.

## Outputs

| File | Meaning |
|------|---------|
| `LATEST.md` | Newest report (human-readable). |
| `reports/<stamp>.md` | Every cycle's full report + raw model output. |
| `history.jsonl` | One line per cycle (severity, attack flag, counts). |
| `ALERT-<stamp>.md` | Written only when severity ≥ HIGH or an active attack is detected. |

Set `WATCHDOG_WEBHOOK_URL` (Slack/Discord/generic) to also POST a one-line alert
on every HIGH+/attack cycle.

## Scheduling (true 24/7 on Windows)

A wrapper at `scripts/security/run-watchdog.cmd` runs one cycle and logs to
`docs/security-watch/cron.log`. Register it as a Scheduled Task that repeats every
45 minutes (current user, no admin needed):

```powershell
$repo    = "C:\Users\chhor\OneDrive\Documents\zivosmedia"
$action  = New-ScheduledTaskAction -Execute "$repo\scripts\security\run-watchdog.cmd"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
             -RepetitionInterval (New-TimeSpan -Minutes 45) `
             -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
             -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew `
             -ExecutionTimeLimit (New-TimeSpan -Minutes 20)
Register-ScheduledTask -TaskName "ZivoSecurityWatchdog" -Action $action -Trigger $trigger `
  -Settings $settings -Description "ZIVO read-only security watchdog" -Force
```

Change cadence with `-RepetitionInterval`. Inspect / run-now / remove:

```powershell
Get-ScheduledTaskInfo -TaskName "ZivoSecurityWatchdog"      # last/next run, result
Start-ScheduledTask   -TaskName "ZivoSecurityWatchdog"      # run one cycle now
Unregister-ScheduledTask -TaskName "ZivoSecurityWatchdog" -Confirm:$false   # remove
```

> Runs while the user is logged on (no stored credentials). It survives reboots
> and closed terminals. To also run when logged off, re-register with `-User` /
> `-Password`.

## Known limitations

- **Migration-file grant scanning is not authoritative.** The static `grant_anon_*`
  rules read append-only migration *files*, which cannot show net state — a later
  migration may `REVOKE` a grant seen in an earlier one. (Verified 2026-06-15: the
  anon write grants it flagged were already revoked live by 2026-06-01 server-gate
  migrations; `information_schema.role_table_grants` showed anon had **zero** grants
  on those tables.) Treat these as "verify against live grants" notes. Setting
  `SUPABASE_ACCESS_TOKEN` makes the live Supabase advisor the authority.
- **Static rules favor low false-positives** but can still flag intentional public
  surface — always confirm against the live backend before acting.

## Config (env, all optional)

| Var | Default | Purpose |
|-----|---------|---------|
| `WATCHDOG_MODELS` | `deepseek,mimo` | Which models to consult. |
| `WATCHDOG_DEEPSEEK_MODEL` | `deepseek-chat` | `deepseek-chat` (cheap) or `deepseek-reasoner` (deeper). |
| `WATCHDOG_INTERVAL_MIN` | `45` | Loop interval for `--loop`. |
| `WATCHDOG_WEBHOOK_URL` | — | POST `{text}` alerts here. |
| `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` | — | Enable live advisor + auth-log checks. |

`DEEPSEEK_API_KEY` and `MIMO_API_KEY` come from `.env.local`, same as the agent runners.
