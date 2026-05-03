import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RedirectIfAuthed from './RedirectIfAuthed';
import { useSession } from '../lib/auth-client';
import {
  mockAuthedSession,
  mockPendingSession,
  mockUnauthedSession,
} from '../test/auth-mocks';

vi.mock('../lib/auth-client', () => ({
  useSession: vi.fn(),
}));

// Dummy component to show that redirect worked
const Dashboard = () => {
  const location = useLocation();
  return (
    <div data-testid="dashboard">Dashboard (Path: {location.pathname})</div>
  );
};

// Dummy component for testing children rendering
const ChildrenContent = () => (
  <div data-testid="children">Children Content</div>
);

describe('RedirectIfAuthed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when session is pending', () => {
    vi.mocked(useSession).mockReturnValue(mockPendingSession());

    render(
      <MemoryRouter initialEntries={['/login']}>
        <RedirectIfAuthed>
          <ChildrenContent />
        </RedirectIfAuthed>
      </MemoryRouter>,
    );

    expect(screen.getByText('読み込み中…')).toBeInTheDocument();
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });

  it('redirects to /dashboard when user is authenticated', () => {
    vi.mocked(useSession).mockReturnValue(
      mockAuthedSession({ user: { id: '1', name: 'Test User' } }),
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <ChildrenContent />
              </RedirectIfAuthed>
            }
          />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(
      screen.getByText('Dashboard (Path: /dashboard)'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });

  it('renders children when user is not authenticated and not pending', () => {
    vi.mocked(useSession).mockReturnValue(mockUnauthedSession());

    render(
      <MemoryRouter initialEntries={['/login']}>
        <RedirectIfAuthed>
          <ChildrenContent />
        </RedirectIfAuthed>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument();
  });
});
