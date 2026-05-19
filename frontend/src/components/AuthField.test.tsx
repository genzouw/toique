import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { AuthField } from './AuthField';

function ControlledAuthField(props: {
  label?: string;
  type?: string;
  variant?: 'user' | 'admin';
  initial?: string;
}) {
  const [value, setValue] = useState(props.initial ?? '');
  return (
    <AuthField
      label={props.label ?? 'パスワード'}
      type={props.type ?? 'password'}
      value={value}
      onChange={setValue}
      variant={props.variant}
    />
  );
}

describe('AuthField', () => {
  it('renders label and input with associated htmlFor', () => {
    render(<ControlledAuthField label="メールアドレス" type="email" />);
    const input = screen.getByLabelText('メールアドレス');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'email');
  });

  it('renders no toggle button for non-password types', () => {
    render(<ControlledAuthField label="お名前" type="text" />);
    expect(
      screen.queryByRole('button', { name: 'パスワードを表示' }),
    ).not.toBeInTheDocument();
  });

  it('toggles password visibility and updates a11y attributes on click', async () => {
    const user = userEvent.setup();
    render(<ControlledAuthField label="パスワード" type="password" />);

    const passwordInput = screen.getByLabelText('パスワード');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const showButton = screen.getByRole('button', { name: 'パスワードを表示' });
    expect(showButton).toHaveAttribute('aria-pressed', 'false');
    expect(showButton).toHaveAttribute('title', 'パスワードを表示');

    await user.click(showButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    const hideButton = screen.getByRole('button', { name: 'パスワードを隠す' });
    expect(hideButton).toHaveAttribute('aria-pressed', 'true');
    expect(hideButton).toHaveAttribute('title', 'パスワードを隠す');

    await user.click(hideButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
    const restored = screen.getByRole('button', { name: 'パスワードを表示' });
    expect(restored).toHaveAttribute('aria-pressed', 'false');
  });

  it('applies admin focus ring color when variant="admin"', () => {
    render(
      <ControlledAuthField
        label="パスワード"
        type="password"
        variant="admin"
      />,
    );
    const input = screen.getByLabelText('パスワード');
    expect(input.className).toContain('focus-visible:ring-amber-500');
    expect(input.className).not.toContain('focus-visible:ring-slate-900');
  });

  it('applies user focus ring color by default', () => {
    render(<ControlledAuthField label="パスワード" type="password" />);
    const input = screen.getByLabelText('パスワード');
    expect(input.className).toContain('focus-visible:ring-slate-900');
    expect(input.className).not.toContain('focus-visible:ring-amber-500');
  });

  it('updates value via onChange', async () => {
    const user = userEvent.setup();
    render(<ControlledAuthField label="メール" type="email" />);
    const input = screen.getByLabelText('メール');
    await user.type(input, 'foo@example.com');
    expect(input).toHaveValue('foo@example.com');
  });
});
