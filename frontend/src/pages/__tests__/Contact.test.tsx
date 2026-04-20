import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Mock, vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import Contact from '../Contact';
import * as authClient from '../../lib/auth-client';
import { api } from '../../lib/api';

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

  it('ログインユーザーの情報を自動入力する', async () => {
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

    await act(async () => {
      render(
        <MemoryRouter>
          <Contact />
        </MemoryRouter>,
      );
    });

    const nameInput = screen.getByLabelText(/お名前/) as HTMLInputElement;
    const emailInput = screen.getByLabelText(
      /メールアドレス/,
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('テスト太郎');
    expect(emailInput.value).toBe('test@example.com');
  });

  it('未ログインの場合は空のままである', async () => {
    (authClient.useSession as Mock).mockReturnValue({
      data: null,
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <Contact />
        </MemoryRouter>,
      );
    });

    const nameInput = screen.getByLabelText(/お名前/) as HTMLInputElement;
    const emailInput = screen.getByLabelText(
      /メールアドレス/,
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('');
    expect(emailInput.value).toBe('');
  });

  it('送信に失敗した場合、エラーメッセージが表示される', async () => {
    (authClient.useSession as Mock).mockReturnValue({
      data: null,
    });

    const errorMessage = 'サーバーエラーが発生しました';
    (api.submitContact as Mock).mockRejectedValue(new Error(errorMessage));

    const user = userEvent.setup();
    await act(async () => {
      render(
        <MemoryRouter>
          <Contact />
        </MemoryRouter>,
      );
    });

    await user.type(screen.getByLabelText(/お名前/), 'Test User');
    await user.type(screen.getByLabelText(/メールアドレス/), 'test@example.com');
    await user.type(screen.getByLabelText(/件名/), 'Test Subject');
    await user.type(screen.getByLabelText(/お問い合わせ内容/), 'Test Body');

    await user.click(screen.getByRole('button', { name: '送信する' }));

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });
});
