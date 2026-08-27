/**
 * HotelAskChat — On-page Q&A for a hotel detail page. Floating CTA + slide-up
 * chat panel that answers questions grounded in the property's live data via
 * the `hotel-ask` edge function.
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  storeId: string;
  storeName?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What's the cheapest room?",
  "Is breakfast included?",
  "What's the cancellation policy?",
  "Are pets allowed?",
  "Check-in and check-out times?",
];

export default function HotelAskChat({ storeId, storeName }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);
  const [restoreInputFocusAfterRetry, setRestoreInputFocusAfterRetry] =
    useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo?.({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open || loading || !restoreInputFocusAfterRetry) return;
    inputRef.current?.focus();
    setRestoreInputFocusAfterRetry(false);
  }, [loading, open, restoreInputFocusAfterRetry]);

  const ask = async (question: string, appendUserMessage = true) => {
    const trimmed = question.trim();
    if (trimmed.length < 2 || loading) return;
    setError(null);
    setRetryQuestion(null);
    if (appendUserMessage) setInput("");
    setLoading(true);
    const currentQuestionIsLastMessage =
      messages.at(-1)?.role === "user" && messages.at(-1)?.content === trimmed;
    const requestHistory =
      appendUserMessage || !currentQuestionIsLastMessage
        ? messages
        : messages.slice(0, -1);
    const nextHistory: Message[] = appendUserMessage
      ? [...messages, { role: "user", content: trimmed }]
      : messages;
    setMessages(nextHistory);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "hotel-ask",
        {
          body: {
            store_id: storeId,
            question: trimmed,
            history: requestHistory.slice(-8),
            provider: "deepseek",
            model: "deepseek-v4-flash",
          },
        },
      );
      if (fnErr) throw new Error(fnErr.message || "Could not reach assistant");
      if (data?.error) throw new Error(data.error);
      const answer = String(data?.answer || "").trim();
      if (!answer) throw new Error("Empty response");
      setMessages([...nextHistory, { role: "assistant", content: answer }]);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setRetryQuestion(trimmed);
    } finally {
      setLoading(false);
      if (!appendUserMessage) setRestoreInputFocusAfterRetry(true);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {/* Inline trigger — placed by the parent page near the bottom of the
          content. It remains secondary to the room-booking action. */}
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-12 w-full rounded-2xl border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-violet-500/10 px-4 py-3 text-sm font-bold hover:border-violet-500/40 hover:from-violet-500/15 hover:via-fuchsia-500/15 hover:to-violet-500/15"
        >
          <Sparkles className="text-fuchsia-500" aria-hidden="true" />
          Ask AI about this property
        </Button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            if (loading) return;
            event.preventDefault();
            window.requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="safe-area-bottom fixed bottom-0 left-1/2 z-[60] flex max-h-[88dvh] w-full max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-t-3xl border border-b-0 border-border/60 bg-background shadow-2xl outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full motion-reduce:animate-none sm:bottom-4 sm:rounded-3xl sm:border-b"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30">
                <Sparkles aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogPrimitive.Title className="truncate text-sm font-extrabold leading-tight">
                  Ask about this stay
                </DialogPrimitive.Title>
                {storeName && (
                  <p className="truncate text-[11px] leading-tight text-muted-foreground">
                    {storeName}
                  </p>
                )}
              </div>
            </div>
            <DialogPrimitive.Description className="sr-only">
              Ask questions grounded in this property’s current rooms,
              amenities, policies, and reviews.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close hotel assistant"
                className="h-11 w-11 shrink-0 rounded-full bg-muted/60"
              >
                <X aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <section
                className="rounded-2xl border border-border bg-muted/20 p-4 text-center"
                aria-labelledby="hotel-ask-suggestions-title"
              >
                <MessageSquare
                  className="mx-auto mb-2 h-6 w-6 text-primary"
                  aria-hidden="true"
                />
                <h3
                  id="hotel-ask-suggestions-title"
                  className="mb-1 text-sm font-bold"
                >
                  Ask anything about this property
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Answers are grounded in the live listing data — rooms,
                  amenities, policies, and reviews.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void ask(suggestion)}
                      disabled={loading}
                      className="h-auto min-h-11 whitespace-normal rounded-full px-3 py-2 text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </section>
            )}

            <div
              role="log"
              aria-label="Hotel assistant conversation"
              aria-live="polite"
              aria-relevant="additions text"
              className="space-y-3"
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm " +
                    (message.role === "user"
                      ? "ml-auto bg-foreground text-background"
                      : "bg-muted/60 text-foreground")
                  }
                >
                  <span className="sr-only">
                    {message.role === "user"
                      ? "You said: "
                      : "Hotel assistant said: "}
                  </span>
                  {message.content}
                </div>
              ))}
            </div>

            {loading && (
              <div
                role="status"
                className="inline-flex max-w-[85%] items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-sm"
              >
                <Loader2 className="animate-spin" aria-hidden="true" />
                Thinking…
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="min-w-0 flex-1">{error}</p>
                {retryQuestion && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void ask(retryQuestion, false)}
                    disabled={loading}
                    className="h-11 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    Retry question
                  </Button>
                )}
              </div>
            )}
          </div>

          <form
            aria-label="Ask about this stay"
            className="flex shrink-0 gap-2 border-t border-border/50 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(input);
            }}
          >
            <label htmlFor="hotel-ask-question" className="sr-only">
              Question about this property
            </label>
            <div className="min-w-0 flex-1">
              <Input
                ref={inputRef}
                id="hotel-ask-question"
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask a question…"
                className="h-11 rounded-xl"
                maxLength={400}
                autoComplete="off"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={loading || input.trim().length < 2}
              aria-label={loading ? "Sending question" : "Send question"}
              className="h-11 w-11 shrink-0"
            >
              {loading ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" />
              )}
            </Button>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
