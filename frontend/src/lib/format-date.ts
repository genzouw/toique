/**
 * Memoized Intl.DateTimeFormat for performance.
 * Date.toLocaleString() is noticeably slow in JS, especially when rendered in loops.
 * Reusing a globally memoized Intl.DateTimeFormat instance provides an O(n) rendering speedup.
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
export function formatDate(date: string | number | Date): string {
  const d =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  return formatter.format(d);
}
