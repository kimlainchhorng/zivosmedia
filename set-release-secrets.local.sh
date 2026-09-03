#!/usr/bin/env bash
# Sets the remaining GitHub Actions secrets required by mobile-build.yml for the
# v1.4.0 release, then re-runs the failed jobs of the v1.4.0 tag run.
# Requires: gh auth login (completed once). Safe to re-run; values are
# publishable keys and public URLs only (non-sensitive by design).
set -euo pipefail

REPO="kimlainchhorng/zivosmedia"

gh secret set VITE_ZIVO_RIDE_APP_URL --repo "$REPO" --body "https://ride.zivosmedia.com"
gh secret set VITE_SUPABASE_PROJECT_ID --repo "$REPO" --body "slirphzzwcogdbkeicff"
gh secret set SUPABASE_URL --repo "$REPO" --body "https://slirphzzwcogdbkeicff.supabase.co"
gh secret set VITE_SUPABASE_URL --repo "$REPO" --body "https://slirphzzwcogdbkeicff.supabase.co"
gh secret set VITE_SUPABASE_PUBLISHABLE_KEY --repo "$REPO" --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI"
gh secret set VITE_ZIVO_SOFTWARE_SUPABASE_URL --repo "$REPO" --body "https://ydxztoresbdeoeijhxww.supabase.co"
gh secret set VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY --repo "$REPO" --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeHp0b3Jlc2JkZW9laWpoeHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTU0NTMsImV4cCI6MjA5NTc3MTQ1M30.TsxngKnoX_HXYyh4m1gK7peS4BUSl-NTTeAESdHJ70k"
gh secret set ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY --repo "$REPO" --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeHp0b3Jlc2JkZW9laWpoeHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTU0NTMsImV4cCI6MjA5NTc3MTQ1M30.TsxngKnoX_HXYyh4m1gK7peS4BUSl-NTTeAESdHJ70k"
gh secret set ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY --repo "$REPO" --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZWRsZ294d2ptYW5zc3pkeXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MTQwMTIsImV4cCI6MjA5NjI5MDAxMn0.Vu3xqdQVsKi7f1ypE1d4tRipyLAOLCzn5xt9fgbnWUE"
gh secret set ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY --repo "$REPO" --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibGx2bXBvbW9yYXdrY3J0YmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk1OTYsImV4cCI6MjA5NjI2NTU5Nn0.aM2rBM5gtVqEaFLB9X5bDbFPamJO2x3cy1LooKZoko0"

echo "All derivable secrets set. Re-running failed jobs of the v1.4.0 build..."
gh run rerun 33779725908 --repo "$REPO" --failed
echo "Done. Watch: https://github.com/kimlainchhorng/zivosmedia/actions/runs/33779725908"
