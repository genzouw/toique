import { describe, it, expect } from 'vitest';
import { getFaq, getCategory, getFaqsByCategory, getRelated } from '../index';
import type { FaqCategorySlug } from '../index';

describe('faqs', () => {
  it('getFaq returns faq by slug', () => {
    expect(getFaq('pricing-overview')).toBeDefined();
    expect(getFaq('non-existent')).toBeUndefined();
  });

  it('getCategory returns category by slug', () => {
    expect(getCategory('pricing')).toBeDefined();
    expect(getCategory('non-existent' as FaqCategorySlug)).toBeUndefined();
  });

  it('getFaqsByCategory returns faqs for category', () => {
    const faqs = getFaqsByCategory('pricing');
    expect(faqs.length).toBeGreaterThan(0);
    expect(faqs.every((f) => f.category === 'pricing')).toBe(true);
  });

  it('getRelated returns related faqs', () => {
    const faq = getFaq('pricing-overview')!;
    const related = getRelated(faq);
    expect(related.map((f) => f.slug)).toEqual([
      'pricing-free-limits',
      'pricing-payment-method',
    ]);
  });
});
