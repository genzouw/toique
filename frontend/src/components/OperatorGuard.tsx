import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from '../lib/auth-client';
import { api } from '../lib/api';

type State = 'loading' | 'operator' | 'not-operator';

/**
 * 運営者のみ通すガード。
 * - 未ログイン → /login
 * - ログイン済みだが運営者でない → / (トップへ戻す)
 * - 運営者 → children 表示
 */
export default function OperatorGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<State>('loading');
  const location = useLocation();

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setState('not-operator');
      return;
    }
    (async () => {
      try {
        await api.getAdminMe();
        setState('operator');
      } catch {
        setState('not-operator');
      }
    })();
  }, [isPending, session?.user]);

  if (isPending || state === 'loading') {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        読み込み中…
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (state === 'not-operator') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
