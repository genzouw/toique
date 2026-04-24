export const logger = {
  info: (...args: unknown[]): void => console.info(...args),
  warn: (...args: unknown[]): void => console.warn(...args),
  error: (...args: unknown[]): void => console.error(...args),
  debug: (...args: unknown[]): void => console.debug(...args),
} as const;
