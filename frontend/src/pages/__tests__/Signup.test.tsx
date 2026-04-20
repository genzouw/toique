import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Signup from '../Signup';
import { signUp } from '../../lib/auth-client';

// モック化
vi.mock('../../lib/auth-client', () => ({
  signUp: {
    email: vi.fn(),
  },
}));

describe('Signup Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error message on signup failure', async () => {
    // モックの返り値を設定 (エラーが発生するケース)
    const mockErrorMessage = '既に登録されているメールアドレスです';
    vi.mocked(signUp.email).mockResolvedValueOnce({
      error: { message: mockErrorMessage },
    } as any);

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );

    const user = userEvent.setup();

    // フォームに入力
    await user.type(screen.getByLabelText(/お名前/), 'テストユーザー');
    await user.type(screen.getByLabelText(/メールアドレス/), 'test@example.com');
    await user.type(screen.getByLabelText(/パスワード/), 'password123');

    // 送信ボタンをクリック
    await user.click(screen.getByRole('button', { name: /アカウント登録/ }));

    // signUp.email が呼ばれたことを確認
    expect(signUp.email).toHaveBeenCalledWith({
      name: 'テストユーザー',
      email: 'test@example.com',
      password: 'password123',
    });

    // エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(mockErrorMessage)).toBeInTheDocument();
    });

    // ボタンのテキストが元に戻っていることを確認
    expect(screen.getByRole('button', { name: /アカウント登録/ })).not.toBeDisabled();
  });
});
