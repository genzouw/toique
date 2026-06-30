import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus, FileText } from 'lucide-react';
import { api, type FormListItem } from '../lib/api';
import EmptyState from '../components/EmptyState';
import { ICON_SIZE } from '../lib/icon-size';

const STATUS_LABEL: Record<FormListItem['status'], string> = {
  draft: '下書き',
  published: '公開中',
  archived: 'アーカイブ',
};

const STATUS_COLOR: Record<FormListItem['status'], string> = {
  draft: 'bg-slate-100 text-slate-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-slate-100 text-slate-500',
};

export default function Forms() {
  const [items, setItems] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setItems(await api.listForms());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">フォーム</h1>
          <p className="text-sm text-slate-500 mt-1">
            LINE上で起動する対話型フォームを管理します
          </p>
        </div>
        <Link
          to="/forms/new"
          className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-md"
        >
          <Plus size={ICON_SIZE.sm} />
          新規作成
        </Link>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="mt-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-slate-500">読み込み中…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="フォームはまだありません"
            description="LINE上で動作する対話型フォームを作成して、問い合わせや予約の受付を自動化しましょう。"
            action={
              <Link
                to="/forms/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
              >
                <Plus size={ICON_SIZE.md} />
                最初のフォームを作成
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-200">
            {items.map((form) => (
              <li key={form.id}>
                <Link
                  to={`/forms/${form.id}`}
                  className="block px-5 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">
                        {form.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {form.triggerKeyword
                          ? `トリガー: 「${form.triggerKeyword}」`
                          : 'トリガー未設定'}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[form.status]}`}
                    >
                      {STATUS_LABEL[form.status]}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
