export type LineTextMessage = { type: 'text'; text: string };
export type LineMessage = LineTextMessage; // 拡張余地

export type ReplyMessageInput = {
  accessToken: string;
  replyToken: string;
  messages: LineMessage[];
};

export async function replyMessage({
  accessToken,
  replyToken,
  messages,
}: ReplyMessageInput): Promise<void> {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE reply failed: ${res.status} ${text}`);
  }
}
