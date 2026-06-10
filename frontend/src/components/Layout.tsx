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
  Shield,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ICON_SIZE } from '../lib/icon-size';
import { signOut, useSession } from '../lib/auth-client';
import { api, type UsageResponse } from '../lib/api';
import { useMobileSidebar } from '../hooks/useMobileSidebar';
import { MobileHeader, SidebarOverlay, SidebarPanel } from './MobileSidebar';

const navItems = [
  { to: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { to: '/channels', label: 'LINEチャネル', icon: Plug },
  { to: '/forms', label: 'フォーム', icon: FileText },
  { to: '/submissions', label: 'フォーム回答', icon: Inbox },
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
  const [isOperator, setIsOperator] = useState(false);
  const { isSidebarOpen, openSidebar, closeSidebar } = useMobileSidebar();

  useEffect(() => {
    api
      .getUsage()
      .then((u) => setBannerLevel(evaluateBanner(u)))
      .catch(() => {});
    // 運営者判定: 404 (非運営者) は握りつぶす
    api
      .getAdminMe()
      .then(() => setIsOperator(true))
      .catch(() => setIsOperator(false));
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const showBanner = bannerLevel !== 'none' && !dismissed;

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-50">
      <MobileHeader
        onOpen={openSidebar}
        headerClassName="bg-white border-b border-slate-200"
        menuButtonClassName="text-slate-600 hover:bg-slate-100"
        header={
          <div className="flex items-center gap-2">
            <div className="text-lg font-bold text-slate-900">Toique</div>
            <div className="text-xs text-slate-500 mt-1">管理画面</div>
          </div>
        }
      />

      <SidebarOverlay isOpen={isSidebarOpen} onClose={closeSidebar} />

      <SidebarPanel
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        sidebarClassName="bg-white border-r border-slate-200"
        sidebarHeaderClassName="border-slate-200"
        closeButtonClassName="text-slate-500 hover:bg-slate-100"
        sidebarHeader={
          <div>
            <div className="text-xl font-bold text-slate-900">Toique</div>
            <div className="text-xs text-slate-500 mt-0.5">管理画面</div>
          </div>
        }
      >
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 transition-colors',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100',
                  )
                }
              >
                <Icon size={ICON_SIZE.md} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
          <a
            href="/help"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 transition-colors"
          >
            <HelpCircle size={ICON_SIZE.md} aria-hidden="true" />
            ヘルプ
            <ExternalLink
              size={ICON_SIZE.xs}
              className="ml-auto text-slate-400"
              aria-hidden="true"
            />
          </a>
          {isOperator && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-amber-700 hover:bg-amber-50 border border-dashed border-amber-300 mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 transition-colors"
            >
              <Shield size={ICON_SIZE.md} />
              運営者エリア
            </Link>
          )}
        </nav>
        <div className="px-5 py-3 border-t border-slate-200">
          {session?.user && (
            <>
              <div className="text-xs text-slate-500 truncate">
                {session.user.email}
              </div>
              <button
                onClick={handleSignOut}
                className="mt-2 w-full inline-flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 transition-colors"
              >
                <LogOut size={ICON_SIZE.xs} aria-hidden="true" />
                ログアウト
              </button>
            </>
          )}
        </div>
      </SidebarPanel>
      <main className="flex-1 overflow-auto p-4 md:p-8">
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
            <button
              onClick={() => setDismissed(true)}
              className="ml-4 p-1 rounded-md hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current transition-colors"
              title="メッセージを閉じる"
              aria-label="メッセージを閉じる"
            >
              <X size={ICON_SIZE.sm} />
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
