import { describe, expect, it } from "vitest";

import { ZIVO_CHAT_HOME_PATH, isZivoChatHost, isZivoChatPath } from "./zivoChatDomain";

describe("zivo chat domain config", () => {
  it("recognizes apex and www zivoschat hosts only", () => {
    expect(isZivoChatHost("zivoschat.com")).toBe(true);
    expect(isZivoChatHost("www.zivoschat.com")).toBe(true);
    expect(isZivoChatHost("ZIVOSCHAT.COM")).toBe(true);
    expect(isZivoChatHost("zivosmedia.com")).toBe(false);
    expect(isZivoChatHost("zivosoftware.com")).toBe(false);
    expect(isZivoChatHost("preview.zivoschat.com")).toBe(false);
  });

  it("uses /chat as the dedicated chat home", () => {
    expect(ZIVO_CHAT_HOME_PATH).toBe("/chat");
  });

  it("allows chat routes and blocks unrelated product routes", () => {
    expect(isZivoChatPath("/chat")).toBe(true);
    expect(isZivoChatPath("/chat/contacts")).toBe(true);
    expect(isZivoChatPath("/chat/settings/privacy")).toBe(true);
    expect(isZivoChatPath("/connect/chat")).toBe(true);
    expect(isZivoChatPath("/direct/t/user-123")).toBe(true);
    expect(isZivoChatPath("/chat-themes")).toBe(true);
    expect(isZivoChatPath("/feed")).toBe(false);
    expect(isZivoChatPath("/business")).toBe(false);
    expect(isZivoChatPath("/profile")).toBe(false);
  });
});
