// Telegram is how this company gets told things — never SMS, never email.
// The bot is @daniel360bot; the chat is the operations group.
//
// A send that fails must never take down the thing that triggered it, so the
// caller gets a boolean back and decides what to say. It returns false rather
// than throwing, but it does NOT pretend to have sent: a shop-floor worker who
// taps "order" has to know whether the message actually left.

export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("[notify] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("[notify] telegram", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify] telegram failed:", err);
    return false;
  }
}

// Telegram's HTML mode only allows a few tags; anything else in the text has
// to be escaped or the whole message is rejected. Item names carry quotes and
// inches marks, so this is not theoretical.
export function tgEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
