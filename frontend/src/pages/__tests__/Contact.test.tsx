import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Mock, vi, describe, it, expect, beforeEach } from 'vitest';
import Contact from '../Contact';
import * as authClient from '../../lib/auth-client';

// モック化
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

  it('ログインユーザーの情報を自動入力する', () => {
    const mockUser = {
      id: 'user-1',
      name: 'テスト太郎',
      email: 'test@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSession = {
      id: 'session-1',
      userId: 'user-1',
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (authClient.useSession as Mock).mockReturnValue({
      data: {
        user: mockUser,
        session: mockSession,
      },
    });

    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );

    const nameInput = screen.getByLabelText(/お名前/) as HTMLInputElement;
    const emailInput = screen.getByLabelText(
      /メールアドレス/,
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('テスト太郎');
    expect(emailInput.value).toBe('test@example.com');
  });

  it('未ログインの場合は空のままである', () => {
    (authClient.useSession as Mock).mockReturnValue({
      data: null,
    });

    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );

    const nameInput = screen.getByLabelText(/お名前/) as HTMLInputElement;
    const emailInput = screen.getByLabelText(
      /メールアドレス/,
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('');
    expect(emailInput.value).toBe('');
  });
});
