import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("refund and support trust intake", () => {
  it("routes wallet refund requests through the protected refund Edge Function", () => {
    const wallet = read("src/pages/account/WalletPage.tsx");

    expect(wallet).toMatch(/functions\.invoke\(\s*"refund-request-submit"/);
    expect(wallet).toContain("reason: refundReason");
    expect(wallet).toContain("transaction_id: refundTx.id");
    expect(wallet).toContain("amount: Math.abs(Number(refundTx.amount))");
    expect(wallet).not.toMatch(/from\("feedback_submissions"\)[\s\S]{0,160}\.insert/);
  });

  it("routes personal help tickets through the protected support Edge Function", () => {
    const helpPage = read("src/pages/app/personal/PersonalHelpPage.tsx");

    expect(helpPage).toContain('functions.invoke("support-ticket-submit"');
    expect(helpPage).toContain("subject");
    expect(helpPage).toContain("message");
    expect(helpPage).toContain('source: "personal_help"');
    expect(helpPage).not.toMatch(/from\("feedback_submissions"\)[\s\S]{0,160}\.insert/);
  });

  it("keeps refund submission server-validated, authenticated, audited, and rate-limited", () => {
    const refundSubmit = read("supabase/functions/refund-request-submit/index.ts");

    expect(refundSubmit).toContain('withSecurity(\n    "refund-request-submit"');
    expect(refundSubmit).toContain("requireUser(req)");
    expect(refundSubmit).toContain("requireUserNotBlocked(userId)");
    expect(refundSubmit).toContain("getServiceRoleClient()");
    expect(refundSubmit).toContain("REASONS");
    for (const reason of [
      "wrong_charge",
      "duplicate",
      "service_not_received",
      "unauthorized",
      "other",
    ]) {
      expect(refundSubmit).toContain(`"${reason}"`);
    }
    expect(refundSubmit).toContain("cleanAmount(body.amount)");
    expect(refundSubmit).toContain('.from("feedback_submissions")');
    expect(refundSubmit).toContain('category: "refund_request"');
    expect(refundSubmit).toContain('action: "refund_request_submitted"');
    expect(refundSubmit).toContain("strictCors: true");
    expect(refundSubmit).toContain('rateLimit: "payment"');
    expect(refundSubmit).toContain("blockNetworkRiskAt: 90");
  });

  it("keeps support ticket submission server-validated, authenticated, audited, and rate-limited", () => {
    const supportSubmit = read("supabase/functions/support-ticket-submit/index.ts");

    expect(supportSubmit).toContain('withSecurity(\n    "support-ticket-submit"');
    expect(supportSubmit).toContain("requireUser(req)");
    expect(supportSubmit).toContain("requireUserNotBlocked(userId)");
    expect(supportSubmit).toContain("getServiceRoleClient()");
    expect(supportSubmit).toContain("cleanEmail(body.email) ?? cleanEmail(claims.email)");
    expect(supportSubmit).toContain("source = cleanText(body.source, MAX_TEXT)");
    expect(supportSubmit).toContain("ticket_number: ticketNumber");
    expect(supportSubmit).toContain('.from("feedback_submissions")');
    expect(supportSubmit).toContain('category: "support_ticket"');
    expect(supportSubmit).toContain('action: "support_ticket_submitted"');
    expect(supportSubmit).toContain("strictCors: true");
    expect(supportSubmit).toContain('allowedMethods: ["POST"]');
    expect(supportSubmit).toContain('rateLimit: "api_general"');
    expect(supportSubmit).toContain("blockNetworkRiskAt: 80");
  });

  it("routes live chat human escalation through the protected support Edge Function", () => {
    const liveChat = read("src/components/shared/LiveChatWidget.tsx");

    expect(liveChat).toContain('functions.invoke("support-ticket-submit"');
    expect(liveChat).toContain("ticket_number");
    expect(liveChat).toContain('source: `live_chat:${escalationCategory}`');
    expect(liveChat).not.toMatch(/from\("support_tickets"\)[\s\S]{0,240}\.insert/);
  });

  it("routes standalone support ticket creation through the protected support Edge Function", () => {
    const newTicket = read("src/pages/support/CreateSupportTicketPage.tsx");

    expect(newTicket).toContain('functions.invoke("support-ticket-submit"');
    expect(newTicket).toContain('source: `support_new:${category}:${priority}`');
    expect(newTicket).toContain("ticket_number");
    expect(newTicket).not.toMatch(/from\("support_tickets"\)[\s\S]{0,260}\.insert/);
  });

  it("routes support ticket chat deletion through the protected manage Edge Function", () => {
    const chatHub = read("src/pages/ChatHubPage.tsx");
    const manage = read("supabase/functions/support-ticket-manage/index.ts");
    const gate = read("supabase/migrations/20260601233000_support_tickets_customer_manage_gate.sql");

    expect(chatHub).toContain('functions.invoke("support-ticket-manage"');
    expect(chatHub).not.toMatch(/from\("support_tickets"\)[\s\S]{0,260}\.delete/);
    expect(manage).toContain('withSecurity(\n    "support-ticket-manage"');
    expect(manage).toContain('allowedMethods: ["POST"]');
    expect(manage).toContain("requireUser(req)");
    expect(manage).toContain('.from("support_tickets")');
    expect(manage).toContain('.delete()');
    expect(manage).toContain('.eq("user_id", userId)');
    expect(gate).toContain('DROP POLICY IF EXISTS "Users manage own tickets"');
    expect(gate).toContain('CREATE POLICY "Users view own tickets"');
  });
});
