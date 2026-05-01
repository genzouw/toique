import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Channels from '../Channels';
import { api, type LineChannel } from '../../lib/api';
import { buildWebhookUrl } from '../../lib/webhook-url';

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

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument();
  });

  it('loads and displays channels successfully', async () => {
    const mockChannel: LineChannel = {
      id: '1',
      tenantId: 'tenant-1',
      channelId: 'channel-1',
      displayName: 'Test Channel 1',
      channelSecret: 'secret-1',
      channelAccessToken: 'token-1',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    vi.mocked(api.listChannels).mockResolvedValue([mockChannel]);

    render(<Channels />);

    await waitFor(() => {
      expect(screen.getByText('Test Channel 1')).toBeInTheDocument();
    });

    expect(screen.queryByText('読み込み中…')).not.toBeInTheDocument();
    expect(screen.getByText('Channel ID: channel-1')).toBeInTheDocument();
  });

  it('renders the actual webhook URL with the registered channel ID', async () => {
    const mockChannel: LineChannel = {
      id: 'item-1',
      tenantId: 'tenant-1',
      channelId: '2001234567',
      displayName: 'Channel A',
      channelSecret: 'secret',
      channelAccessToken: 'token',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    vi.mocked(api.listChannels).mockResolvedValue([mockChannel]);

    render(<Channels />);

    const expectedUrl = `${window.location.origin}/webhooks/line/2001234567`;
    await waitFor(() => {
      expect(screen.getByText(expectedUrl)).toBeInTheDocument();
    });

    expect(
      screen.queryByText('/webhooks/line/<Channel ID>'),
    ).not.toBeInTheDocument();
  });

  it('copies the webhook URL to clipboard and shows feedback', async () => {
    const mockChannel: LineChannel = {
      id: 'item-1',
      tenantId: 'tenant-1',
      channelId: '2001234567',
      displayName: 'Channel A',
      channelSecret: 'secret',
      channelAccessToken: 'token',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    vi.mocked(api.listChannels).mockResolvedValue([mockChannel]);

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<Channels />);

    const copyButton = await screen.findByRole('button', {
      name: /Webhook URL をコピー/,
    });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/webhooks/line/2001234567`,
      );
    });
    await waitFor(() => {
      expect(screen.getByText('コピー済み')).toBeInTheDocument();
    });
  });
});

describe('buildWebhookUrl', () => {
  it('prepends the current origin to the webhook path', () => {
    expect(buildWebhookUrl('2001234567')).toBe(
      `${window.location.origin}/webhooks/line/2001234567`,
    );
  });
});
