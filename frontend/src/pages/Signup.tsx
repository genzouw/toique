import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { signUp } from '../lib/auth-client';
import { AuthLayout } from '../components/AuthLayout';
import { AuthField } from '../components/AuthField';
import SEOMetadata from '../components/SEOMetadata';
import LoadingButton from '../components/LoadingButton';

export default function Signup() {
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
    // 確認メール送信完了の案内ページに遷移する。
    // Signup は RedirectIfAuthed 配下にあり、sign-up 成功後の session refetch で
    // 一瞬アンマウントされるため、ここで state を保持せず別ルートに飛ばす。
    navigate('/verify-email-sent', { state: { email }, replace: true });
  }

  return (
    <AuthLayout title="新規登録">
      <SEOMetadata
        title="無料でアカウント登録 | Toique"
        description="Toiqueの無料アカウント登録ページ。LINE公式アカウント連携と対話フォームによる問い合わせ自動受付を今すぐ始められます。"
      />
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
        {error && (
          <div className="text-red-600 text-sm" role="alert">
            {error}
          </div>
        )}
        <LoadingButton
          type="submit"
          loading={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '登録中…' : 'アカウント登録'}
        </LoadingButton>
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
