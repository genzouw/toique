export function buildWebhookUrl(channelId: string): string {
  return `${window.location.origin}/webhooks/line/${channelId}`;
}
