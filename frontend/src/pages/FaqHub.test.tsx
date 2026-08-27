import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import FaqHub from './FaqHub';

// 検索用の合成テストデータ。
// question の末尾（ABC）と answerParagraphs の先頭（DEF）を join(' ') で
// 連結すると "...abc def..." となり、フィールド境界をまたぐクエリ "c d" が
// 誤って一致してしまう回帰を検出するために用意している。
// vi.mock はファイル先頭にホイストされるため、参照する定数はファクトリ内で定義する。
vi.mock('../lib/faqs', () => {
  const testFaq = {
    slug: 'test-boundary-faq',
    category: 'pricing',
    question: 'テスト用の質問ABC',
    answerParagraphs: ['DEFテスト用の回答'],
    updatedAt: '2024-01-01',
  };
  const testCategory = {
    slug: 'pricing',
    title: 'テストカテゴリ',
    description: 'テスト用カテゴリの説明',
  };
  return {
    CATEGORIES: [testCategory],
    FAQS: [testFaq],
    getFaqsByCategory: () => [testFaq],
  };
});

describe('FaqHub 検索', () => {
  it('フィールド境界をまたぐクエリでは一致しない', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <MemoryRouter>
          <FaqHub />
        </MemoryRouter>,
      );
    });

    const searchInput = screen.getByLabelText('FAQを検索');
    await user.type(searchInput, 'c d');

    expect(
      screen.getByText('「c d」に一致する質問は見つかりませんでした。'),
    ).toBeInTheDocument();
  });

  it('単一フィールド内のキーワードには一致する', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <MemoryRouter>
          <FaqHub />
        </MemoryRouter>,
      );
    });

    const searchInput = screen.getByLabelText('FAQを検索');
    await user.type(searchInput, 'ABC');

    expect(screen.getByText('テスト用の質問ABC')).toBeInTheDocument();
  });
});
