# Security Checklist

## Repository Safety

- Do not push directly to main.
- Use feature branches.
- Create pull requests.
- Do not commit `.env` files.
- Do not commit secrets.
- Do not commit Supabase service-role keys.
- Do not commit Stripe, PayPal, or Square secret keys.

## Payment Safety

- Do not store card numbers.
- Do not store CVV.
- Do not build custom card processing.
- Use provider-hosted checkout or approved provider SDK flows.
- Use sandbox/test mode first.
- No live payment without owner approval.
- Verify webhooks.
- Process webhooks idempotently.
- Audit every payment state change.

## Supabase Safety

- Use RLS for user-visible records.
- Use server-side functions for privileged operations.
- Keep service-role keys server-side only.
- Do not run destructive migrations without owner approval.
- Do not delete production data.
- Review migration rollback plans.

## Auth Safety

- Use `zivosmedia_user_id` for cross-platform identity.
- Audit account linking and role changes.
- Use short-lived handoff codes for Continue with Zivosmedia.
- Do not trust browser redirects for sensitive state changes.

## PR Safety

- Run lint, build, type checks, and tests before implementation PRs.
- For docs-only PRs, verify changed files are documentation only.
- Report inaccessible repos exactly; do not guess alternate names.
