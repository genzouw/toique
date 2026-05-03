import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect } from 'vitest';
import SiteHeader from './SiteHeader';

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <SiteHeader />
    </MemoryRouter>,
  );
}

describe('SiteHeader', () => {
  it('renders all primary navigation links and the CTA', () => {
    renderAt('/');

    expect(screen.getByRole('link', { name: 'Toique' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: '料金プラン' })).toHaveAttribute(
      'href',
      '/pricing',
    );
    expect(screen.getByRole('link', { name: 'よくある質問' })).toHaveAttribute(
      'href',
      '/faq',
    );
    expect(screen.getByRole('link', { name: 'ログイン' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: '無料で始める' })).toHaveAttribute(
      'href',
      '/signup',
    );
  });

  it('marks the active link with aria-current on the matching path', () => {
    renderAt('/faq');

    const faqLink = screen.getByRole('link', { name: 'よくある質問' });
    expect(faqLink).toHaveAttribute('aria-current', 'page');
  });

  it('treats child paths as active for the parent nav item', () => {
    renderAt('/faq/some-slug');

    const faqLink = screen.getByRole('link', { name: 'よくある質問' });
    expect(faqLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark non-matching links as active', () => {
    renderAt('/pricing');

    expect(
      screen.getByRole('link', { name: 'よくある質問' }),
    ).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'ログイン' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
