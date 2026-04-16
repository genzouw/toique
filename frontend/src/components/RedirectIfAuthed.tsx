import { Navigate } from 'react-router';
import { useSession } from '../lib/auth-client';

// ログイン状態で /login や /signup を開いた時に /dashboard へ戻す
export default function RedirectIfAuthed({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        読み込み中…
      </div>
    );
  }

  if (session?.user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
