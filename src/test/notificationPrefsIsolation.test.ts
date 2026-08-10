import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/pages/NotificationPrefsPage.tsx"),
  "utf8",
);

it("scopes device-local notification choices to the authenticated account", () => {
  expect(source).toContain('const STORAGE_KEY_PREFIX = "zivo:notif-prefs:v1";');
  expect(source).toContain("function storageKey(userId: string | null | undefined): string | null");
  expect(source).toContain("const userId = user?.id ?? null;");
  expect(source).toContain("setDisabled(loadDisabled(userId));");
  expect(source).toContain("saveDisabled(userId, next);");
  expect(source).not.toContain('localStorage.getItem(STORAGE_KEY)');
});

it("keeps notification state on the native control and avoids dead category actions", () => {
  expect(source).toContain("const configurable = list.some((t) => t.can_be_disabled);");
  expect(source).toContain("{configurable ? (");
  expect(source).toContain('aria-pressed={locked ? undefined : !isOff}');
  expect(source).not.toContain('aria-pressed={!isOff}');
});
