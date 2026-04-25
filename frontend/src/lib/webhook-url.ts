export function buildWebhookUrl(channelId: string): string {
  const path = `/webhooks/line/${channelId}`;
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
