import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { AuthLayout } from './Login';
import { useSEO } from '../lib/useSEO';
import LoadingButton from '../components/LoadingButton';

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

interface LocationState {
  email?: string;
}

/**
 * サインアップ直後に「確認メールを送信しました」を案内するページ。
 * Signup ページから navigate されると state.email が渡ってくる。
 *
 * 注意: このページは RedirectIfAuthed でラップしない。
 *   better-auth React Client は sign-up/email 成功後に session signal を発火し
 *   useSession を refetch させる。RedirectIfAuthed 配下のページは isPending 中に
 *   一瞬アンマウントされ state が破棄されるため、専用ルートに切り出している。
 */
export default function VerifyEmailSent() {
  useSEO({
    title: '確認メールを送信しました | Toique',
    description: '確認メールを送信しました',
  });
  const location = useLocation();
  const email = (location.state as LocationState | null)?.email;

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setResendError(null);
    setResent(false);
    try {
      const res = await fetch(`${API_URL}/api/auth/send-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          callbackURL: `${window.location.origin}/verify-email?verified=1`,
        }),
      });
      if (!res.ok) {
        setResendError('再送に失敗しました。時間をおいて再度お試しください。');
        return;
      }
      setResent(true);
    } catch {
      setResendError('通信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setResending(false);
    }
  }

  // /verify-email-sent に直アクセスされた場合 (state なし)
  if (!email) {
    return (
      <AuthLayout title="確認メールを送信しました">
        <div className="space-y-4 text-sm text-slate-700">
          <p>
            確認メールを送信した後の案内ページです。新規登録を行うとここに案内が表示されます。
          </p>
          <Link
            to="/signup"
            className="block w-full text-center px-4 py-2 bg-slate-900 text-white rounded-md"
          >
            新規登録ページへ
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="確認メールを送信しました">
      <div className="space-y-4 text-sm text-slate-700">
        <p>
          <span className="font-medium">{email}</span>{' '}
          宛に確認メールを送信しました。
        </p>
        <p>
          メール本文のリンクをクリックしてメールアドレスを確認してから、ログインしてください。
        </p>
        <p className="text-slate-600">
          メールが届かない場合は、迷惑メールフォルダをご確認のうえ、下記から再送信できます。
        </p>
        <LoadingButton
          type="button"
          loading={resending}
          onClick={handleResend}
          className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resending ? '再送中…' : '確認メールを再送する'}
        </LoadingButton>
        {resent && (
          <div className="text-sm text-emerald-600">
            再送しました。メールをご確認ください。
          </div>
        )}
        {resendError && (
          <div className="text-sm text-red-600">{resendError}</div>
        )}
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
