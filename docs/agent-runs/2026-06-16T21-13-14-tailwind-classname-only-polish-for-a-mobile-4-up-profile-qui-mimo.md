# MiMo advisor — Tailwind className-only polish for a mobile 4-up profile quick-action grid (Shop/Employees/Mode/Earn). Read attached file. HARD RULE: className/display-attr only, no JS, no new per-item fields, no restructure. Give CONCRETE old->new className changes improving icon+label legibility and tone consistency on ~88px-wide tiles. If a tone-colored icon needs a per-item JS field, flag it as out-of-scope. Say leave-as-is for anything already good. Under 380 words.

Files: /tmp/profile-quickactions.md

## Concrete className changes

### 1. Icon + chip legibility (~88px tile has room)

| Element | Old | New | Why |
|---|---|---|---|
| Icon chip `<span>` | `h-6 w-6` | `h-7 w-7` | 24→28px; 16px icon breathes inside |
| Icon SVG `<a.icon>` | `h-3 w-3` | `h-4 w-4` | 12→16px; legible at arm's length |
| Label `<span>` | `"truncate"` (inherits `text-[9px]`) | `"truncate text-[10.5px] leading-tight tracking-tight"` | 9→10.5px, tighter leading fits tile |
| Button gap | `gap-0.5` | `gap-1` | prevents icon+label feeling crammed |
| Button min-height | `min-h-[46px]` | `min-h-[52px]` | 48px+ tap-target per Apple HIG |
| Button padding | `py-1.5` | `py-2` | vertical breathing room for taller content |

### 2. Tone opacity consistency

| Tile | Old `tone` value | New |
|---|---|---|
| Shop | `from-emerald-500/18 to-teal-500/8` | leave as-is |
| Employees | `from-sky-500/18 to-blue-500/8` | leave as-is |
| Mode | `from-violet-500/18 to-fuchsia-500/8` | leave as-is |
| **Earn** | `from-amber-500/**20** to-orange-500/8` | `from-amber-500/**18** to-orange-500/8` |

One-char fix: `20` → `18`.

### 3. Icon echoing tile tone color — **OUT OF SCOOP**

Each icon is `text-foreground` (neutral). Making it tone-aware requires a per-item color class (`text-emerald-600`, `text-sky-600`, etc.) — that's a **new per-item JS field** (`iconColor` or similar). Cannot be derived from the existing `a.tone` gradient string without JS string parsing. Flag as out-of-scope per hard rules.

### 4. Leave as-is

- Gradient direction (`bg-gradient-to-br`) — fine.
- Border/shadow/transition/hover/focus ring — all solid.
- `rounded-xl` on tiles, `rounded-lg` on chip — good hierarchy.
- `shadow-sm` on chip inside `shadow-sm` on card — adequate depth.

### Final assembled button className (diff view)

```
 "flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-border/50 bg-gradient-to-br px-1 py-2 text-[10.5px] font-extrabold leading-tight tracking-tight text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
```

Icon chip: `h-7 w-7` · Icon SVG: `h-4 w-4` · Label: add `text-[10.5px] leading-tight tracking-tight`. Total: zero JS changes, real legibility gain.
