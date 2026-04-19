import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AdminContactDetail from './AdminContactDetail';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    getAdminContact: vi.fn(),
    updateAdminContactStatus: vi.fn(),
  },
}));

describe('AdminContactDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message when API call fails', async () => {
    // Arrange: Mock api.getAdminContact to reject with an error
    const errorMessage = '読み込みに失敗しました';
    vi.mocked(api.getAdminContact).mockRejectedValueOnce(
      new Error(errorMessage),
    );

    // Act: Render the component within a MemoryRouter providing the required :id param
    render(
      <MemoryRouter initialEntries={['/admin/contacts/123']}>
        <Routes>
          <Route path="/admin/contacts/:id" element={<AdminContactDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    // Initial state should show loading
    expect(screen.getByText('読み込み中…')).toBeInTheDocument();

    // Assert: Wait for the component to handle the rejection and display the error
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(api.getAdminContact).toHaveBeenCalledWith('123');
    expect(api.getAdminContact).toHaveBeenCalledTimes(1);
  });
});
