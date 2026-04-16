import { useEffect, useState } from 'react';
import { RefreshCw, Inbox } from 'lucide-react';
import { api, type Submission, type Form } from '../lib/api';

const STATUS_LABEL: Record<Submission['status'], string> = {
  new: '新着',
  in_review: '対応中',
  done: '完了',
};

const STATUS_COLOR: Record<Submission['status'], string> = {
  new: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  done: 'bg-slate-100 text-slate-700',
};

export default function Submissions() {
  const [items, setItems] = useState<Submission[]>([]);
  const [forms, setForms] = useState<Record<string, Form>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [subs, fs] = await Promise.all([
        api.listSubmissions(),
        api.listForms(),
      ]);
      setItems(subs);
      setForms(Object.fromEntries(fs.map((f) => [f.id, f])));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">問い合わせ</h1>
          <p className="text-sm text-slate-500 mt-1">
            フォーム完了時に記録された問い合わせデータです
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100"
        >
          <RefreshCw size={14} />
          更新
        </button>
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
          <div className="p-8 text-center text-sm text-slate-500">
            <Inbox className="mx-auto mb-2 text-slate-300" size={32} />
            まだ問い合わせはありません
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">受信日時</th>
                <th className="text-left px-4 py-2 font-medium">フォーム</th>
                <th className="text-left px-4 py-2 font-medium">ステータス</th>
                <th className="text-left px-4 py-2 font-medium">回答内容</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((s) => (
                <tr key={s.id} className="align-top">
                  <td className="px-4 py-2 text-slate-700 whitespace-nowrap">
                    {new Date(s.submittedAt).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-4 py-2 text-slate-900 whitespace-nowrap">
                    {forms[s.formId]?.name ?? s.formId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${STATUS_COLOR[s.status]}`}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    <AnswerSummary answers={s.answers} />
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

function AnswerSummary({ answers }: { answers: Record<string, unknown> }) {
  const entries = Object.entries(answers);
  if (entries.length === 0) {
    return <span className="text-slate-400">(なし)</span>;
  }
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-xs text-slate-500">{key}</dt>
          <dd className="text-sm text-slate-900">
            {typeof value === 'string' ? value : JSON.stringify(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
