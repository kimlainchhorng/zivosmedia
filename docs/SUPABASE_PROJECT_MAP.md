# Supabase Project Map

## Known Project References

| Platform | Supabase project ref | Status |
| --- | --- | --- |
| Zivosmedia | slirphzzwcogdbkeicff | Confirmed. Visible in `supabase/config.toml`. |
| Zivo Admin | wtdlbzgryuelpylijnkd | Known from owner context; repo access still needs confirmation. |
| Zivo Driver | yiedlgoxwjmansszdypf | Known from owner context; repo access still needs confirmation. |
| ZivoSoftware | ydxztoresbdeoeijhxww | Known from owner context; repo access still needs confirmation. |
| Zivo Travel | xbllvmpomorawkcrtbcq | Confirmed in `zivostravel` README and `wrangler.toml`. |

## Needs Confirmation

- ZivoChat Supabase project.
- Zivo Business Supabase project.
- Zivo Employee Supabase project.
- ZivoPay/payment database location.
- Whether Zivo Business and Zivo Employee need their own repos or are modules inside another repo.

## Zivosmedia Supabase Role

Zivosmedia should own shared identity and shared payment records unless the owner approves a separate ZivoPay database. Use Zivosmedia as the initial hub for:

- `zivosmedia_user_id` identity mapping.
- account linking.
- auth audit logs.
- payment customers.
- payment orders.
- payment transactions.
- provider customer references.
- payment audit logs.

## Safety Rules

- Never commit service-role keys.
- Never expose secret keys in frontend code.
- Keep client-side keys limited to publishable/anon keys.
- Use RLS for user-visible data.
- Use server-side functions for privileged reads, writes, payment provider calls, and webhooks.
