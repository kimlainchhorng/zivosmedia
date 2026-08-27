import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

import HotelAskChat from "@/components/lodging/HotelAskChat";

describe("HotelAskChat", () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  it("opens as a named modal, focuses the labelled question field, and restores focus on Escape", async () => {
    render(<HotelAskChat storeId="hotel-1" storeName="ZIVO Riverside" />);

    const trigger = screen.getByRole("button", {
      name: "Ask AI about this property",
    });
    fireEvent.click(trigger);

    expect(
      await screen.findByRole("dialog", { name: "Ask about this stay" }),
    ).toBeInTheDocument();

    const question = screen.getByRole("textbox", {
      name: "Question about this property",
    });
    await waitFor(() => expect(question).toHaveFocus());

    expect(
      screen.getByRole("button", { name: "Close hotel assistant" }),
    ).toHaveClass("h-11", "w-11");
    expect(
      screen.getByRole("button", { name: "What's the cheapest room?" }),
    ).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "Send question" })).toHaveClass(
      "h-11",
      "w-11",
    );

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("labels speakers and retries after prior conversation without duplicating the guest message", async () => {
    mocks.invoke
      .mockResolvedValueOnce({
        data: { answer: "The twin room is the current lowest-priced fit." },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Assistant temporarily unavailable" },
      })
      .mockResolvedValueOnce({
        data: { answer: "Breakfast is listed per room." },
        error: null,
      });

    render(<HotelAskChat storeId="hotel-1" storeName="ZIVO Riverside" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Ask AI about this property" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "What's the cheapest room?" }),
    );

    expect(
      await screen.findByText(
        "The twin room is the current lowest-priced fit.",
      ),
    ).toBeInTheDocument();
    const conversation = screen.getByRole("log", {
      name: "Hotel assistant conversation",
    });
    expect(within(conversation).getByText("You said:")).toBeInTheDocument();
    expect(
      within(conversation).getByText("Hotel assistant said:"),
    ).toBeInTheDocument();

    const questionField = screen.getByRole("textbox", {
      name: "Question about this property",
    });
    fireEvent.change(questionField, {
      target: { value: "Is breakfast included?" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Ask about this stay" }));

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("Assistant temporarily unavailable");
    expect(error.closest('[role="log"]')).toBeNull();
    expect(screen.getAllByText("Is breakfast included?")).toHaveLength(1);

    fireEvent.change(questionField, {
      target: { value: "Does the property offer parking?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Retry question" }));

    expect(
      await screen.findByText("Breakfast is listed per room."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Is breakfast included?")).toHaveLength(1);
    expect(questionField).toHaveValue("Does the property offer parking?");
    await waitFor(() => expect(questionField).toHaveFocus());
    expect(mocks.invoke).toHaveBeenCalledTimes(3);

    for (const call of mocks.invoke.mock.calls) {
      expect(call[0]).toBe("hotel-ask");
      expect(call[1].body).toMatchObject({
        store_id: "hotel-1",
        provider: "deepseek",
        model: "deepseek-v4-flash",
      });
    }

    expect(mocks.invoke.mock.calls[0][1].body).toMatchObject({
      question: "What's the cheapest room?",
      history: [],
    });
    const priorConversation = [
      { role: "user", content: "What's the cheapest room?" },
      {
        role: "assistant",
        content: "The twin room is the current lowest-priced fit.",
      },
    ];
    expect(mocks.invoke.mock.calls[1][1].body).toMatchObject({
      question: "Is breakfast included?",
      history: priorConversation,
    });
    expect(mocks.invoke.mock.calls[2][1].body).toMatchObject({
      question: "Is breakfast included?",
      history: priorConversation,
    });
  });

  it("keeps focus inside the dialog when it is reopened while an answer is loading", async () => {
    let resolveAnswer: ((value: unknown) => void) | undefined;
    mocks.invoke.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAnswer = resolve;
        }),
    );

    render(<HotelAskChat storeId="hotel-1" storeName="ZIVO Riverside" />);
    const trigger = screen.getByRole("button", {
      name: "Ask AI about this property",
    });
    fireEvent.click(trigger);

    const question = await screen.findByRole("textbox", {
      name: "Question about this property",
    });
    fireEvent.change(question, { target: { value: "Is parking available?" } });
    fireEvent.submit(screen.getByRole("form", { name: "Ask about this stay" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Thinking…");

    fireEvent.click(
      screen.getByRole("button", { name: "Close hotel assistant" }),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: "Ask about this stay",
    });
    const close = screen.getByRole("button", {
      name: "Close hotel assistant",
    });
    await waitFor(() => {
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
      expect(close).toHaveFocus();
    });

    resolveAnswer?.({
      data: { answer: "Yes, parking is available." },
      error: null,
    });
    expect(
      await screen.findByText("Yes, parking is available."),
    ).toBeInTheDocument();
  });
});
