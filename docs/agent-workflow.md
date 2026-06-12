# Multi-agent workflow — Claude + Codex + DeepSeek + MiMo

This is the shared rulebook so the AI tools can work on ZIVO **together** without
overwriting each other. Plain steps, on purpose.

The single source of truth is [`AGENTS.md`](../AGENTS.md) (architecture + guardrails).
This file adds **how the agents coordinate**. The live to-do list is
[`AGENT_TASKS.md`](../AGENT_TASKS.md).

---

## The three agents (who does what)

| Agent | Best at | Owns |
|-------|---------|------|
| **Claude Code** | Big features, cross-cutting changes, reviewing, running the verify gate | The 3D travel kit (`src/styles/zivo-travel-3d.css`, `src/components/zivo-travel/`) + `ZivoTravelHome` |
| **Codex** | Page-level work, backend readiness | `/flights`, `/hotels`, `/cars`, `/bus` and the booking funnel |
| **DeepSeek** | Planning, second-opinion review, focused single-task diffs | No files directly — runs via `npm run agent:deepseek` and **proposes**; a human/Claude/Codex applies the change |
| **MiMo** (Xiaomi) | Deeper reasoning, audits, second-opinion review | No files directly — runs via `npm run agent:mimo` and **proposes**; a human/Claude/Codex applies the change |

> DeepSeek and MiMo are **advisors by default**. The runner script gives the model the
> rulebook and a task, and it returns a plan or a diff. They do **not** edit your repo on
> their own. You review the output, then apply it (or ask Claude/Codex to).

---

## The 6 coordination rules

1. **One rulebook.** Every agent reads `AGENTS.md` + this file before starting.
   Codex and Claude read `AGENTS.md` automatically. DeepSeek gets it injected by the
   runner script.
2. **Claim before you build.** Add your task to [`AGENT_TASKS.md`](../AGENT_TASKS.md)
   under **In progress** with your name + date, so the other two don't touch the same files.
3. **One agent per file/page.** If two tasks touch the same file, do them one at a time.
   Re-check `git status` right before editing a shared file.
4. **Verify before you finish.** Run **`npm run update`** (see below). It must pass
   (types + worker types + production build) before a task moves to **Done**.
5. **Owner commits & deploys.** Don't `git commit`, `git push`, or deploy unless the
   owner asks. Build changes **ready to deploy** and hand over the exact command.
6. **Keep changes additive.** One build serves all domains — a change here ships
   everywhere. Don't break zivosmedia while improving zivostravel.

---

## The one command: `npm run update`

This is the gate any agent (or you) runs before calling work "done". It runs the same
hard checks CI blocks on:

```bash
npm run update
```

It does three things, in order:

1. `type-check` — the app must have **0 TypeScript errors**.
2. `type-check:worker` — the Cloudflare worker (`cloudflare/worker.ts`) must type-check.
3. `build` — the production build must succeed.

Faster inner-loop check (types only, skips the build):

```bash
npm run verify:fast
```

Deeper optional checks (not part of the gate — run when relevant):

```bash
npm run lint      # eslint everything
npm test          # vitest unit tests
```

---

## How to run DeepSeek / MiMo

MiMo (Xiaomi) uses the **same runner CLI and flags** as DeepSeek — just swap
`agent:deepseek` for `agent:mimo`. Examples below use DeepSeek; replace the command
to use MiMo instead.

### Locally (your machine)

1. Put your key(s) in `.env.local` (already git-ignored):

   ```
   DEEPSEEK_API_KEY=sk-...your-key...
   MIMO_API_KEY=sk-...your-key...          # for npm run agent:mimo
   # MIMO_BASE_URL=https://api.xiaomimimo.com/v1           # optional override
   # MIMO_MODEL=mimo-v2.5-pro                              # optional override
   # MIMO_API_FORMAT=openai                                # optional override
   # MIMO_THINKING=disabled                                # optional override
   ```

2. Ask it to plan or review a task:

   ```bash
   npm run agent:deepseek -- --task "Plan the og:image wiring for ZivoTravelHome"
   ```

3. Give it files for context (repeat `--file` as needed):

   ```bash
   npm run agent:deepseek -- \
     --task "Review this for bugs and suggest a diff" \
     --file src/pages/ZivoTravelHome.tsx \
     --file src/config/zivoTravelDomain.ts
   ```

Useful flags:

| Flag | What it does | Default |
|------|--------------|---------|
| `--task "..."` | The job for DeepSeek (required) | — |
| `--file path` | Add a file's contents as context (repeatable) | none |
| `--model name` | `deepseek-chat` (fast) or `deepseek-reasoner` (deeper) | `deepseek-chat` |
| `--out path` | Save the answer to a file | print to screen + `docs/agent-runs/` |
| `--no-save` | Don't save a copy under `docs/agent-runs/` | saves by default |

Every run is also saved to `docs/agent-runs/` so the other agents (and you) can read what
DeepSeek proposed.

### In GitHub (no laptop needed)

1. One-time: add the key as a repo secret (the owner runs this):

   ```bash
   gh secret set DEEPSEEK_API_KEY --app actions
   ```

2. GitHub → **Actions** tab → **Agent update (DeepSeek)** → **Run workflow** → type the
   task → **Run**. The answer appears in the run's **Summary** and as a downloadable
   artifact.

---

## A normal "work together" loop

1. **Pick / claim** a task in `AGENT_TASKS.md`.
2. *(optional)* **Ask DeepSeek to plan it**: `npm run agent:deepseek -- --task "..."`.
3. **Build it** with Claude or Codex (whoever owns those files).
4. **Verify**: `npm run update` → must pass.
5. **Move the task to Done** in `AGENT_TASKS.md`.
6. **Hand the owner** the deploy command (owner pushes/deploys).
