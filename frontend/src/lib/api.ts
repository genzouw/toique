const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type LineChannel = {
  id: string;
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
};

export type InboundMessage = {
  id: string;
  lineChannelId: string;
  lineUserId: string | null;
  eventType: string;
  messageType: string | null;
  text: string | null;
  rawEvent: Record<string, unknown>;
  receivedAt: string;
};

export const api = {
  listChannels: () => request<LineChannel[]>('/api/v1/line-channels'),
  createChannel: (input: {
    channelId: string;
    channelSecret: string;
    channelAccessToken: string;
    displayName: string;
  }) =>
    request<LineChannel>('/api/v1/line-channels', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteChannel: (id: string) =>
    request<void>(`/api/v1/line-channels/${id}`, { method: 'DELETE' }),
  listMessages: () => request<InboundMessage[]>('/api/v1/messages'),
};
