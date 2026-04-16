import { createAuthClient } from 'better-auth/react';

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL: BASE_URL,
});

export const { useSession, signIn, signUp, signOut } = authClient;
