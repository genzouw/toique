import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect } from 'vitest';
import SiteFooter from './SiteFooter';
import { FOOTER_NAV_ITEMS } from '../lib/navigation';

describe('SiteFooter', () => {
  it('renders all footer navigation links', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );

    for (const item of FOOTER_NAV_ITEMS) {
      const link = screen.getByRole('link', { name: item.label });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', item.to);
    }
  });
});
