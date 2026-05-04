import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AuthGuard from './AuthGuard';
import { useSession } from '../lib/auth-client';
import { mockPendingSession } from '../test/auth-mocks';

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
});
