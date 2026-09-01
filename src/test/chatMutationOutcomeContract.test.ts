import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );

describe("chat mutation outcome contracts", () => {
  it("announces contact removal only after an explicit successful result", () => {
    const contactsPage = read("src/pages/chat/ContactsPage.tsx");
    const handlerStart = contactsPage.indexOf(
      "const result = await remove(c.contact_user_id);",
    );
    const handler = contactsPage.slice(
      handlerStart,
      contactsPage.indexOf('className="text-destructive', handlerStart),
    );

    expect(handlerStart).toBeGreaterThan(-1);
    expect(handler).toContain("if (!result.ok) {");
    expect(handler).toContain(
      'toast.error(result.error || "Couldn\'t remove contact. Please try again.");',
    );
    expect(handler).toMatch(/if \(!result\.ok\) \{[\s\S]*?return;[\s\S]*?\}/);
    expect(handler.indexOf('toast.success("Contact removed")')).toBeGreaterThan(
      handler.indexOf("if (!result.ok)"),
    );
  });
});
