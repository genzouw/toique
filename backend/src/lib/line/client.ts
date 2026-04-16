export type LineQuickReplyItem = {
  type: 'action';
  action: {
    type: 'postback' | 'message';
    label: string;
    data?: string;
    text?: string;
    displayText?: string;
  };
};

export type LineQuickReply = {
  items: LineQuickReplyItem[];
};

export type LineTextMessage = {
  type: 'text';
  text: string;
  quickReply?: LineQuickReply;
};

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

export type PushMessageInput = {
  accessToken: string;
  to: string; // LINE User ID
  messages: LineMessage[];
};

export async function pushMessage({
  accessToken,
  to,
  messages,
}: PushMessageInput): Promise<void> {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE push failed: ${res.status} ${text}`);
  }
}
