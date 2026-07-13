export type ZivoAiProvider = "auto" | "deepseek" | "claude";
export type ZivoAiChatRole = "user" | "assistant" | "system";

export type ZivoAiChatMessage = {
  role: ZivoAiChatRole;
  content: string;
};

export type ZivoAiChatMode = "support" | "travel" | "site-builder";

type ZivoAiModel =
  | "deepseek-v4-flash"
  | "deepseek-v4-pro"
  | "claude-sonnet-4-6"
  | "claude-opus-4-8"
  | "claude-haiku-4-5"
  | "claude-fable-5";

type StreamZivoAiChatOptions = {
  messages: ZivoAiChatMessage[];
  mode?: ZivoAiChatMode;
  provider?: ZivoAiProvider;
  model?: ZivoAiModel;
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
};

type CompleteZivoAiChatOptions = {
  messages: ZivoAiChatMessage[];
  mode?: ZivoAiChatMode;
  provider?: ZivoAiProvider;
  model?: ZivoAiModel;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
};

const WORKER_API_ORIGIN = (import.meta.env.VITE_ZIVO_WORKER_API_ORIGIN || "").replace(/\/$/, "");
const AI_CHAT_ENDPOINT = `${WORKER_API_ORIGIN}/api/ai/chat`;

export async function streamZivoAiChat({
  messages,
  mode = "travel",
  provider = "deepseek",
  model,
  signal,
  onDelta,
}: StreamZivoAiChatOptions) {
  const resp = await fetch(AI_CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      provider,
      model,
      stream: true,
      messages: messages.filter((message) => message.role !== "system"),
    }),
    signal,
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({} as { error?: string }));
    throw new Error(errorData.error || "AI chat failed");
  }

  if (!resp.body) {
    throw new Error("AI response body is empty");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processLine = (line: string) => {
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) return;

    const jsonStr = line.slice(6).trim();
    if (!jsonStr || jsonStr === "[DONE]") return;

    const parsed = JSON.parse(jsonStr);
    const delta = parsed.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta.length > 0) {
      onDelta(delta);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      try {
        processLine(line);
      } catch {
        buffer = `${line}\n${buffer}`;
        break;
      }
    }
  }

  if (buffer.trim()) {
    for (const line of buffer.split("\n")) {
      try {
        processLine(line);
      } catch {
        // Ignore incomplete trailing chunks after the stream closes.
      }
    }
  }
}

export async function completeZivoAiChat({
  messages,
  mode = "travel",
  provider = "deepseek",
  model,
  maxTokens = 900,
  temperature = 0.4,
  signal,
}: CompleteZivoAiChatOptions) {
  const resp = await fetch(AI_CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      provider,
      model,
      stream: false,
      messages: messages.filter((message) => message.role !== "system"),
      max_tokens: maxTokens,
      temperature,
    }),
    signal,
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({} as { error?: string }));
    throw new Error(errorData.error || "AI chat failed");
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI returned an empty response");
  }

  return content;
}
