import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Channels from './Channels';
import { api, type LineChannel } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    listChannels: vi.fn(),
    createChannel: vi.fn(),
    deleteChannel: vi.fn(),
  },
}));

describe('Channels Page', () => {
  const mockChannels: LineChannel[] = [
    {
      id: 'ch-1',
      channelId: '1234567890',
      displayName: 'Test Channel 1',
      tenantId: 'tenant-1',
      channelSecret: 'secret-1',
      channelAccessToken: 'token-1',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ch-2',
      channelId: '0987654321',
      displayName: 'Test Channel 2',
      tenantId: 'tenant-1',
      channelSecret: 'secret-2',
      channelAccessToken: 'token-2',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.mocked(api.listChannels).mockResolvedValue(mockChannels);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('delete flow', () => {
    it('deletes a channel when the user confirms', async () => {
      vi.mocked(api.deleteChannel).mockResolvedValue(undefined);

      render(<Channels />);

      // Wait for the channels to be loaded
      await waitFor(() => {
        expect(screen.getByText('Test Channel 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: '削除' });
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('削除してよろしいですか？');

      await waitFor(() => {
        expect(api.deleteChannel).toHaveBeenCalledWith('ch-1');
        // Initial load + refresh after delete
        expect(api.listChannels).toHaveBeenCalledTimes(2);
      });
    });

    it('does not delete a channel when the user cancels', async () => {
      vi.spyOn(window, 'confirm').mockImplementation(() => false);

      render(<Channels />);

      await waitFor(() => {
        expect(screen.getByText('Test Channel 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: '削除' });
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('削除してよろしいですか？');

      expect(api.deleteChannel).not.toHaveBeenCalled();
      // Only called on initial load
      expect(api.listChannels).toHaveBeenCalledTimes(1);
    });

    it('displays an error message when deletion fails', async () => {
      const errorMessage = 'Deletion failed';
      vi.mocked(api.deleteChannel).mockRejectedValue(new Error(errorMessage));

      render(<Channels />);

      await waitFor(() => {
        expect(screen.getByText('Test Channel 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: '削除' });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(api.deleteChannel).toHaveBeenCalledWith('ch-1');
      // No refresh should happen on failure
      expect(api.listChannels).toHaveBeenCalledTimes(1);
    });
  });
});
