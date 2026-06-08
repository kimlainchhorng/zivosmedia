# Domains and Repositories

## Confirmed Domains

| Domain | Platform |
| --- | --- |
| zivosmedia.com | Zivosmedia |
| zivobusiness.com | Zivo Business |
| zivodriver.com | Zivo Driver |
| zivoemployee.com | Zivo Employee |
| zivoschat.com | ZivoChat |
| zivosoftware.com | ZivoSoftware |
| zivostravel.com | Zivo Travel |
| zivoadmin.com | Zivo Admin |

## Confirmed Repo Names and Access Check

| Repo | Accessible in this session | Default branch | Notes |
| --- | --- | --- | --- |
| kimlainchhorng/zivosmedia | yes | main | Public repo, admin/maintain/push access visible through GitHub connector. |
| kimlainchhorng/zivodriver | no | unknown | GitHub connector returned 404 Not Found. |
| kimlainchhorng/ZIVO-CHAT | no | unknown | GitHub connector returned 404 Not Found. |
| kimlainchhorng/zivostravel | yes | main | Public repo, admin/maintain/push access visible through GitHub connector. |
| kimlainchhorng/Zivo-Admin | no | unknown | GitHub connector returned 404 Not Found. |
| kimlainchhorng/zivosoftware | no | unknown | GitHub connector returned 404 Not Found. |

## Action for 404 Repos

Do not guess alternate names. Owner should connect GitHub app access, verify spelling/capitalization, or create the repo before implementation work starts there.

## Visible Deployment Hints

- `kimlainchhorng/zivosmedia`: Vite/React app with `netlify.toml`, `wrangler.toml`, Cloudflare Worker assets, Supabase Edge Functions, and GitHub workflows.
- `kimlainchhorng/zivostravel`: Vite/React app with `wrangler.toml`, Cloudflare Worker assets, travel docs, and Supabase migrations.

## Repo Inventory Summary

Detailed inventory is reported in the PR summary and should be refreshed before each implementation PR.
