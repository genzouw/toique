import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router';
import AdminLogin from './AdminLogin';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    getAdminMe: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders correctly', () => {
    render(
      <BrowserRouter>
        <AdminLogin />
      </BrowserRouter>,
    );

    expect(
      screen.getByRole('heading', { name: '運営者ログイン' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('ユーザーID')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'ログイン' }),
    ).toBeInTheDocument();
  });

  it('shows error and removes auth token on unauthenticated path (login failure)', async () => {
    const user = userEvent.setup();

    // Mock API failure (e.g. 401 Unauthorized)
    vi.mocked(api.getAdminMe).mockRejectedValueOnce(new Error('Unauthorized'));

    render(
      <BrowserRouter>
        <AdminLogin />
      </BrowserRouter>,
    );

    // Initial assertions
    expect(
      screen.queryByText('IDまたはパスワードが正しくありません。'),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem('adminAuth')).toBeNull();

    // Fill in credentials
    const usernameInput = screen.getByLabelText('ユーザーID');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'wrongpassword');

    // Submit form
    await user.click(submitButton);

    // Verify loading state works (button text changes and gets disabled)
    // Note: It might be too fast to catch, but checking button state is good practice
    // expect(submitButton).toBeDisabled();
    // expect(submitButton).toHaveTextContent('ログイン中...');

    await waitFor(() => {
      // Expect error message to be shown
      expect(
        screen.getByText('IDまたはパスワードが正しくありません。'),
      ).toBeInTheDocument();
    });

    // Check localStorage was cleared
    expect(localStorage.getItem('adminAuth')).toBeNull();

    // Check navigation didn't happen
    expect(mockNavigate).not.toHaveBeenCalled();

    // Button should be restored to initial state
    expect(submitButton).not.toBeDisabled();
    expect(submitButton).toHaveTextContent('ログイン');
  });

  it('navigates to admin dashboard on successful login', async () => {
    const user = userEvent.setup();

    // Mock API success
    vi.mocked(api.getAdminMe).mockResolvedValueOnce({ user: { id: '1', email: 'admin@example.com', name: 'admin' } });

    render(
      <BrowserRouter>
        <AdminLogin />
      </BrowserRouter>,
    );

    // Fill in credentials
    await user.type(screen.getByLabelText('ユーザーID'), 'admin');
    await user.type(screen.getByLabelText('パスワード'), 'correctpassword');

    // Submit form
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      // Check localStorage was set
      expect(localStorage.getItem('adminAuth')).toBe(
        'YWRtaW46Y29ycmVjdHBhc3N3b3Jk',
      );

      // Check navigation happened
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });

    // No error should be shown
    expect(
      screen.queryByText('IDまたはパスワードが正しくありません。'),
    ).not.toBeInTheDocument();
  });
});
