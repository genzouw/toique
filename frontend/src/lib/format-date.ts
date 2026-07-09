/**
 * パフォーマンス向上のためにメモ化された Intl.DateTimeFormat。
 * インスタンスを再利用することで、レンダリングのオーバーヘッドを削減します。
 */
const formatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

/**
 * Formats a Date object or ISO date string to a Japanese format.
 */
export function formatDate(
  date: string | number | Date | null | undefined,
): string {
  if (!date) {
    return '—';
  }
  const d =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  if (isNaN(d.getTime())) {
    return '—';
  }
  return formatter.format(d);
}
