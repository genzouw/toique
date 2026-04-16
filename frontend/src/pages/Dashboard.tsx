import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Dashboard() {
  const [channels, setChannels] = useState<number | null>(null);
  const [messages, setMessages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, m] = await Promise.all([
          api.listChannels(),
          api.listMessages(),
        ]);
        setChannels(c.length);
        setMessages(m.length);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
      <p className="text-sm text-slate-500 mt-1">
        Phase 1 動作状況を表示します
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <StatCard label="登録済みチャネル" value={channels} unit="件" />
        <StatCard
          label="受信メッセージ (最新100件)"
          value={messages}
          unit="件"
        />
      </div>
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
