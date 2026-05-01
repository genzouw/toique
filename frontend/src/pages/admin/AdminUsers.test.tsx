import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AdminUsers from './AdminUsers';
import { api, type AdminUserListItem } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    listAdminUsers: vi.fn(),
  },
}));

describe('AdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading then renders the list of users', async () => {
    const rows: AdminUserListItem[] = [
      {
        id: 'u1',
        name: '山田 太郎',
        email: 'taro@example.com',
        emailVerified: true,
        createdAt: '2026-04-20T10:00:00Z',
        tenantId: 't1',
        tenantName: 'テスト株式会社',
        tenantPlan: 'pro',
        tenantRole: 'admin',
      },
      {
        id: 'u2',
        name: '未所属ユーザー',
        email: 'lone@example.com',
        emailVerified: false,
        createdAt: '2026-04-10T10:00:00Z',
        tenantId: null,
        tenantName: null,
        tenantPlan: null,
        tenantRole: null,
      },
    ];
    vi.mocked(api.listAdminUsers).mockResolvedValueOnce(rows);

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AdminUsers />
      </MemoryRouter>,
    );

    expect(screen.getByText('読み込み中…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    expect(screen.getByText('未所属ユーザー')).toBeInTheDocument();
    expect(screen.getByText('テスト株式会社')).toBeInTheDocument();
    expect(screen.getByText('認証済み')).toBeInTheDocument();
    expect(screen.getByText('未認証')).toBeInTheDocument();
    expect(screen.getByText('2 件')).toBeInTheDocument();
  });

  it('renders empty state when there are no users', async () => {
    vi.mocked(api.listAdminUsers).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <AdminUsers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('登録ユーザーはまだいません。'),
      ).toBeInTheDocument();
    });
  });

  it('renders error message when API fails', async () => {
    vi.mocked(api.listAdminUsers).mockRejectedValueOnce(
      new Error('読み込みに失敗しました'),
    );

    render(
      <MemoryRouter>
        <AdminUsers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('読み込みに失敗しました')).toBeInTheDocument();
    });
  });
});
