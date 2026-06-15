#!/usr/bin/env node
/**
 * Minimal DeepSeek MCP server (stdio, zero dependencies).
 *
 * Exposes a single `ask_deepseek` tool so Claude Code can consult DeepSeek
 * (a separate LLM) mid-task — for a second opinion, a code review, brainstorming
 * alternatives, or drafting boilerplate. DeepSeek's API is OpenAI-compatible.
 *
 * The API key is read at call time from, in order:
 *   1. process.env.DEEPSEEK_API_KEY
 *   2. a plain-text file at  <home>/.deepseek-api-key   (e.g. C:\Users\chhor\.deepseek-api-key)
 * The key file lives OUTSIDE this repo (and outside OneDrive), so it is never
 * committed to git or synced to GitHub.
 *
 * Protocol: newline-delimited JSON-RPC 2.0 over stdio. Only JSON-RPC is written
 * to stdout; all logging goes to stderr.
 */
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import readline from "node:readline";

const API_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const KEY_FILE = path.join(os.homedir(), ".deepseek-api-key");

function log(...args) {
  process.stderr.write(`[deepseek-mcp] ${args.join(" ")}\n`);
}

function readApiKey() {
  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim()) {
    return process.env.DEEPSEEK_API_KEY.trim();
  }
  try {
    const fromFile = readFileSync(KEY_FILE, "utf8").trim();
    if (fromFile) return fromFile;
  } catch {
    /* file missing — fall through */
  }
  return null;
}

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}
function ok(id, result) {
  send({ jsonrpc: "2.0", id, result });
}
function fail(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

const TOOLS = [
  {
    name: "ask_deepseek",
    description:
      "Consult DeepSeek (a separate LLM) for a second opinion, a code review, alternative approaches, or to draft boilerplate. Returns DeepSeek's text answer. Use model 'deepseek-reasoner' for hard reasoning/math/algorithms; 'deepseek-chat' (default) for everything else. DeepSeek has no access to this repo, so include any code or context it needs in the prompt.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The question or task for DeepSeek. Include all needed context/code inline." },
        system: { type: "string", description: "Optional system instruction to steer DeepSeek's role or output format." },
        model: {
          type: "string",
          enum: ["deepseek-chat", "deepseek-reasoner"],
          description: "Which DeepSeek model to use. Defaults to deepseek-chat.",
        },
      },
      required: ["prompt"],
    },
  },
];

async function callDeepSeek({ prompt, system, model }) {
  const apiKey = readApiKey();
  if (!apiKey) {
    return {
      isError: true,
      text:
        `No DeepSeek API key found. Set the DEEPSEEK_API_KEY environment variable, ` +
        `or put your key in this file:\n  ${KEY_FILE}`,
    };
  }
  if (typeof fetch !== "function") {
    return { isError: true, text: "This Node version has no global fetch(); Node 18+ is required." };
  }
  const messages = [];
  if (system && String(system).trim()) messages.push({ role: "system", content: String(system) });
  messages.push({ role: "user", content: String(prompt ?? "") });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600_000);
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model || DEFAULT_MODEL, messages, stream: false, max_tokens: 393216 }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return { isError: true, text: `DeepSeek API error ${resp.status}: ${body.slice(0, 800)}` };
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    const usage = data?.usage ? ` (tokens: ${data.usage.prompt_tokens}+${data.usage.completion_tokens})` : "";
    return { isError: false, text: (text ?? "(DeepSeek returned no content)") + usage };
  } catch (err) {
    const reason = err?.name === "AbortError" ? "request timed out after 600s" : String(err?.message || err);
    return { isError: true, text: `DeepSeek request failed: ${reason}` };
  } finally {
    clearTimeout(timeout);
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on("line", async (raw) => {
  const line = raw.trim();
  if (!line) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return; // ignore non-JSON noise
  }
  const { id, method, params } = msg;
  try {
    switch (method) {
      case "initialize":
        ok(id, {
          protocolVersion: params?.protocolVersion || "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "deepseek", version: "1.0.0" },
        });
        break;
      case "notifications/initialized":
      case "initialized":
        break; // notification — no response
      case "tools/list":
        ok(id, { tools: TOOLS });
        break;
      case "tools/call": {
        if (params?.name !== "ask_deepseek") {
          fail(id, -32601, `Unknown tool: ${params?.name}`);
          break;
        }
        const { isError, text } = await callDeepSeek(params?.arguments || {});
        ok(id, { content: [{ type: "text", text }], isError });
        break;
      }
      case "ping":
        ok(id, {});
        break;
      default:
        if (id !== undefined && id !== null) fail(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    log("handler error:", String(err?.message || err));
    if (id !== undefined && id !== null) fail(id, -32603, String(err?.message || err));
  }
});

log(`ready — key source: ${process.env.DEEPSEEK_API_KEY ? "env" : KEY_FILE}`);
