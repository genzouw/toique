const DEFAULT_API_URL = 'http://localhost:3000';

export function resolveApiBaseUrl(rawUrl: string | undefined): string {
  const url = rawUrl || DEFAULT_API_URL;
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_URL as string | undefined,
);
