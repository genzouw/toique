import { NavLink, Outlet, Link, useNavigate } from 'react-router';
import { LogOut, Inbox, Shield, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { signOut, useSession } from '../lib/auth-client';

const navItems = [{ to: '/admin/contacts', label: '問い合わせ', icon: Inbox }];

/**
 * 運営者エリア共通レイアウト。
 * URL プレフィックス /admin 配下で使われ、契約者向け管理画面とは視覚的に区別する。
 */
export default function AdminLayout() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-full bg-slate-50">
      <aside className="w-60 border-r border-slate-800 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="text-xl font-bold flex items-center gap-2">
            <Shield size={18} className="text-amber-400" />
            Toique
          </div>
          <div className="text-xs text-amber-400 mt-0.5">運営者エリア</div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                    isActive
                      ? 'bg-amber-500 text-slate-900 font-medium'
                      : 'text-slate-300 hover:bg-slate-800',
                  )
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800"
          >
            <ArrowLeft size={14} />
            契約者向け画面へ
          </Link>
        </nav>
        <div className="px-5 py-3 border-t border-slate-800">
          {session?.user && (
            <>
              <div className="text-xs text-slate-400 truncate">
                {session.user.email}
              </div>
              <button
                onClick={handleSignOut}
                className="mt-2 w-full inline-flex items-center gap-2 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-md"
              >
                <LogOut size={12} />
                ログアウト
              </button>
            </>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
