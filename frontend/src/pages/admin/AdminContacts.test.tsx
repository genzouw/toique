import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AdminContacts from './AdminContacts';
import { api, type ContactListItem } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    listAdminContacts: vi.fn(),
  },
}));

const rows: ContactListItem[] = [
  {
    id: 'c1',
    userId: 'u1',
    tenantId: 't1',
    tenantName: 'テスト株式会社',
    name: '山田 太郎',
    email: 'taro@example.com',
    category: 'bug',
    subject: 'ログインできない',
    status: 'new',
    createdAt: '2026-04-20T10:00:00Z',
  },
];

describe('AdminContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the select while loading and re-enables it after success', async () => {
    vi.mocked(api.listAdminContacts).mockResolvedValueOnce(rows);

    render(
      <MemoryRouter>
        <AdminContacts />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByText('読み込み中…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('ログインできない')).toBeInTheDocument();
    });

    expect(screen.getByRole('combobox')).not.toBeDisabled();
  });

  it('re-enables the select and skips EmptyState when the fetch fails', async () => {
    vi.mocked(api.listAdminContacts).mockRejectedValueOnce(
      new Error('読み込みに失敗しました'),
    );

    render(
      <MemoryRouter>
        <AdminContacts />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('読み込みに失敗しました')).toBeInTheDocument();
    });

    expect(screen.getByRole('combobox')).not.toBeDisabled();
    expect(
      screen.queryByText('システム問い合わせはありません。'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument();
  });

  it('renders empty state when there are no contacts', async () => {
    vi.mocked(api.listAdminContacts).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <AdminContacts />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('システム問い合わせはありません。'),
      ).toBeInTheDocument();
    });
  });
});
