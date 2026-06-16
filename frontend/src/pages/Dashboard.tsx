import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api, type UsageResponse, type ResourceUsage } from '../lib/api';
import LoadingButton from '../components/LoadingButton';

const RESOURCE_LABELS: Record<string, string> = {
  lineChannels: 'LINEチャネル',
  forms: 'フォーム',
  submissionsPerMonth: '今月の回答数',
  members: 'メンバー',
};

export default function Dashboard() {
  const [channels, setChannels] = useState<number | null>(null);
  const [messages, setMessages] = useState<number | null>(null);
  const [usageData, setUsageData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [m, u] = await Promise.all([api.countMessages(), api.getUsage()]);
        setChannels(u.usage.lineChannels.current);
        setMessages(m.count);
        setUsageData(u);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
          {usageData && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">
              {usageData.plan === 'pro' ? 'Pro' : 'Free'} プラン
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <StatCard label="登録済みチャネル" value={channels} unit="件" />
        <StatCard label="受信メッセージ (累計)" value={messages} unit="件" />
      </div>

      {/* 利用状況 */}
      {usageData && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">利用状況</h2>
          <div className="mt-4 grid gap-3">
            {(Object.entries(usageData.usage) as [string, ResourceUsage][]).map(
              ([key, resource]) => (
                <UsageBar
                  key={key}
                  label={RESOURCE_LABELS[key] ?? key}
                  current={resource.current}
                  limit={resource.limit}
                />
              ),
            )}
          </div>
          <div className="mt-4 flex gap-4">
            {usageData.plan === 'free' ? (
              <Link
                to="/pricing"
                className="text-sm text-slate-600 hover:text-slate-900 underline focus-ring rounded-sm transition-colors"
              >
                Pro プランにアップグレード
              </Link>
            ) : (
              <LoadingButton
                loading={managing}
                onClick={async () => {
                  setManaging(true);
                  try {
                    const { url } = await api.createPortalSession();
                    if (url) window.location.href = url;
                  } catch {
                    setError('ポータルの表示に失敗しました');
                  } finally {
                    setManaging(false);
                  }
                }}
                className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 underline disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
              >
                サブスクリプション管理
              </LoadingButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">
          {value ?? '—'}
        </span>
        <span className="text-sm text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

function UsageBar({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const color =
    pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium text-slate-900">
          {current} / {isUnlimited ? '無制限' : limit}
        </span>
      </div>
      {!isUnlimited && (
        <div
          className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden"
          role="progressbar"
          aria-label={`${label}の利用状況`}
          aria-valuenow={Math.min(current, limit)}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuetext={`${current} / ${limit}`}
        >
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
