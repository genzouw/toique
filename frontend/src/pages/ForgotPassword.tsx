import { useState } from 'react';
import { Link } from 'react-router';
import { AuthLayout } from '../components/AuthLayout';
import AuthField from '../components/AuthField';
import SEOMetadata from '../components/SEOMetadata';
import LoadingButton from '../components/LoadingButton';
import { API_BASE_URL } from '../lib/api-base-url';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seo = (
    <SEOMetadata
      title="パスワード再設定 | Toique"
      description="パスワード再設定の案内メールを送信します。"
    />
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/auth/request-password-reset`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
        },
      );
      if (!res.ok) {
        setError(
          'リクエストの受付に失敗しました。時間をおいて再度お試しください。',
        );
        setSubmitting(false);
        return;
      }
      // backend は登録の有無に関わらず常に成功レスポンスを返す（メール存在チェック露出を防ぐ）
      setSubmitted(true);
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="メールを送信しました">
        {seo}
        <div className="space-y-4 text-sm text-slate-700">
          <p>
            ご入力いただいたメールアドレスが登録されている場合、パスワード再設定用のリンクを送信しました。
          </p>
          <p>
            メール本文のリンクからパスワードを再設定してください
            (リンクは1時間有効)。
          </p>
          <Link
            to="/login"
            className="block w-full text-center px-4 py-2 bg-slate-900 text-white rounded-md"
          >
            ログイン画面へ
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="パスワード再設定">
      {seo}
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          ご登録のメールアドレス宛に、パスワード再設定用のリンクをお送りします。
        </p>
        <AuthField
          label="メールアドレス"
          type="email"
          value={email}
          onChange={setEmail}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <LoadingButton
          type="submit"
          loading={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '送信中…' : '再設定メールを送信'}
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
