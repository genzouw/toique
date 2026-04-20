import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Channels from '../Channels';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    listChannels: vi.fn(),
    createChannel: vi.fn(),
    deleteChannel: vi.fn(),
  },
}));

describe('Channels Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message when listChannels API fails on refresh', async () => {
    const errorMessage = 'Failed to fetch channels';
    vi.mocked(api.listChannels).mockRejectedValue(new Error(errorMessage));

    render(<Channels />);

    // Initially loading, wait for the error message to be displayed
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Check that loading is gone
    expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument();
  });

  it('loads and displays channels successfully', async () => {
    vi.mocked(api.listChannels).mockResolvedValue([
      {
        id: '1',
        channelId: 'channel-1',
        displayName: 'Test Channel 1',
        channelSecret: 'secret-1',
        channelAccessToken: 'token-1',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    render(<Channels />);

    await waitFor(() => {
      expect(screen.getByText('Test Channel 1')).toBeInTheDocument();
    });

    expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument();
    expect(screen.getByText('Channel ID: channel-1')).toBeInTheDocument();
  });
});
