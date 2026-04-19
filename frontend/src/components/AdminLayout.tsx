import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router';
import { LogOut, Inbox, Shield, ArrowLeft, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/admin/contacts', label: 'システム問い合わせ', icon: Inbox },
];

/**
 * 運営者エリア共通レイアウト。
 * URL プレフィックス /admin 配下で使われ、契約者向け管理画面とは視覚的に区別する。
 */
export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  function handleSignOut() {
    localStorage.removeItem('adminAuth');
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-50">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-slate-100 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-amber-400" />
          <div className="text-lg font-bold">Toique</div>
          <div className="text-xs text-amber-400 mt-1 ml-1">運営者エリア</div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          aria-label="メニューを開く"
          className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-md"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 border-r border-slate-800 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xl font-bold flex items-center gap-2">
              <Shield size={18} className="text-amber-400" />
              Toique
            </div>
            <div className="text-xs text-amber-400 mt-0.5">運営者エリア</div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            aria-label="メニューを閉じる"
            className="md:hidden p-1 text-slate-400 hover:bg-slate-800 rounded-md"
          >
            <X size={20} />
          </button>
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
          <div className="text-xs text-slate-400 truncate">
            運営者アカウント
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 w-full inline-flex items-center gap-2 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-md"
          >
            <LogOut size={12} />
            ログアウト
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
