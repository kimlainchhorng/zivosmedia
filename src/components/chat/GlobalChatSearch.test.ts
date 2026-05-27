import { describe, expect, it } from "vitest";
import { buildGlobalMessageHitPath, mergeGlobalMessageHits, type MessageHit } from "./globalChatSearchModel";

describe("GlobalChatSearch routing", () => {
  it("routes DM message hits through /chat with partner and message params", () => {
    const outbound: MessageHit = {
      sourceType: "dm",
      id: "dm-message",
      sender_id: "me",
      receiver_id: "peer",
      message: "hello",
      created_at: "2026-05-27T10:00:00Z",
    };
    const inbound: MessageHit = {
      ...outbound,
      id: "dm-message-2",
      sender_id: "peer",
      receiver_id: "me",
    };

    expect(buildGlobalMessageHitPath(outbound, "me")).toBe("/chat?with=peer&msg=dm-message");
    expect(buildGlobalMessageHitPath(inbound, "me")).toBe("/chat?with=peer&msg=dm-message-2");
  });

  it("routes group message hits through /chat with group and message params", () => {
    const hit: MessageHit = {
      sourceType: "group",
      id: "group-message",
      sender_id: "member",
      group_id: "group-1",
      group_name: "Team",
      message: "hello",
      created_at: "2026-05-27T10:00:00Z",
    };

    expect(buildGlobalMessageHitPath(hit, "me")).toBe("/chat?group=group-1&msg=group-message");
  });

  it("merges DM and group message hits by newest first", () => {
    const hits = mergeGlobalMessageHits([
      {
        sourceType: "dm",
        id: "older-dm",
        sender_id: "me",
        receiver_id: "peer",
        message: "older direct",
        created_at: "2026-05-27T10:00:00Z",
      },
    ], [
      {
        sourceType: "group",
        id: "newer-group",
        sender_id: "member",
        group_id: "group-1",
        group_name: "Team",
        message: "newer group",
        created_at: "2026-05-27T11:00:00Z",
      },
    ]);

    expect(hits.map((hit) => `${hit.sourceType}:${hit.id}`)).toEqual([
      "group:newer-group",
      "dm:older-dm",
    ]);
  });
});
