import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi } from 'vitest';
import FormEdit from './FormEdit';

vi.mock('../lib/api', () => ({
  api: {
    listChannels: vi.fn().mockResolvedValue([]),
    getForm: vi.fn(),
  },
}));

describe('FormEdit', () => {
  it('shows error message when typing invalid JSON', async () => {
    render(
      <MemoryRouter>
        <FormEdit />
      </MemoryRouter>,
    );

    // Wait for the component to load
    await screen.findByText('新規フォーム');

    // Switch to JSON tab
    const jsonTab = screen.getByRole('button', { name: 'JSON' });
    fireEvent.click(jsonTab);

    // Find the textarea for JSON edit by aria-label
    const textarea = screen.getByRole('textbox', {
      name: 'JSON schema editor',
    });
    expect(textarea).toBeInTheDocument();

    // Type invalid JSON
    fireEvent.change(textarea, { target: { value: '{a:}' } });

    // Verify error message is shown
    expect(screen.getByText('JSON の構文が不正です')).toBeInTheDocument();

    // Type valid JSON
    fireEvent.change(textarea, { target: { value: '{"a": 1}' } });

    // Verify error message disappears
    expect(screen.queryByText('JSON の構文が不正です')).not.toBeInTheDocument();
  });
});
