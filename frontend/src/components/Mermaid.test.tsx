import { render, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Mermaid from './Mermaid';

const bindFunctionsSpy = vi.fn();
const renderSpy = vi.fn();

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: (...args: unknown[]) => renderSpy(...args),
  },
}));

describe('Mermaid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bindFunctionsSpy.mockReset();
    renderSpy.mockReset();
    renderSpy.mockResolvedValue({
      svg: '<svg data-testid="mermaid-svg"><g><title>node</title></g></svg>',
      bindFunctions: bindFunctionsSpy,
      diagramType: 'flowchart',
    });
  });

  it('renders sanitized SVG inside the container', async () => {
    const { container } = render(<Mermaid chart="graph TD; A-->B" />);

    await waitFor(() => {
      expect(container.querySelector('svg')).not.toBeNull();
    });
  });

  it('does NOT call bindFunctions by default (static usage preserved)', async () => {
    const { container } = render(<Mermaid chart="graph TD; A-->B" />);

    await waitFor(() => {
      expect(container.querySelector('svg')).not.toBeNull();
    });

    expect(bindFunctionsSpy).not.toHaveBeenCalled();
  });

  it('calls bindFunctions with the container element when interactive=true', async () => {
    render(<Mermaid chart="graph TD; A-->B" interactive />);

    await waitFor(() => {
      expect(bindFunctionsSpy).toHaveBeenCalledTimes(1);
    });

    const arg = bindFunctionsSpy.mock.calls[0][0];
    expect(arg).toBeInstanceOf(Element);
    expect(arg.querySelector('svg')).not.toBeNull();
  });

  it('re-renders and re-invokes bindFunctions when chart changes', async () => {
    const { rerender } = render(
      <Mermaid chart="graph TD; A-->B" interactive />,
    );

    await waitFor(() => {
      expect(bindFunctionsSpy).toHaveBeenCalledTimes(1);
    });

    rerender(<Mermaid chart="graph TD; A-->C" interactive />);

    await waitFor(() => {
      expect(bindFunctionsSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('handles render failures gracefully without throwing', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    renderSpy.mockRejectedValueOnce(new Error('parse error'));

    const { container } = render(<Mermaid chart="invalid" />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    // Container should still be rendered (empty) and not have crashed
    expect(container.querySelector('svg')).not.toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it('skips bindFunctions when it is undefined in the render result', async () => {
    renderSpy.mockResolvedValueOnce({
      svg: '<svg><g /></svg>',
      bindFunctions: undefined,
      diagramType: 'flowchart',
    });

    const { container } = render(
      <Mermaid chart="graph TD; A-->B" interactive />,
    );

    await waitFor(() => {
      expect(container.querySelector('svg')).not.toBeNull();
    });

    // Must not throw when bindFunctions is absent
    expect(bindFunctionsSpy).not.toHaveBeenCalled();
  });
});
