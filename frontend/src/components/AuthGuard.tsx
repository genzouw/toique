import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from '../lib/auth-client';
import { api, type OnboardingStatus } from '../lib/api';

type Props = {
  requireTenant?: boolean;
  children: React.ReactNode;
};

export default function AuthGuard({ requireTenant = true, children }: Props) {
  const { data: session, isPending } = useSession();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(requireTenant);
  const location = useLocation();

  useEffect(() => {
    if (!requireTenant) return;
    if (isPending) return;
    if (!session?.user) {
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
  }, [isPending, session?.user, requireTenant]);

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

  if (requireTenant && !status?.tenant) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
