import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AdminUserDetail from './AdminUserDetail';
import {
  api,
  type AdminUserDetail as AdminUserDetailType,
} from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    getAdminUser: vi.fn(),
  },
}));

describe('AdminUserDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user detail with tenant information', async () => {
    const detail: AdminUserDetailType = {
      id: 'u1',
      name: '山田 太郎',
      email: 'taro@example.com',
      emailVerified: true,
      image: null,
      createdAt: '2026-04-20T10:00:00Z',
      updatedAt: '2026-04-21T10:00:00Z',
      tenantId: 't1',
      tenantName: 'テスト株式会社',
      tenantPlan: 'pro',
      tenantRole: 'admin',
      tenantCreatedAt: '2026-01-01T00:00:00Z',
    };
    vi.mocked(api.getAdminUser).mockResolvedValueOnce(detail);

    render(
      <MemoryRouter initialEntries={['/admin/users/u1']}>
        <Routes>
          <Route path="/admin/users/:id" element={<AdminUserDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('読み込み中…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    expect(screen.getByText('taro@example.com')).toBeInTheDocument();
    expect(screen.getByText('テスト株式会社')).toBeInTheDocument();
    expect(screen.getByText('pro')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('認証済み')).toBeInTheDocument();
    expect(api.getAdminUser).toHaveBeenCalledWith('u1');
  });

  it('renders "tenant not provisioned" message when user has no tenant', async () => {
    const detail: AdminUserDetailType = {
      id: 'u2',
      name: '未所属ユーザー',
      email: 'lone@example.com',
      emailVerified: false,
      image: null,
      createdAt: '2026-04-20T10:00:00Z',
      updatedAt: '2026-04-20T10:00:00Z',
      tenantId: null,
      tenantName: null,
      tenantPlan: null,
      tenantRole: null,
      tenantCreatedAt: null,
    };
    vi.mocked(api.getAdminUser).mockResolvedValueOnce(detail);

    render(
      <MemoryRouter initialEntries={['/admin/users/u2']}>
        <Routes>
          <Route path="/admin/users/:id" element={<AdminUserDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('未所属ユーザー')).toBeInTheDocument();
    });

    expect(
      screen.getByText('テナント未所属（オンボーディング未完了）'),
    ).toBeInTheDocument();
  });

  it('displays error message when API call fails', async () => {
    const errorMessage = '読み込みに失敗しました';
    vi.mocked(api.getAdminUser).mockRejectedValueOnce(new Error(errorMessage));

    render(
      <MemoryRouter initialEntries={['/admin/users/u1']}>
        <Routes>
          <Route path="/admin/users/:id" element={<AdminUserDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
