import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Inbox } from 'lucide-react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders icon, title, and description', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="まだ回答はありません"
        description="フォームを公開して回答を受け付けましょう。"
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'まだ回答はありません' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('フォームを公開して回答を受け付けましょう。'),
    ).toBeInTheDocument();
  });

  it('does not render action wrapper when action prop is omitted', () => {
    const { container } = render(
      <EmptyState icon={Inbox} title="title" description="description" />,
    );

    expect(container.querySelector('.mt-6')).toBeNull();
  });

  it('renders action when provided', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="title"
        description="description"
        action={<button type="button">最初のフォームを作成</button>}
      />,
    );

    expect(
      screen.getByRole('button', { name: '最初のフォームを作成' }),
    ).toBeInTheDocument();
  });

  it('applies className to the root element', () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="title"
        description="description"
        className="custom-class"
      />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
