import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect } from 'vitest';
import SiteFooter from './SiteFooter';

describe('SiteFooter', () => {
  it('renders all footer navigation links', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );

    const expectedLinks: { name: string; href: string }[] = [
      { name: '料金プラン', href: '/pricing' },
      { name: 'よくある質問', href: '/faq' },
      { name: 'ヘルプ', href: '/help' },
      { name: 'お問い合わせ', href: '/contact' },
      {
        name: '特定商取引法に基づく表記',
        href: '/specified-commercial-transactions',
      },
      { name: 'ログイン', href: '/login' },
    ];

    for (const { name, href } of expectedLinks) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });
});
