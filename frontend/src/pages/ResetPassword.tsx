import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AuthLayout, AuthField } from './Login';
import { useSEO } from '../lib/useSEO';
import LoadingButton from '../components/LoadingButton';

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

export default function ResetPassword() {
  useSEO({
    title: 'パスワード再設定 | Toique',
    description: '新しいパスワードを設定します。',
  });

  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const errorParam = params.get('error');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam ? formatTokenError(errorParam) : null,
  );

  if (!token && !errorParam) {
    return (
      <AuthLayout title="パスワード再設定">
        <div className="space-y-4 text-sm text-red-600">
          <p>
            再設定用トークンが見つかりません。メールのリンクからアクセスしてください。
          </p>
          <Link
            to="/forgot-password"
            className="block w-full text-center px-4 py-2 bg-slate-900 text-white rounded-md"
          >
            再設定メールを再送
          </Link>
        </div>
      </AuthLayout>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください。');
      return;
    }
    if (password !== confirm) {
      setError('パスワードと確認用パスワードが一致しません。');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: password, token }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
          code?: string;
        } | null;
        setError(
          body?.code === 'INVALID_TOKEN'
            ? 'リンクが無効、もしくは有効期限が切れています。再度メール送信をお試しください。'
            : (body?.message ?? 'パスワードの再設定に失敗しました。'),
        );
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="パスワードを再設定しました">
        <div className="space-y-4 text-sm text-slate-700">
          <p>新しいパスワードでログインしてください。</p>
          <Link
            to="/login"
            className="block w-full text-center px-4 py-2 bg-slate-900 text-white rounded-md"
          >
            ログインへ
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="新しいパスワードの設定">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label="新しいパスワード (8文字以上)"
          type="password"
          value={password}
          onChange={setPassword}
        />
        <AuthField
          label="新しいパスワード (確認)"
          type="password"
          value={confirm}
          onChange={setConfirm}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <LoadingButton
          type="submit"
          loading={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '更新中…' : 'パスワードを更新'}
        </LoadingButton>
      </form>
      <div className="mt-4 text-sm text-slate-600">
        <Link to="/login" className="text-slate-900 underline">
          ログインに戻る
        </Link>
      </div>
    </AuthLayout>
  );
}

function formatTokenError(code: string): string {
  switch (code) {
    case 'INVALID_TOKEN':
      return '再設定用リンクが無効です。再度メール送信をお試しください。';
    case 'TOKEN_EXPIRED':
      return '再設定用リンクの有効期限が切れています。再度メール送信をお試しください。';
    default:
      return `エラーが発生しました (${code})`;
  }
}
