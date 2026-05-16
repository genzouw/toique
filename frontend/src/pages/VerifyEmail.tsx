import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AuthLayout } from './Login';
import SEOMetadata from '../components/SEOMetadata';
import { API_BASE_URL } from '../lib/api-base-url';

type Status = 'pending' | 'success' | 'error';

function formatError(code: string): string {
  switch (code) {
    case 'INVALID_TOKEN':
      return '確認用リンクが無効です。再度メール送信をお試しください。';
    case 'TOKEN_EXPIRED':
      return '確認用リンクの有効期限が切れています。再度メール送信をお試しください。';
    default:
      return `メールアドレスの確認に失敗しました (${code})`;
  }
}

/**
 * メールアドレス確認用のフロントエンド中継ページ。
 *
 * フロー:
 *   1. 初回 mount: URL に `token` だけがある状態 → backend の verify-email エンドポイントへ
 *      window.location.href でリダイレクトする。
 *   2. backend は検証後、callbackURL (このページに `?verified=1` を付与) に戻す。
 *      失敗時は callbackURL に `&error=<code>` が付く。
 *   3. 戻ってきたページが `verified=1` を見て成功表示、`error` を見て失敗表示する。
 */
export default function VerifyEmail() {
  const [params] = useSearchParams();

  const token = params.get('token');
  const verified = params.get('verified');
  const errorParam = params.get('error');

  // URL パラメータから直接派生させる。useState で初期化キャプチャすると、SPA 内の
  // パラメータ更新 (例: ブラウザバック→クエリ変化) が反映されないバグの温床になる。
  const status: Status =
    errorParam !== null
      ? 'error'
      : verified === '1'
        ? 'success'
        : !token
          ? 'error'
          : 'pending';

  const errorMessage: string | null =
    errorParam !== null
      ? formatError(errorParam)
      : !token && verified !== '1'
        ? '確認用トークンが見つかりません。'
        : null;

  useEffect(() => {
    if (status === 'pending' && token) {
      // backend の verify-email に直接遷移して検証してもらう。
      // 検証後は callbackURL (このページ + ?verified=1) に戻ってくる。
      const callbackURL = `${window.location.origin}/verify-email?verified=1`;
      window.location.replace(
        `${API_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(
          token,
        )}&callbackURL=${encodeURIComponent(callbackURL)}`,
      );
    }
  }, [status, token]);

  return (
    <AuthLayout title="メールアドレスの確認">
      <SEOMetadata
        title="メールアドレスの確認 | Toique"
        description="メールアドレスの確認"
      />
      {status === 'pending' && (
        <div className="text-sm text-slate-700">確認中…</div>
      )}
      {status === 'success' && (
        <div className="space-y-4">
          <div className="text-sm text-slate-700">
            メールアドレスの確認が完了しました。ログインしてサービスをご利用ください。
          </div>
          <Link
            to="/login"
            className="block w-full text-center px-4 py-2 bg-slate-900 text-white rounded-md text-sm"
          >
            ログインへ
          </Link>
        </div>
      )}
      {status === 'error' && (
        <div className="space-y-4">
          <div className="text-sm text-red-600">{errorMessage}</div>
          <Link
            to="/signup"
            className="block w-full text-center px-4 py-2 bg-slate-900 text-white rounded-md text-sm"
          >
            新規登録ページへ
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
