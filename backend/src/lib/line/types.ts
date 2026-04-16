// LINE Messaging API Webhook event types
// 公式仕様: https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects
// Phase 1 で扱うイベントのみ最小限定義する

export type LineSource = {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
};

export type LineMessageContent =
  | { type: 'text'; id: string; text: string }
  | { type: 'image'; id: string; contentProvider: { type: string } }
  | { type: 'video'; id: string; contentProvider: { type: string } }
  | { type: 'audio'; id: string; contentProvider: { type: string } }
  | { type: 'file'; id: string; fileName: string; fileSize: number }
  | {
      type: 'location';
      id: string;
      address?: string;
      latitude: number;
      longitude: number;
    }
  | { type: 'sticker'; id: string; packageId: string; stickerId: string };

export type LineMessageEvent = {
  type: 'message';
  replyToken: string;
  source: LineSource;
  timestamp: number;
  message: LineMessageContent;
};

export type LineFollowEvent = {
  type: 'follow';
  replyToken: string;
  source: LineSource;
  timestamp: number;
};

export type LineUnfollowEvent = {
  type: 'unfollow';
  source: LineSource;
  timestamp: number;
};

export type LinePostbackEvent = {
  type: 'postback';
  replyToken: string;
  source: LineSource;
  timestamp: number;
  postback: { data: string };
};

export type LineWebhookEvent =
  | LineMessageEvent
  | LineFollowEvent
  | LineUnfollowEvent
  | LinePostbackEvent;

export type LineWebhookPayload = {
  destination: string;
  events: LineWebhookEvent[];
};
