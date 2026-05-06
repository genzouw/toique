import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import JsonLd from './JsonLd';

describe('JsonLd', () => {
  afterEach(() => {
    cleanup();
  });

  it('構造化データを application/ld+json として出力する', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Toique',
    };
    const { container } = render(<JsonLd data={data} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).not.toBeNull();
    expect(script?.innerHTML).toBe(
      '{"@context":"https://schema.org","@type":"Organization","name":"Toique"}',
    );
  });

  it('XSS となる < は \\u003c にエスケープされる', () => {
    const data = { malicious: '</script><script>alert(1)' };
    const { container } = render(<JsonLd data={data} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script?.innerHTML).toContain('\\u003c');
    expect(script?.innerHTML).not.toContain('</script>');
  });
});
