import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import ChatComposerHub from "./ChatComposerHub";

vi.mock("@/contexts/ZivoPlusContext", () => ({
  useZivoPlus: () => ({ isPlus: true, plan: "chat" }),
}));

vi.mock("@/hooks/useZivoOFMode", () => ({
  useZivoOFMode: () => ({ isOFMode: false }),
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

describe("ChatComposerHub", () => {
  it("edits and clears the current draft", () => {
    const onDraftTextChange = vi.fn();
    const onClearDraft = vi.fn();

    render(
      <ChatComposerHub
        open
        onOpenChange={vi.fn()}
        source={{ type: "dm", chatId: "peer-1", title: "Alex", canSchedule: true }}
        draftText="hello"
        onDraftTextChange={onDraftTextChange}
        onClearDraft={onClearDraft}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Message..."), { target: { value: "next draft" } });
    expect(onDraftTextChange).toHaveBeenCalledWith("next draft");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onDraftTextChange).toHaveBeenCalledWith("");
    expect(onClearDraft).toHaveBeenCalled();
  });

  it("runs DM schedule actions and closes the hub", () => {
    const onSchedule = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ChatComposerHub
        open
        onOpenChange={onOpenChange}
        source={{ type: "dm", chatId: "peer-1", title: "Alex", canSchedule: true }}
        draftText="send this later"
        onDraftTextChange={vi.fn()}
        onClearDraft={vi.fn()}
        onSchedule={onSchedule}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));
    expect(onSchedule).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables group scheduled send", () => {
    const onSchedule = vi.fn();

    render(
      <ChatComposerHub
        open
        onOpenChange={vi.fn()}
        source={{ type: "group", chatId: "group-1", title: "Team", canSchedule: false }}
        draftText="group draft"
        onDraftTextChange={vi.fn()}
        onClearDraft={vi.fn()}
        onSchedule={onSchedule}
      />,
    );

    expect(screen.getByRole("button", { name: "Schedule (DMs only for now)" })).toBeDisabled();
    expect(onSchedule).not.toHaveBeenCalled();
  });
});
