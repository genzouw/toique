import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Contact from '../Contact';

// Mock auth-client
vi.mock('../../lib/auth-client', () => ({
  useSession: vi.fn(),
}));

// Mock api
vi.mock('../../lib/api', () => ({
  api: {
    submitContact: vi.fn(),
  },
}));

describe('Contact Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-fill name and email when user is logged in', async () => {
    const { useSession } = await import('../../lib/auth-client');

    // Mock the session with a logged-in user
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 'abc',
          userId: '123',
          expiresAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );

    // Get the input fields
    const nameInput = screen.getByLabelText(/お名前/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(
      /メールアドレス/i,
    ) as HTMLInputElement;

    // Check if they are auto-filled
    expect(nameInput.value).toBe('Test User');
    expect(emailInput.value).toBe('test@example.com');
  });

  it('should not auto-fill when user is not logged in', async () => {
    const { useSession } = await import('../../lib/auth-client');

    // Mock the session with no user
    vi.mocked(useSession).mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );

    // Get the input fields
    const nameInput = screen.getByLabelText(/お名前/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(
      /メールアドレス/i,
    ) as HTMLInputElement;

    // Check if they are empty
    expect(nameInput.value).toBe('');
    expect(emailInput.value).toBe('');
  });
});
