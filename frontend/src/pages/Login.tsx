import { useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { ICON_SIZE } from '../lib/icon-size';
import { useNavigate, Link } from 'react-router';
import { signIn } from '../lib/auth-client';
import SEOMetadata from '../components/SEOMetadata';
import LoadingButton from '../components/LoadingButton';

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
        {error && <div className="text-red-600 text-sm">{error}</div>}
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
        <Link to="/signup" className="text-slate-900 underline">
          新規登録
        </Link>
      </div>
      <div className="mt-2 text-sm text-slate-600">
        <Link to="/forgot-password" className="text-slate-900 underline">
          パスワードを忘れた方
        </Link>
      </div>
    </AuthLayout>
  );
}

export function AuthLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="text-xl font-bold text-slate-900">Toique</div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
      <a
        href="/help"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 text-xs text-slate-500 hover:text-slate-900 underline"
      >
        使い方・ヘルプを見る
      </a>
    </div>
  );
}

export function AuthField({
  label,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="mt-1 relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className={`w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${isPassword ? 'pr-10' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-controls={id}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-sm"
            aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
            title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
          >
            {showPassword ? (
              <EyeOff size={ICON_SIZE.sm} />
            ) : (
              <Eye size={ICON_SIZE.sm} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
