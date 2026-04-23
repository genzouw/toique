export const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (...args: any[]) => console.log(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...args: any[]) => console.warn(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...args: any[]) => console.error(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...args: any[]) => console.debug(...args),
};
