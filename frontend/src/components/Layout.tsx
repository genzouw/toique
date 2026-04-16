import { NavLink, Outlet } from 'react-router';
import { MessageSquare, Plug, LayoutDashboard } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { to: '/channels', label: 'LINEチャネル', icon: Plug },
  { to: '/messages', label: '受信メッセージ', icon: MessageSquare },
];

export default function Layout() {
  return (
    <div className="flex h-full bg-slate-50">
      <aside className="w-60 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="text-xl font-bold text-slate-900">Toique</div>
          <div className="text-xs text-slate-500 mt-0.5">管理画面</div>
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
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100',
                  )
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-5 py-3 text-xs text-slate-400 border-t border-slate-200">
          v0.1.0 (Phase 2b)
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
