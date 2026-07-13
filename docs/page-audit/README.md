# ZIVO Page-Audit Watchdog (24/7, read-only)

A scheduled task that uses **DeepSeek + MiMo** to audit one page per cycle for concrete,
code-verified user-facing bugs (mock data, fake controls, dropped params, swallowed
errors, broken deep-links). It **never edits code, the DB, or commits** — audit + report
only. Each cycle's two reviews are saved under `docs/agent-runs/`; a summary of the latest
cycle is in `LATEST.md` here, and `history.jsonl` tracks every run.

The owner (or a future Claude session) reads the reviews and fixes the verified findings.

## Run manually
```
npm run audit:watch                                  # one cycle, next page in the rotation
npm run audit:watch -- --page src/pages/Foo.tsx      # force a specific page
npm run audit:watch:loop -- --interval 180           # foreground loop, every 180 min
```

## 24/7 via a Windows Scheduled Task
A wrapper at `scripts/agents/run-page-audit.cmd` runs one cycle and logs to `cron.log`.
Register a task that runs it every 3 hours (current user; survives reboots/closed terminals):

```powershell
$repo    = "C:\Users\chhor\OneDrive\Documents\zivosmedia"
$action  = New-ScheduledTaskAction -Execute "$repo\scripts\agents\run-page-audit.cmd"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
           -RepetitionInterval (New-TimeSpan -Hours 3)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 20)
Register-ScheduledTask -TaskName "ZivoPageAuditWatchdog" -Action $action -Trigger $trigger `
           -Settings $settings -Description "ZIVO 24/7 DeepSeek+MiMo page audit (read-only)"
```

Control it:
```powershell
Get-ScheduledTaskInfo -TaskName "ZivoPageAuditWatchdog"      # last/next run, result
Start-ScheduledTask   -TaskName "ZivoPageAuditWatchdog"      # run one cycle now
Unregister-ScheduledTask -TaskName "ZivoPageAuditWatchdog" -Confirm:$false   # remove
```

Needs `DEEPSEEK_API_KEY` + `MIMO_API_KEY` in `.env.local` (already configured).
