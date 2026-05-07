import { createAuthClient } from 'better-auth/react';
import { API_BASE_URL } from './api-base-url';

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
});

export const { useSession, signIn, signUp, signOut } = authClient;
