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
    (async () => {
      try {
        const s = await api.getOnboardingStatus();
        setStatus(s);
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

  if (redirectIfTenantExists && status?.tenant) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireTenant && !status?.tenant) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
