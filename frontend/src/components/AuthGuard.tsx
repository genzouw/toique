import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from '../lib/auth-client';
import { api, type OnboardingStatus } from '../lib/api';

type Props = {
  requireTenant?: boolean;
  // テナント登録済みユーザーがこのページに入ろうとしたら /dashboard へ戻す
  redirectIfTenantExists?: boolean;
  children: React.ReactNode;
};

export default function AuthGuard({
  requireTenant = true,
  redirectIfTenantExists = false,
  children,
}: Props) {
  const { data: session, isPending } = useSession();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [loading, setLoading] = useState(
    requireTenant || redirectIfTenantExists,
  );
  const location = useLocation();

  useEffect(() => {
    if (!requireTenant && !redirectIfTenantExists) return;
    if (isPending) return;
    if (!session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const s = await api.getOnboardingStatus();
        setStatus(s);
        setFetchFailed(false);
      } catch {
        // 取得失敗を未登録扱いにして /onboarding へ飛ばさない
        setFetchFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [isPending, session?.user, requireTenant, redirectIfTenantExists]);

  if (isPending || loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        読み込み中…
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (fetchFailed) {
    return (
      <div
        role="alert"
        className="h-full flex items-center justify-center text-red-600 text-sm"
      >
        登録状況の取得に失敗しました。時間をおいて再読み込みしてください。
      </div>
    );
  }

  if (redirectIfTenantExists && status?.tenant) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireTenant && !status?.tenant) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
