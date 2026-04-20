import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { api } from '../lib/api';

type State = 'loading' | 'operator' | 'not-operator';

/**
 * 運営者のみ通すガード。
 * - Basic認証のトークンがlocalStorageにない、または不正 → /admin/login
 * - 運営者 → children 表示
 */
export default function OperatorGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<State>('loading');
  const location = useLocation();

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (!adminAuth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  }, []);

  if (state === 'loading') {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        読み込み中…
      </div>
    );
  }

  if (state === 'not-operator') {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
