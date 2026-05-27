import { describe, expect, it } from "vitest";
import { buildComposerActions, getComposerDraftPartnerId, type ChatComposerSource } from "./chatComposerHubModel";

describe("chatComposerHubModel", () => {
  const dmSource: ChatComposerSource = { type: "dm", chatId: "peer-1", title: "Alex", canSchedule: true };
  const groupSource: ChatComposerSource = { type: "group", chatId: "group-1", title: "Team", canSchedule: false };

  it("keeps legacy DM draft keys and namespaces group draft keys", () => {
    expect(getComposerDraftPartnerId(dmSource)).toBe("peer-1");
    expect(getComposerDraftPartnerId(groupSource)).toBe("group:group-1");
  });

  it("enables scheduled send only for DM drafts with text", () => {
    const dmActions = buildComposerActions({
      source: dmSource,
      hasDraftText: true,
      enabledActionIds: { schedule: true, scheduled: true },
    });
    expect(dmActions.find((action) => action.id === "schedule")).toMatchObject({ enabled: true });
    expect(dmActions.find((action) => action.id === "scheduled")).toMatchObject({ enabled: true });

    const emptyDraftActions = buildComposerActions({
      source: dmSource,
      hasDraftText: false,
      enabledActionIds: { schedule: true },
    });
    expect(emptyDraftActions.find((action) => action.id === "schedule")).toMatchObject({
      enabled: false,
      disabledReason: "Write a message first",
    });
  });

  it("marks group scheduling as DM-only", () => {
    const actions = buildComposerActions({
      source: groupSource,
      hasDraftText: true,
      enabledActionIds: { schedule: true, scheduled: true },
    });

    expect(actions.find((action) => action.id === "schedule")).toMatchObject({
      enabled: false,
      disabledReason: "DMs only for now",
    });
    expect(actions.find((action) => action.id === "scheduled")).toMatchObject({
      enabled: false,
      disabledReason: "DMs only for now",
    });
  });
});
