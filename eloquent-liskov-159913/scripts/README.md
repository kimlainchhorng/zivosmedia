# Operational scripts

## storyDeeplinkWeeklyReport.ts

Generates a weekly cohort CSV of story deep-link performance grouped by source.

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role> \
  bun scripts/storyDeeplinkWeeklyReport.ts
```

Output: `/mnt/documents/story-deeplink-weekly-<YYYY-MM-DD>.csv`

Sections:
- Per-source funnel (opens → rendered → completion + missing rate)
- Missing reasons breakdown
- Top 10 stories per source by open→render conversion (min 5 opens)
