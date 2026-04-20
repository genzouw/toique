import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import Onboarding from '../Onboarding';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    createTenant: vi.fn(),
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

describe('Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: '組織の登録' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('組織名')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '組織を作成して開始' }),
    ).toBeInTheDocument();
  });

  it('shows error message when createTenant throws an error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Tenant already exists';

    vi.mocked(api.createTenant).mockRejectedValueOnce(new Error(errorMessage));

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    const tenantInput = screen.getByLabelText('組織名');
    const submitButton = screen.getByRole('button', {
      name: '組織を作成して開始',
    });

    await user.type(tenantInput, 'Test Tenant');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(submitButton).not.toBeDisabled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to dashboard on successful tenant creation', async () => {
    const user = userEvent.setup();

    vi.mocked(api.createTenant).mockResolvedValueOnce({
      id: '1',
      name: 'Test Tenant',
    });

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    const tenantInput = screen.getByLabelText('組織名');
    const submitButton = screen.getByRole('button', {
      name: '組織を作成して開始',
    });

    await user.type(tenantInput, 'Test Tenant');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      });
    });
  });
});
