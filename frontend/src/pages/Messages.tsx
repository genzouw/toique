import { useEffect, useState } from 'react';
import { api, type InboundMessageListItem } from '../lib/api';
import LoadingButton from '../components/LoadingButton';

export default function Messages() {
  const [items, setItems] = useState<InboundMessageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await api.listMessages());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">受信メッセージ</h1>
          <p className="text-sm text-slate-500 mt-1">
            LINEから受信した最新100件を表示します
          </p>
        </div>
        <LoadingButton onClick={refresh} loading={loading}>
          更新
        </LoadingButton>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-slate-500">読み込み中…</div>
        ) : items.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            まだメッセージを受信していません
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">受信時刻</th>
                <th className="text-left px-4 py-2 font-medium">イベント</th>
                <th className="text-left px-4 py-2 font-medium">
                  メッセージ種別
                </th>
                <th className="text-left px-4 py-2 font-medium">テキスト</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-slate-700 whitespace-nowrap">
                    {new Date(m.receivedAt).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">
                      {m.eventType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {m.messageType ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-900">
                    {m.text ?? (
                      <span className="text-slate-400">(テキストなし)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
