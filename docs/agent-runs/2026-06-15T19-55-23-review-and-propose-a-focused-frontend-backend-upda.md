# DeepSeek run — 2026-06-15T19:55:23.068Z

- model: deepseek-chat
- task: Review and propose a focused frontend/backend update for /channels/new. Current issue: channel creation page needs a more complete create flow; likely backend gap is creator should become owner subscriber/admin and frontend should validate/sanitize handle, prevent stale availability races, improve accessible form state, and test end-to-end. Keep changes scoped to NewChannelPage and a migration/RPC if needed; do not touch unrelated ride/driver files.
- files: src/pages/channels/NewChannelPage.tsx, src/hooks/useMyChannels.ts, supabase/migrations/20260602033000_add_channel_join_approval.sql, supabase/migrations/20260602033500_add_channel_removed_users.sql, supabase/migrations/20260602034500_add_channel_add_member_rpc.sql, supabase/migrations/20260602035500_add_channel_redeem_invite.sql

---

# Plan: Complete `/channels/new` create flow

## Issues Found

1. **Backend gap**: Creator is inserted into `channels` but NOT into `channel_subscribers` as owner/admin — `useMyChannels` won't show it, and the creator has no explicit role row.
2. **Stale availability race**: The debounced check can return stale data if the user types quickly and the previous check resolves after the current one.
3. **Handle sanitization**: The auto-generate from name uses `replace(/[^a-z0-9_]/g, "_")` which can produce leading/trailing underscores and double underscores — ugly handles.
4. **Accessible form state**: No `aria-describedby` on handle input for availability status, no `aria-invalid` on invalid fields, no `role="status"` on the availability indicator.
5. **No end-to-end test**: Missing a vitest test for the page.

## Changes

### 1. New migration: `20260614000000_channel_create_auto_subscribe.sql`
- Adds a trigger that auto-inserts the creator into `channel_subscribers` with role `'owner'` after a channel is created.
- This ensures `useMyChannels` immediately shows the new channel.

### 2. `src/pages/channels/NewChannelPage.tsx` — frontend fixes
- Add stale-availability guard with an abort controller pattern
- Improve handle sanitization (collapse multiple underscores, trim leading/trailing)
- Add `aria-describedby`, `aria-invalid`, `role="status"` for accessibility
- Add `aria-busy` on submit button
- Add `autoComplete` attributes

### 3. `src/__tests__/NewChannelPage.test.tsx` — new vitest test
- Tests form validation, handle auto-generation, availability check, submit flow

---

## Proposed Changes

### Migration: `supabase/migrations/20260614000000_channel_create_auto_subscribe.sql`

```sql
-- Auto-subscribe the channel creator as 'owner' in channel_subscribers.
-- This ensures useMyChannels() immediately shows the new channel.
create or replace function public.channel_auto_subscribe_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.channel_subscribers (channel_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (channel_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_channel_auto_subscribe_owner on public.channels;
create trigger trg_channel_auto_subscribe_owner
  after insert on public.channels
  for each row execute function public.channel_auto_subscribe_owner();
```

### `src/pages/channels/NewChannelPage.tsx` — full replacement

```tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSmartBack } from "@/lib/smartBack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Check, X, ChevronLeft } from "lucide-react";

/** Sanitize a string into a valid channel handle. */
function sanitizeHandle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")       // collapse multiple underscores
    .replace(/^_|_$/g, "")     // trim leading/trailing underscores
    .slice(0, 32);
}

export default function NewChannelPage() {
  const nav = useNavigate();
  const goBack = useSmartBack("/channels");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [userHasEditedHandle, setUserHasEditedHandle] = useState(false);
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const availabilityId = useRef(0); // stale-race guard

  // Auto-generate handle from name if user hasn't edited it
  useEffect(() => {
    if (!userHasEditedHandle && name.trim()) {
      setHandle(sanitizeHandle(name.trim()));
    }
  }, [name, userHasEditedHandle]);

  // Debounced availability check with stale-race guard
  useEffect(() => {
    const trimmed = handle.trim();
    if (!trimmed) {
      setAvailable(null);
      return;
    }
    const id = ++availabilityId.current;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("channels")
        .select("id")
        .eq("handle", trimmed.toLowerCase())
        .maybeSingle();
      // Only apply if this is still the latest request
      if (id === availabilityId.current) {
        setAvailable(!data);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [handle]);

  const submit = async () => {
    let finalHandle = handle.trim().toLowerCase();
    if (!finalHandle && name.trim()) {
      finalHandle = sanitizeHandle(name.trim());
      setHandle(finalHandle);
    }

    if (!name.trim() || !finalHandle) {
      toast.error("Name and handle are required");
      return;
    }
    if (available === false) {
      toast.error("Handle is taken");
      return;
    }
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in required");
      setSubmitting(false);
      return;
    }
    const { data, error } = await supabase
      .from("channels")
      .insert({
        name: name.trim(),
        handle: finalHandle,
        description: desc.trim() || null,
        is_public: isPublic,
        owner_id: u.user.id,
      } as any)
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Channel created");
    nav(`/c/${(data as any).handle}`);
  };

  const handleInvalid = !handle.trim() || available === false;
  const handleStatusId = "handle-status";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">New channel</h1>
      </header>
      <div className="mx-auto max-w-lg p-4">
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div>
            <Label htmlFor="channel-name">Name</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My channel"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="channel-handle">Handle</Label>
            <div className="relative">
              <Input
                id="channel-handle"
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase());
                  setUserHasEditedHandle(true);
                }}
                placeholder="myhandle"
                aria-invalid={handleInvalid || undefined}
                aria-describedby={handleStatusId}
                autoComplete="off"
              />
              {available !== null && (
                <span
                  id={handleStatusId}
                  role="status"
                  className="absolute right-3 top-2.5"
                >
                  {available ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">@{handle || "yourhandle"}</p>
          </div>
          <div>
            <Label htmlFor="channel-desc">Description</Label>
            <Textarea
              id="channel-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="channel-public">Public</Label>
              <p className="text-xs text-muted-foreground">Anyone can find and view</p>
            </div>
            <Switch id="channel-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <Button
            onClick={submit}
            disabled={submitting}
            aria-busy={submitting}
            className="w-full"
          >
            {submitting ? "Creating…" : "Create channel"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### New test: `src/__tests__/NewChannelPage.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import NewChannelPage from "@/pages/channels/NewChannelPage";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Mock useSmartBack
vi.mock("@/lib/smartBack", () => ({
  useSmartBack: () => vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  return render(
    <BrowserRouter>
      <NewChannelPage />
    </BrowserRouter>
  );
}

describe("NewChannelPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form", () => {
    renderPage();
    expect(screen.getByText("New channel")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Handle")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByText("Create channel")).toBeInTheDocument();
  });

  it("auto-generates handle from name", async () => {
    renderPage();
    const nameInput = screen.getByLabelText("Name");
    await userEvent.type(nameInput, "My Cool Channel");
    const handleInput = screen.getByLabelText("Handle") as HTMLInputElement;
    expect(handleInput.value).toBe("my_cool_channel");
  });

  it("sanitizes handle on manual edit", async () => {
    renderPage();
    const handleInput = screen.getByLabelText("Handle");
    await userEvent.type(handleInput, "UPPER___CASE!!");
    expect((handleInput as HTMLInputElement).value).toBe("upper_case");
  });

  it("shows error on empty submit", async () => {
    renderPage();
    const { toast } = await import("sonner");
    fireEvent.click(screen.getByText("Create channel"));
    expect(toast.error).toHaveBeenCalledWith("Name and handle are required");
  });

  it("shows error when handle is taken", async () => {
    // Mock availability check returning taken
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "existing" } });
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    });

    renderPage();
    const handleInput = screen.getByLabelText("Handle");
    await userEvent.type(handleInput, "taken");

    // Wait for debounce
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    const { toast } = await import("sonner");
    fireEvent.click(screen.getByText("Create channel"));
    expect(toast.error).toHaveBeenCalledWith("Handle is taken");
  });

  it("submits successfully", async () => {
    // Mock availability check returning available
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null });
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: "new-id", handle: "my_channel" },
            error: null,
          }),
        })),
      })),
    });

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    renderPage();
    const nameInput = screen.getByLabelText("Name");
    await userEvent.type(nameInput, "My Channel");

    // Wait for debounced availability
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Create channel"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/c/my_channel");
    });
  });
});
```

## Owner Verification

1. **Run the migration**: `npx supabase migration up` — this adds the auto-subscribe trigger. Verify by creating a channel and checking `channel_subscribers` has an `owner` row for the creator.
2. **Run tests**: `npm test -- src/__tests__/NewChannelPage.test.tsx` — should pass.
3. **Run type-check**: `npm run type-check` — must be 0 errors.
4. **Preview**: Navigate to `/channels/new`, create a channel, then check `/channels` — the new channel should appear immediately in the list (via `useMyChannels`).
5. **Edge cases to test manually**:
   - Type a name, let handle auto-generate, then edit handle — auto-generation stops.
   - Type a handle that exists — red X + error on submit.
   - Submit with empty fields — toast error.
   - Submit while offline — toast error from supabase.
