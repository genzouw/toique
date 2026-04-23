import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { signUp } from '../lib/auth-client';
import { AuthLayout, AuthField } from './Login';
import { useSEO } from '../lib/useSEO';

export default function Signup() {
  useSEO({
    title: '無料でアカウント登録 | Toique',
    description:
      'Toiqueの無料アカウント登録ページ。LINE公式アカウント連携と対話フォームによる問い合わせ自動受付を今すぐ始められます。',
  });
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signUpError } = await signUp.email({
      email,
      password,
      name,
    });
    if (signUpError) {
      setError(signUpError.message ?? '登録に失敗しました');
      setSubmitting(false);
      return;
    }
    navigate('/onboarding', { replace: true });
  }

  return (
    <AuthLayout title="新規登録">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="お名前" value={name} onChange={setName} />
        <AuthField
          label="メールアドレス"
          type="email"
          value={email}
          onChange={setEmail}
        />
        <AuthField
          label="パスワード (8文字以上)"
          type="password"
          value={password}
          onChange={setPassword}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2 bg-slate-900 text-white rounded-md text-sm disabled:opacity-50"
        >
          {submitting ? '登録中…' : 'アカウント登録'}
        </button>
      </form>
      <div className="mt-4 text-sm text-slate-600">
        既にアカウントをお持ちの方は{' '}
        <Link to="/login" className="text-slate-900 underline">
          ログイン
        </Link>
      </div>
    </AuthLayout>
  );
}
