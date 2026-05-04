import { vi } from 'vitest';
import type { useSession } from '../lib/auth-client';

type SessionResult = ReturnType<typeof useSession>;
type SessionData = SessionResult['data'];
type AuthedData = NonNullable<SessionData>;
type AuthedUser = AuthedData['user'];
type AuthedSessionInfo = AuthedData['session'];

const FIXED_DATE = new Date('2026-01-01T00:00:00Z');
const FAR_FUTURE = new Date('2099-12-31T23:59:59Z');

export const mockUser = (overrides: Partial<AuthedUser> = {}): AuthedUser =>
  ({
    id: 'mock-user-id',
    name: 'Mock User',
    email: 'mock@example.com',
    emailVerified: true,
    image: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...overrides,
  }) as AuthedUser;

export const mockSession = (
  overrides: Partial<AuthedSessionInfo> = {},
): AuthedSessionInfo =>
  ({
    id: 'mock-session-id',
    userId: 'mock-user-id',
    expiresAt: FAR_FUTURE,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    token: 'mock-token',
    ipAddress: null,
    userAgent: null,
    ...overrides,
  }) as AuthedSessionInfo;

export const createMockSession = (
  overrides: Partial<SessionResult> = {},
): SessionResult =>
  ({
    data: null,
    isPending: false,
    isRefetching: false,
    error: null,
    refetch: vi.fn(() => Promise.resolve()),
    ...overrides,
  }) as SessionResult;

export const mockPendingSession = (): SessionResult =>
  createMockSession({ isPending: true });

export const mockUnauthedSession = (): SessionResult =>
  createMockSession({ data: null });

export const mockAuthedSession = (
  overrides: {
    user?: Partial<AuthedUser>;
    session?: Partial<AuthedSessionInfo>;
  } = {},
): SessionResult =>
  createMockSession({
    data: {
      user: mockUser(overrides.user),
      session: mockSession(overrides.session),
    } as AuthedData,
  });
