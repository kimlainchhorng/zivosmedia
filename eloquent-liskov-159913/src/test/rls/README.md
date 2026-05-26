# `store-assets` RLS test suite

Verifies that the `store-assets` storage bucket policy correctly:

- Allows a signed-in store owner to upload / update / delete objects under
  their own `<storeId>/...` and `<storeId>/products/...` folders.
- Blocks the same owner from touching another store's folder.
- Allows admins (`has_role(auth.uid(), 'admin')`) full access.

## Run

```bash
npm run test:rls
```

If the required env vars are not set, the relevant `describe` block is
**skipped automatically** (so CI without test creds still passes).

## Required env vars

Provide these in `.env.local` or your CI secret store:

| Variable | Notes |
|---|---|
| `VITE_SUPABASE_URL` | Already in `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Already in `.env` |
| `VITE_TEST_OWNER_A_EMAIL` | Email of seeded test store owner A |
| `VITE_TEST_OWNER_A_PASSWORD` | Password for owner A |
| `VITE_TEST_OWNER_A_STORE_ID` | A `store_profiles.id` owned by A |
| `VITE_TEST_OWNER_B_EMAIL` | Email of seeded test store owner B |
| `VITE_TEST_OWNER_B_PASSWORD` | Password for owner B |
| `VITE_TEST_OWNER_B_STORE_ID` | A `store_profiles.id` owned by B |

Optional (admin block runs only when these are present):

| Variable | Notes |
|---|---|
| `VITE_TEST_ADMIN_EMAIL` | Email of an account in `user_roles` with `admin` |
| `VITE_TEST_ADMIN_PASSWORD` | Password for that admin |

## Cleanup

The suite removes every object it uploads in `afterAll` hooks. If a test
crashes mid-run you may have leftover `*-rls-*.png` files in the bucket
that are safe to delete manually.
