import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Chat outbox owner boundary", () => {
  it("threads the authenticated owner through every durable outbox surface", () => {
    const personal = read("src/components/chat/PersonalChat.tsx");
    const group = read("src/components/chat/GroupChat.tsx");
    const share = read("src/components/chat/ShareToChatSheet.tsx");
    const flusher = read("src/components/chat/OutboxFlusher.tsx");

    expect(personal).toContain("outboxEnqueue(user.id,");
    expect(personal).toContain("outboxList(user.id,");
    expect(personal).toContain("outboxSubscribe(user.id,");
    expect(personal).toContain("<OutboxPendingBadge ownerId={user.id}");

    expect(group).toContain("outboxEnqueue(user.id,");
    expect(group).toContain("outboxList(user.id,");
    expect(group).toContain("outboxSubscribe(user.id,");
    expect(group).toContain("<OutboxPendingBadge ownerId={user.id}");

    expect(share).toContain("outboxEnqueue(user.id,");
    expect(flusher).toContain("void flush(ownerId)");
    expect(flusher).toContain("}, [ownerId]);");
  });

  it("revalidates ownership before a manual retry can insert", () => {
    for (const path of [
      "src/components/chat/PersonalChat.tsx",
      "src/components/chat/GroupChat.tsx",
    ]) {
      const source = read(path);
      expect(source).toContain("payload.sender_id !== user.id");
      expect(source).toContain("await supabase.auth.getUser()");
      expect(source).toContain("activeAuth.user?.id !== user.id");
    }
  });

  it("never renders another account's failed optimistic bubble during an auth switch", () => {
    for (const path of [
      "src/components/chat/PersonalChat.tsx",
      "src/components/chat/GroupChat.tsx",
    ]) {
      const source = read(path);
      expect(source).toContain(
        'msg._upload_status === "failed" && msg.sender_id !== user?.id',
      );
    }
  });
});
