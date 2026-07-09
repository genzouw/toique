const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

/**
 * Formats a date using a globally memoized Intl.DateTimeFormat instance
 * to prevent performance bottlenecks during list rendering.
 */
export function formatDate(date: string | number | Date): string {
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  return dateFormatter.format(dateObj);
}
