import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ticketListSource = readFileSync(
  path.join(process.cwd(), "src/pages/support/UserSupportTicketsPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const requestFormSource = readFileSync(
  path.join(process.cwd(), "src/components/support/SupportRequestForm.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("support ticket truthfulness", () => {
  it("keeps a failed ticket read distinct from a real empty list", () => {
    expect(ticketListSource).toContain("isError,");
    expect(ticketListSource).toContain('role="alert"');
    expect(ticketListSource).toContain("Tickets unavailable");
    expect(ticketListSource).toContain("onClick={() => void refetch()}");
    expect(ticketListSource).toMatch(
      /isError \? \([\s\S]*Tickets unavailable[\s\S]*\) : filteredTickets\.length > 0/,
    );
  });

  it("does not promise an unsupported response time", () => {
    expect(ticketListSource).not.toContain("24 hours");
    expect(requestFormSource).not.toContain("24 hours");
    expect(ticketListSource).toContain("Ticket updates appear here");
    expect(requestFormSource).toMatch(/track updates in\s+Support Tickets/);
  });

  it("keeps urgent safety guidance actionable", () => {
    expect(ticketListSource).toContain('to="/safety"');
    expect(ticketListSource).toContain("Safety Center");
  });

  it("returns to the prior app screen with a safe direct-entry fallback", () => {
    expect(ticketListSource).toContain("useNavigate()");
    expect(ticketListSource).toContain("window.history.state?.idx");
    expect(ticketListSource).toContain("navigate(-1)");
    expect(ticketListSource).toContain('navigate("/app", { replace: true })');
    expect(ticketListSource).toContain("onClick={handleBack}");
    expect(ticketListSource).toContain('aria-label="Go back"');
    expect(ticketListSource).not.toContain('<Link to="/app">');
  });

  it("connects every support request label to its required control", () => {
    expect(requestFormSource).toContain("useId()");
    expect(requestFormSource).toContain("<Label htmlFor={categoryId}>");
    expect(requestFormSource).toContain(
      '<SelectTrigger id={categoryId} aria-required="true">',
    );
    expect(requestFormSource).toContain("<Label htmlFor={subjectId}>");
    expect(requestFormSource).toContain("id={subjectId}");
    expect(requestFormSource).toContain('name="subject"');
    expect(requestFormSource).toContain("<Label htmlFor={descriptionId}>");
    expect(requestFormSource).toContain("id={descriptionId}");
    expect(requestFormSource).toContain('name="description"');
    expect(requestFormSource).toContain("aria-describedby={descriptionHelpId}");
    expect(requestFormSource).toContain(
      "Do not include passwords, one-time codes, or full card numbers.",
    );
    expect(requestFormSource.match(/\n\s+required\n/g)).toHaveLength(2);
  });
});
