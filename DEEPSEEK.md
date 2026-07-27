# Zivosmedia

Central social media / hub platform for the ZIVO ecosystem. The main
super-app embedding ZIVO Ride (`/rides/*`), Wallet, Chat, and other
product surfaces. Largest repo in the ecosystem.

## Stack

- Vite 8 + React + TypeScript
- Tailwind CSS + shadcn/ui
- Capacitor 8 (native iOS/Android + Electron desktop)
- Supabase (auth, Postgres, realtime, edge functions)
- Firebase (push notifications)
- TanStack React Query
- Cloudflare Workers
- Vitest + Playwright for testing

## Key directories

| Path | Purpose |
|---|---|
| `src/` | All app pages, components, hooks, services |
| `src/pages/app/` | Main app pages (feed, rides, etc.) |
| `src/lib/` | Shared libraries, maps, deep links |
| `supabase/functions/` | 100+ Edge Functions |
| `supabase/migrations/` | Database migrations |
| `scripts/` | Build, deploy, QA, native scripts |
| `ios/` | Capacitor iOS app |
| `android/` | Capacitor Android app |
| `electron/` | Electron desktop app |
| `cloudflare/` | Cloudflare Worker configs |
| `website/` | Marketing/public website |
| `docs/` | Architecture docs, SSO bridge, contracts |
| `tests/` | E2E and integration tests |

## Commands

```sh
npm run dev              # Vite dev (port 8081)
npm run build            # Production build (8GB memory)
npm test                 # Vitest tests
npm run type-check       # tsc --noEmit
npm run platform:audit   # Full platform audit suite
npm run release:gate     # Production release gate
npm run ios:sync         # Build + cap sync ios
npm run android:sync     # Build + cap sync android
```

## Architecture

- Super-app embedding ZIVO Ride, Wallet, Travel as trusted iframes
- SSO auth hub — handles PKCE code exchange for all product apps
- Connected workflows across ecosystem (rides, wallet, travel, chat)
- Real-time feed, messaging, reels, marketplace
- Ride integration: `/rides/*` routes render ZIVO-ride in iframe
- 2.1MB AGENT_TASKS.md — shared multi-agent task board

## Key notes

- `AGENTS.md` + `AGENT_TASKS.md` for multi-agent coordination
- `CHANGELOG.md` keeps release history
- `.mcp.json` for MCP server configuration
- Zivosmedia hosts the SSO auth hub for all ZIVO products
- Significant multi-agent environment (Claude, Codex, DeepSeek, MiMo)
