# DeepSeek run — 2026-08-12T18:40:38.649Z

- model: deepseek-chat
- task: Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or hardcoded data shown as if real; controls that claim an action but do not persist or navigate to the wrong place (missing/wrong route params, wrong navigation state shape); silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never checked, especially when a wired error/retry UI exists that then never fires); broken deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can prove from the code. If genuinely clean, say so plainly in one line.
- files: src/pages/CreatorDashboardPage.tsx

---

## Audit: `src/pages/CreatorDashboardPage.tsx`

### Plan

I'll audit this page for concrete user-facing bugs only, per the strict criteria: mock/hardcoded data, controls that claim actions but don't persist/navigate, silent Supabase error swallowing, broken deep-links, and logic errors. I'll cite exact line numbers and only report bugs I can prove from the code.

---

### Findings

**BUG 1 — Silent Supabase error swallowing in `postCount` query (line ~118-126)**

```ts
const { data: store } = await (supabase as any)
  .from("store_profiles")
  .select("id")
  .eq("owner_id", user!.id)
  .maybeSingle();
if (!store?.id) return 0;
const { count } = await (supabase as any)
  .from("store_posts")
  .select("id", { count: "exact", head: true })
  .eq("store_id", store.id);
return (count as number) || 0;
```

- **Line 118-120**: `store` fetch — `error` is never checked. If the query fails (RLS denial, network), `store` is `null`, and the function returns `0` silently. The user sees "0 posts" with no error indication.
- **Line 123-125**: `count` fetch — `error` is never checked. If it fails, `count` is `null`, and `(count as number) || 0` returns `0` silently.

**Impact**: The "First Post" milestone (line ~186) and "1K Views" milestone (line ~190) show `0 / 1` and `0 / 1000` even when the user has posts, with zero feedback. This is a silent-failure bug — the user is shown incorrect data as if it were real.

**Fix**: Check `error` and throw so react-query surfaces it (or at least log it):

```ts
const { data: store, error: storeError } = await (supabase as any)
  .from("store_profiles")
  .select("id")
  .eq("owner_id", user!.id)
  .maybeSingle();
if (storeError) throw storeError;
if (!store?.id) return 0;
const { count, error: countError } = await (supabase as any)
  .from("store_posts")
  .select("id", { count: "exact", head: true })
  .eq("store_id", store.id);
if (countError) throw countError;
return (count as number) || 0;
```

---

**BUG 2 — Silent Supabase error swallowing in `followerCount` query (line ~128-134)**

```ts
const { count } = await (supabase as any)
  .from("follows")
  .select("id", { count: "exact", head: true })
  .eq("following_id", user!.id);
return (count as number) || 0;
```

- **Line 130-132**: `error` is never checked. If the query fails, `count` is `null`, and the function returns `0` silently.

**Impact**: The "10 Followers" milestone (line ~187) shows `0 / 10` even when the user has followers, with zero feedback.

**Fix**:

```ts
const { count, error } = await (supabase as any)
  .from("follows")
  .select("id", { count: "exact", head: true })
  .eq("following_id", user!.id);
if (error) throw error;
return (count as number) || 0;
```

---

**BUG 3 — Silent Supabase error swallowing in `totalViews` query (line ~136-146)**

```ts
const { data: store } = await (supabase as any)
  .from("store_profiles")
  .select("id")
  .eq("owner_id", user!.id)
  .maybeSingle();
if (!store?.id) return 0;
const { data } = await (supabase as any)
  .from("store_posts")
  .select("view_count")
  .eq("store_id", store.id);
return ((data as any[]) || []).reduce((s: number, p: any) => s + (p.view_count ?? 0), 0);
```

- **Line 138-140**: `store` fetch — `error` never checked. Same silent-0 as BUG 1.
- **Line 143-145**: `data` fetch — `error` never checked. If it fails, `data` is `null`, and the reduce returns `0` silently.

**Impact**: The "Views" overview card (line ~176) and "1K Views" milestone (line ~190) show `0` even when the user has views, with zero feedback.

**Fix**:

```ts
const { data: store, error: storeError } = await (supabase as any)
  .from("store_profiles")
  .select("id")
  .eq("owner_id", user!.id)
  .maybeSingle();
if (storeError) throw storeError;
if (!store?.id) return 0;
const { data, error } = await (supabase as any)
  .from("store_posts")
  .select("view_count")
  .eq("store_id", store.id);
if (error) throw error;
return ((data as any[]) || []).reduce((s: number, p: any) => s + (p.view_count ?? 0), 0);
```

---

**BUG 4 — Silent Supabase error swallowing in `ppvRevenueCents` query (line ~148-156)**

```ts
const { data } = await (supabase as any)
  .from("ppv_posts")
  .select("revenue_cents")
  .eq("creator_id", user.id);
return ((data as any[]) || []).reduce((s: number, p: any) => s + (p.revenue_cents ?? 0), 0);
```

- **Line 151-153**: `error` never checked. If the query fails, `data` is `null`, and the reduce returns `0` silently.

**Impact**: The "PPV / DMs" overview card (line ~181) and the OF earnings breakdown strip (line ~246) show `$0.00` even when the user has PPV revenue, with zero feedback.

**Fix**:

```ts
const { data, error } = await (supabase as any)
  .from("ppv_posts")
  .select("revenue_cents")
  .eq("creator_id", user.id);
if (error) throw error;
return ((data as any[]) || []).reduce((s: number, p: any) => s + (p.revenue_cents ?? 0), 0);
```

---

**BUG 5 — Silent Supabase error swallowing in `dmRevenueCents` query (line ~158-166)**

```ts
const { data } = await (supabase as any)
  .from("direct_message_unlocks")
  .select("amount_cents_paid")
  .eq("creator_id", user.id);
return ((data as any[]) || []).reduce((s: number, r: any) => s + (r.amount_cents_paid ?? 0), 0);
```

- **Line 161-163**: `error` never checked. If the query fails, `data` is `null`, and the reduce returns `0` silently.

**Impact**: Same as BUG 4 — "PPV / DMs" card and OF earnings breakdown show `$0.00` with zero feedback.

**Fix**:

```ts
const { data, error } = await (supabase as any)
  .from("direct_message_unlocks")
  .select("amount_cents_paid")
  .eq("creator_id", user.id);
if (error) throw error;
return ((data as any[]) || []).reduce((s: number, r: any) => s + (r.amount_cents_paid ?? 0), 0);
```

---

**BUG 6 — Silent Supabase error swallowing in `creator` profile query (line ~44-50)**

```ts
const { data: creator } = useQuery({
  queryKey: ["creator-profile", user?.id],
  queryFn: async () => {
    const { data, error } = await (supabase as any).from("creator_profiles").select("*").eq("user_id", user!.id).maybeSingle();
    if (error) throw error;
    return data;
  },
  enabled: !!user,
});
```

- **Line 47**: `error` IS checked here — `if (error) throw error;`. This one is **clean**. Good.

---

**BUG 7 — Silent Supabase error swallowing in `tips` query (line ~52-60)**

```ts
const { data: tips = [] } = useQuery({
  queryKey: ["creator-tips", user?.id],
  queryFn: async () => {
    const { data, error } = await (supabase as any).from("creator_tips").select("*").eq("creator_id", user!.id).order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    return data || [];
  },
  enabled: !!user,
});
```

- **Line 56**: `error` IS checked — `if (error) throw error;`. **Clean**.

---

**BUG 8 — Silent Supabase error swallowing in `subscribers` query (line ~62-70)**

```ts
const { data: subscribers = [] } = useQuery({
  queryKey: ["creator-subscribers", user?.id],
  queryFn: async () => {
    const { data, error } = await (supabase as any).from("creator_subscriptions").select("*").eq("creator_id", user!.id).eq("status", "active").limit(50);
    if (error) throw error;
    return data || [];
  },
  enabled: !!user,
});
```

- **Line 67**: `error` IS checked — `if (error) throw error;`. **Clean**.

---

**BUG 9 — Silent Supabase error swallowing in `tiers` query (line ~72-80)**

```ts
const { data: tiers = [] } = useQuery({
  queryKey: ["subscription-tiers", user?.id],
  queryFn: async () => {
    const { data, error } = await (supabase as any).from("subscription_tiers").select("*").eq("creator_id", user!.id).order("sort_order", { ascending: true });
    if (error) throw error;
    return data || [];
  },
  enabled: !!user,
});
```

- **Line 77**: `error` IS checked — `if (error) throw error;`. **Clean**.

---

**BUG 10 — Broken deep-link: `/creator/setup?step=profile` (line ~283)**

The non-OF setup steps use `/creator/setup?step=profile`, `/creator/setup?step=verify`, `/creator/setup?step=payout`, `/creator/setup?step=tier`, `/creator/setup?step=tips`, `/creator/setup?step=launch` (lines 283-288).

The OF setup steps use `/account/profile-edit`, `/account/verification`, `/creator/setup?step=payout`, `/monetization`, `/monetization#tips`, `/ppv/create`, `/account/profile-edit` (lines 268-274).

**I cannot prove these are broken** without seeing the target pages. The `/creator/setup` route and its `step` param handling are not in the provided context. I'll flag this as **needs verification** rather than a confirmed bug.

---

**BUG 11 — Logic error: `ofMilestones` "First PPV Sale" is hardcoded to `current: 0` (line ~198)**

```ts
{ label: "First PPV Sale", target: 1, current: 0, icon: Lock, accent: "hsl(263 70% 58%)" },
```

- **Line 198**: `current: 0` is hardcoded. The page already computes `ppvRevenueCents` (line ~148-156) and `unlockRevenueCents` (line ~170). This milestone will **always** show `0 / 1` even when the user has PPV sales, because `current` is hardcoded to `0` and never derived from actual data.

**Impact**: The "First PPV Sale" milestone is permanently stuck at `0 / 1` — a concrete logic error showing incorrect data as if real.

**Fix**:

```ts
{ label: "First PPV Sale", target: 1, current: ppvRevenueCents > 0 ? 1 : 0, icon: Lock, accent: "hsl(263 70% 58%)" },
```

---

**BUG 12 — Logic error: `ofMilestones` "$100 from Subs" uses `totalEarnings` instead of subscription revenue (line ~199)**

```ts
{ label: "$100 from Subs", target: 100, current: totalEarnings / 100, icon: DollarSign, accent: "hsl(142 71% 45%)" },
```

- **Line 199**: `current: totalEarnings / 100` — but `totalEarnings` (line ~171) is the **sum of ALL earnings** (tips + live gifts + PPV/DM + `creator.total_earnings_cents`). The milestone is labeled "$100 from Subs" but uses total earnings, which includes tips, gifts, and PPV/DM revenue. A user could hit "$100 from Subs" with $0 from subscriptions but $100 from tips.

**Impact**: The milestone is misleading — it claims to track subscription revenue but actually tracks total earnings. This is a logic error.

**Fix**: There's no subscription-specific revenue query on this page. Either:
- Add a query for subscription revenue (e.g., sum `amount_cents` from `creator_subscriptions` where `status = 'active'` or a `subscription_payments` table), or
- Rename the milestone to "$100 Earned" to match what it actually tracks.

---

**BUG 13 — Logic error: `ofMilestones` "First Tip" uses `tips.length > 0 ? 1 : 0` but `tips` is limited to 20 (line ~197)**

```ts
{ label: "First Tip", target: 1, current: tips.length > 0 ? 1 : 0, icon: Heart, accent: "hsl(25 95% 53%)" },
```

- **Line 197**: `tips` is fetched with `.limit(20)` (line ~55). If the user has more than 20 tips, `tips.length` is still 20, so `tips.length > 0` is `true` — this is fine. But if the user has **exactly 0 tips**, `tips.length` is `0`, so `current` is `0` — also fine. Actually, this is **correct** — `tips.length > 0` is true if there's at least one tip, regardless of the limit. **Not a bug.**

---

**BUG 14 — Logic error: `ofMilestones` "First Subscriber" uses `subscribers.length > 0 ? 1 : 0` but `subscribers` is limited to 50 (line ~196)**

```ts
{ label: "First Subscriber", target: 1, current: subscribers.length > 0 ? 1 : 0, icon: Users, accent: "hsl(340 75% 55%)" },
```

- **Line 196**: Same logic as BUG 13 — `subscribers.length > 0` is true if there's at least one subscriber, regardless of the 50-row limit. **Not a bug.**

---

**BUG 15 — Logic error: `ofMilestones` "10 Subscribers" and "50 Subscribers" use `subscribers.length` which is capped at 50 (lines ~197, ~200)**

```ts
{ label: "10 Subscribers", target: 10, current: subscribers.length, icon: Users, accent: "hsl(0 84% 60%)" },
...
{ label: "50 Subscribers", target: 50, current: subscribers.length, icon: Crown, accent: "hsl(38 92% 50%)" },
```

- **Lines 197, 200**: `subscribers` is fetched with `.limit(50)` (line ~67). If the user has **more than 50 subscribers**, `subscribers.length` is capped at 50, so "50 Subscribers" shows `50 / 50` (correct) but "10 Subscribers" also shows `50 / 10` (over 100%, clamped to 100% by `Math.min` at line ~222). This is **not a bug** for the "50 Subscribers" milestone (it correctly shows complete), but for "10 Subscribers" it shows `50 / 10` which is misleading — the user sees "50 / 10" instead of "10 / 10". Actually, `Math.min(100, (m.current / m.target) * 100)` clamps the progress bar, but the text at line ~225 shows `{m.current} / {m.target}` = `50 / 10`. **This is a minor display bug** — the text shows `50 / 10` which looks wrong.

**Impact**: With >50 subscribers, the "10 Subscribers" milestone shows `50 / 10` instead of `10 / 10`. Minor but user-facing.

**Fix**: Use `Math.min(m.current, m.target)` for the display, or fetch the true count with `count: "exact"` instead of `.limit(50)`.

---

**BUG 16 — Logic error: `overviewCards` "Subscribers" uses `subscribers.length` which is capped at 50 (line ~174)**

```ts
{ label: "Subscribers", value: String(subscribers.length), icon: Users, accent: "hsl(221 83% 53%)" },
```

- **Line 174**: Same as BUG 15 —
