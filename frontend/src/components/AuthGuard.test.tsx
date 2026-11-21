import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AuthGuard from './AuthGuard';
import { useSession } from '../lib/auth-client';
import { api } from '../lib/api';
import { mockAuthedSession, mockPendingSession } from '../test/auth-mocks';

vi.mock('../lib/auth-client', () => ({
  useSession: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: {
    getOnboardingStatus: vi.fn(),
  },
}));

// Dummy component for testing children rendering
const ChildrenContent = () => (
  <div data-testid="children">Children Content</div>
);

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when session is pending', () => {
    vi.mocked(useSession).mockReturnValue(mockPendingSession());

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthGuard>
          <ChildrenContent />
        </AuthGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText('読み込み中…')).toBeInTheDocument();
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });

  it('shows an error instead of redirecting to /onboarding when fetching onboarding status fails', async () => {
    vi.mocked(useSession).mockReturnValue(mockAuthedSession());
    vi.mocked(api.getOnboardingStatus).mockRejectedValue(new Error('network'));

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthGuard>
          <ChildrenContent />
        </AuthGuard>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        '登録状況の取得に失敗しました',
      ),
    );
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });
});
