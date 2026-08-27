import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import FaqHub from '../FaqHub';
import { getFaq } from '../../lib/faqs';

describe('FaqHub search', () => {
  it('matches a query found within a single field', async () => {
    const user = userEvent.setup();
    const faq = getFaq('data-where-to-check')!;
    const partialQuestion = faq.question.slice(0, 6);

    render(
      <MemoryRouter>
        <FaqHub />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('FAQを検索'), partialQuestion);

    expect(screen.getByText(faq.question)).toBeInTheDocument();
  });

  it('does not match a query that only exists across the boundary between question and answer text', async () => {
    const user = userEvent.setup();
    const faq = getFaq('data-where-to-check')!;
    // 質問文の末尾と回答冒頭を連結したクエリ。各文字列を個別に見れば一致しないが、
    // 事前計算した検索対象を単純に結合して検索していた場合は誤って一致してしまう。
    const crossBoundaryQuery = `${faq.question.slice(-2)} ${faq.answerParagraphs[0].slice(0, 2)}`;

    render(
      <MemoryRouter>
        <FaqHub />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('FAQを検索'), crossBoundaryQuery);

    expect(
      screen.getByText(
        `「${crossBoundaryQuery}」に一致する質問は見つかりませんでした。`,
      ),
    ).toBeInTheDocument();
  });
});
