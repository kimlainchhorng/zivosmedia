// Fixed operational message only. Never forward probe output, close codes or credentials.
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
if (!token || !chatId) {
  console.error("Telegram alert not delivered: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required.");
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ chat_id: chatId, text: "Zivo - Media Realtime handshake probe failed. Live updates may be down for signed-in users. Check GitHub Actions: Realtime monitor." }),
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error("delivery failed");
    console.log("Telegram failure alert delivered.");
  } catch {
    console.error("Telegram failure alert could not be delivered.");
    process.exitCode = 1;
  }
}
