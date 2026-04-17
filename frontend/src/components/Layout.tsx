import { NavLink, Outlet, useNavigate, Link } from 'react-router';
import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Plug,
  LayoutDashboard,
  LogOut,
  FileText,
  Inbox,
  HelpCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { signOut, useSession } from '../lib/auth-client';
import { api, type UsageResponse } from '../lib/api';

const navItems = [
  { to: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { to: '/channels', label: 'LINEチャネル', icon: Plug },
  { to: '/forms', label: 'フォーム', icon: FileText },
  { to: '/submissions', label: '問い合わせ', icon: Inbox },
  { to: '/messages', label: '受信メッセージ', icon: MessageSquare },
];

type BannerLevel = 'none' | 'warning' | 'critical';

function evaluateBanner(usage: UsageResponse | null): BannerLevel {
  if (!usage) return 'none';
  for (const resource of Object.values(usage.usage)) {
    if (resource.limit === -1) continue;
    if (resource.current >= resource.limit) return 'critical';
  }
  for (const resource of Object.values(usage.usage)) {
    if (resource.limit === -1) continue;
    if (resource.current / resource.limit >= 0.8) return 'warning';
  }
  return 'none';
}

export default function Layout() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [bannerLevel, setBannerLevel] = useState<BannerLevel>('none');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api
      .getUsage()
      .then((u) => setBannerLevel(evaluateBanner(u)))
      .catch(() => {});
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const showBanner = bannerLevel !== 'none' && !dismissed;

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
          <a
            href="/help"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100"
          >
            <HelpCircle size={16} />
            ヘルプ
            <ExternalLink size={12} className="ml-auto text-slate-400" />
          </a>
        </nav>
        <div className="px-5 py-3 border-t border-slate-200">
          {session?.user && (
            <>
              <div className="text-xs text-slate-500 truncate">
                {session.user.email}
              </div>
              <button
                onClick={handleSignOut}
                className="mt-2 w-full inline-flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-md"
              >
                <LogOut size={12} />
                ログアウト
              </button>
            </>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {showBanner && (
          <div
            className={`mb-6 px-4 py-3 rounded-md text-sm flex items-center justify-between ${
              bannerLevel === 'critical'
                ? 'bg-red-50 text-red-800'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            <span>
              {bannerLevel === 'critical'
                ? '利用上限に達しているリソースがあります。'
                : '利用上限に近づいているリソースがあります。'}
              <Link to="/pricing" className="ml-1 underline font-medium">
                料金プランを見る
              </Link>
            </span>
            <button onClick={() => setDismissed(true)} className="ml-4">
              <X size={14} />
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
