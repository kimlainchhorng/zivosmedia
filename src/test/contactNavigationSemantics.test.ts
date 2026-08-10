import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/pages/Contact.tsx"), "utf8");

it("keeps the public Contact back control as one native interactive element", () => {
  expect(source).toMatch(/<Button asChild[\s\S]*<Link to="\/" aria-label="Go back">/);
  expect(source).not.toMatch(/<Link to="\/">\s*<Button/);
});
