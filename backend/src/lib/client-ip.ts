// Cloud Run の内部プロキシが実クライアントIPを右端に追記するため、
// 右端の値を採用する（左端はクライアントが偽装可能）
export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const ip = xff.split(',').at(-1)?.trim();
    if (ip) return ip;
  }
  return headers.get('x-real-ip') ?? 'unknown';
}
