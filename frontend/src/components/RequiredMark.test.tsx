import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RequiredMark } from './RequiredMark';

describe('RequiredMark', () => {
  it('WCAG AA を満たす色でアスタリスクを表示し、支援技術からは隠す', () => {
    render(<RequiredMark />);

    const marker = screen.getByText('*', { selector: 'span' });
    // #dc2626 / 白背景のコントラスト比は約 4.83:1（AA 基準 4.5:1 を満たす）。
    // text-red-500 (#ef4444) は約 3.76:1 で基準未満のため退行を検知する。
    expect(marker).toHaveClass('text-red-600');
    expect(marker).not.toHaveClass('text-red-500');
    expect(marker).toHaveAttribute('aria-hidden', 'true');
  });

  it('ラベルとの間隔は ml-1 のみで表現する', () => {
    render(<RequiredMark />);

    const marker = screen.getByText('*', { selector: 'span' });
    expect(marker).toHaveClass('ml-1');
    expect(marker.textContent).toBe('*');
  });
});
