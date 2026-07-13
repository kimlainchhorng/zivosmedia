# MiMo run (direct) — 2026-06-16T00:41:19.557Z

- model: mimo-v2.5-pro
- task: Redesign ZivoMobileNav (fresh 2026 UX/UI + graphics)
- note: called directly via curl; npm runner failed on oversized AGENT_TASKS.md payload

---

## 1. Visual Direction — "Luminous Glass"

| Element | Treatment |
|---|---|
| **Container** | Refined frosted glass: `backdrop-blur-3xl backdrop-saturate-[1.8]`, multi-layer shadows, crisp `border-white/60` catch-light edge. No candy fill. |
| **Active indicator** | A **3 px gradient accent bar** floating at the top of the active pill — scales from 50→100% with a soft pink glow shadow. No full-surface gradient fill. |
| **Icon** | Inactive: thin stroke (1.6). Active: bold stroke (2.4) + subtle `scale-[1.08]` lift + a faint gradient halo blur behind it. Fill only on designated `fillable` icons. |
| **Account avatar** | Inactive: plain 24px avatar. Active: 28px avatar wrapped in `ring-ig-gradient` story-ring (2px gradient border). |
| **Label** | Always visible, 10px semibold. Inactive: inherited muted gray. Active: `text-ig-gradient` clipped gradient text. |
| **Badge** | Spring-pops in. Active: `bg-ig-gradient` + pink glow shadow. Inactive: solid `bg-rose-500`. |
| **Ambient glow** | A faint `bg-ig-gradient` blur orb sits above the bar (opacity 6–12%), giving the bar a "luminous float" halo. |
| **Press feel** | `active:scale-[0.92]` + haptic `impact("light")`. CSS transitions (200–300ms ease-out) on indicator, glow, scale — no `layoutId`. |

---

## 2. Full Replacement JSX — `const nav = (…)`

Replace the entire `const nav = (…)` block (from `<nav` through the closing `</nav>`) with:

```tsx
  const nav = (
    <nav
      ref={ref}
      data-zivo-mobile-nav
      className="fixed inset-x-0 bottom-0 z-[1401] lg:hidden pb-safe pointer-events-none"
    >
      <div className="relative px-3 pb-3">
        {/* ── Ambient light bleed above the bar ── */}
        <div
          className="pointer-events-none absolute inset-x-6 -top-5 h-14 rounded-full bg-ig-gradient opacity-[0.06] blur-2xl dark:opacity-[0.12]"
          aria-hidden
        />

        {/* ── Frosted-glass pill ── */}
        <div
          className={cn(
            "pointer-events-auto relative flex w-full items-stretch",
            "rounded-[26px] px-1.5 py-2",
            /* Light glass */
            "bg-white/[0.82] backdrop-blur-3xl backdrop-saturate-[1.8]",
            "border border-white/60",
            "shadow-[0_4px_24px_rgba(0,0,0,0.06),0_12px_48px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.95)]",
            /* Dark glass */
            "dark:bg-zinc-950/[0.78] dark:border-white/[0.06]",
            "dark:shadow-[0_4px_24px_rgba(0,0,0,0.35),0_12px_48px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.04)]",
          )}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            const label = tab.label ?? (tab.labelKey ? t(tab.labelKey) : "");
            const isAccountWithAvatar = tab.id === "account" && !!user;

            return (
              <button
                key={tab.id}
                type="button"
                onPointerDown={() => {
                  const target = tab.path.startsWith("/login")
                    ? decodeURIComponent(tab.path.split("redirect=")[1] || "")
                    : tab.path;
                  if (target && activeTab !== tab.id) prefetch(target);
                }}
                onClick={() => {
                  if (!isTravel && tab.id === "account" && activeTab === "account") {
                    impact("light");
                    navigate(location.pathname.startsWith("/more") ? gated("/profile") : "/more");
                    return;
                  }
                  if (activeTab !== tab.id) {
                    impact("light");
                    navigate(tab.path);
                  }
                }}
                className={cn(
                  "group relative flex flex-1 min-h-[52px] min-w-[44px] touch-manipulation flex-col items-center justify-center gap-0.5",
                  "rounded-2xl px-0.5 transition-all duration-200 ease-out active:scale-[0.92]",
                  isActive
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-400 hover:text-zinc-500 dark:text-zinc-500 dark:hover:text-zinc-400",
                )}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* ── Top gradient accent bar (always rendered for CSS transition) ── */}
                <div
                  className={cn(
                    "absolute top-0 left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-full transition-all duration-300 ease-out",
                    isActive
                      ? "scale-x-100 opacity-100 bg-ig-gradient shadow-[0_1px_8px_rgba(236,72,153,0.45)]"
                      : "scale-x-50 opacity-0",
                  )}
                  aria-hidden
                />

                {/* ── Icon / Avatar ── */}
                {isAccountWithAvatar ? (
                  <div
                    className={cn(
                      "relative z-10 shrink-0 rounded-full transition-all duration-300",
                      isActive ? "p-[2px] ring-ig-gradient" : "",
                    )}
                  >
                    <Avatar
                      className={cn(
                        "block transition-all duration-200",
                        isActive ? "h-7 w-7" : "h-6 w-6",
                      )}
                    >
                      <AvatarImage
                        src={
                          profile?.avatar_url ||
                          user.user_metadata?.avatar_url ||
                          undefined
                        }
                        alt="Account"
                        className="object-cover"
                      />
                      <AvatarFallback
                        className={cn(
                          "text-[10px] font-bold",
                          isActive
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                        )}
                      >
                        {(
                          profile?.full_name?.[0] ||
                          user.email?.[0] ||
                          "Z"
                        ).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ) : (
                  <div className="relative z-10 shrink-0">
                    <Icon
                      className={cn(
                        "h-[22px] w-[22px] transition-all duration-200",
                        isActive && "scale-[1.08]",
                      )}
                      strokeWidth={isActive ? 2.4 : 1.6}
                      fill={isActive && tab.fillable ? "currentColor" : "none"}
                      aria-hidden
                    />
                    {/* Gradient glow halo behind active icon */}
                    <div
                      className={cn(
                        "absolute inset-0 -z-10 scale-[2.2] rounded-full bg-ig-gradient blur-lg transition-opacity duration-300",
                        isActive ? "opacity-[0.1]" : "opacity-0",
                      )}
                      aria-hidden
                    />
                  </div>
                )}

                {/* ── Label ── */}
                <span
                  className={cn(
                    "relative z-10 max-w-full truncate text-[10px] font-semibold leading-tight tracking-tight transition-colors duration-200",
                    isActive ? "text-ig-gradient" : "",
                  )}
                  aria-hidden
                >
                  {label}
                </span>

                {/* ── Badge ── */}
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 520,
                      damping: 22,
                    }}
                    className={cn(
                      "absolute right-[16%] top-0 z-20 flex h-[15px] min-w-[15px] items-center justify-center",
                      "rounded-full px-[4px] text-[8px] font-black leading-none",
                      isActive
                        ? "bg-ig-gradient text-white shadow-[0_2px_8px_rgba(236,72,153,0.5)]"
                        : "bg-rose-500 text-white shadow-[0_2px_6px_rgba(244,63,94,0.35)]",
                    )}
                  >
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
```

---

## 3. Helper Additions

**None required.** All Tailwind utilities used are either built-in v4 (`backdrop-blur-3xl`, `backdrop-saturate-[1.8]`, `scale-x-50`, `scale-[1.08]`, `scale-[2.2]`) or the existing brand custom utilities (`bg-ig-gradient`, `text-ig-gradient`, `ring-ig-gradient`). No new dependencies, no new files.
