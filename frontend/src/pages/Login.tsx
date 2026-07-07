import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { signIn } from '../lib/auth-client';
import SEOMetadata from '../components/SEOMetadata';
import LoadingButton from '../components/LoadingButton';
import { AuthField } from '../components/AuthField';
import { AuthLayout } from '../components/AuthLayout';
import ErrorAlert from '../components/ErrorAlert';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn.email({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message ?? 'ログインに失敗しました');
      setSubmitting(false);
      return;
    }
    navigate('/dashboard', { replace: true });
  }

  return (
    <AuthLayout title="ログイン">
      <SEOMetadata
        title="ログイン | Toique"
        description="Toiqueへログイン。LINE公式アカウント連携の問い合わせフォームを管理できます。"
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label="メールアドレス"
          type="email"
          value={email}
          onChange={setEmail}
        />
        <AuthField
          label="パスワード"
          type="password"
          value={password}
          onChange={setPassword}
        />
        <ErrorAlert error={error} />
        <LoadingButton
          type="submit"
          loading={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'ログイン中…' : 'ログイン'}
        </LoadingButton>
      </form>
      <div className="mt-4 text-sm text-slate-600">
        アカウントをお持ちでない方は{' '}
        <Link
          to="/signup"
          className="text-slate-900 underline focus-ring focus-visible:outline-hidden rounded-sm transition-colors"
        >
          新規登録
        </Link>
      </div>
      <div className="mt-2 text-sm text-slate-600">
        <Link
          to="/forgot-password"
          className="text-slate-900 underline focus-ring focus-visible:outline-hidden rounded-sm transition-colors"
        >
          パスワードを忘れた方
        </Link>
      </div>
    </AuthLayout>
  );
}
