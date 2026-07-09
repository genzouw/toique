import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Mail } from 'lucide-react';
import { formatDate } from '../../lib/format-date';
import {
  api,
  type ContactListItem,
  type ContactStatus,
  type ContactCategory,
} from '../../lib/api';
import EmptyState from '../../components/EmptyState';

const STATUS_LABEL: Record<ContactStatus, string> = {
  new: '新着',
  in_review: '対応中',
  done: '完了',
};

const CATEGORY_LABEL: Record<ContactCategory, string> = {
  bug: '不具合',
  feature: '機能要望',
  pricing: '料金プラン',
  consultation: '導入相談',
  other: 'その他',
};

const STATUS_PILL: Record<ContactStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  in_review: 'bg-amber-100 text-amber-800',
  done: 'bg-slate-200 text-slate-700',
};

export default function AdminContacts() {
  const [rows, setRows] = useState<ContactListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContactStatus | 'all'>('all');

  useEffect(() => {
    api
      .listAdminContacts()
      .then(setRows)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : '読み込みに失敗しました'),
      );
  }, []);

  const filtered =
    rows?.filter((r) => filter === 'all' || r.status === filter) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          システム問い合わせ
        </h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ContactStatus | 'all')}
          className="text-sm rounded-md border border-slate-300 px-2 py-1"
          aria-label="ステータスの絞り込み"
        >
          <option value="all">すべて</option>
          <option value="new">新着</option>
          <option value="in_review">対応中</option>
          <option value="done">完了</option>
        </select>
      </div>

      {error && (
        <div
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          {error}
        </div>
      )}

      {rows === null ? (
        <div className="text-sm text-slate-500">読み込み中…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="システム問い合わせはありません。"
          description="ユーザーからのシステムに関するお問い合わせがここに表示されます。"
          className="bg-white border border-slate-200 rounded-lg"
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-slate-700">
                  受信日時
                </th>
                <th className="px-4 py-2 font-medium text-slate-700">種別</th>
                <th className="px-4 py-2 font-medium text-slate-700">件名</th>
                <th className="px-4 py-2 font-medium text-slate-700">お名前</th>
                <th className="px-4 py-2 font-medium text-slate-700">
                  テナント
                </th>
                <th className="px-4 py-2 font-medium text-slate-700">
                  ステータス
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {CATEGORY_LABEL[row.category]}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      to={`/admin/contacts/${row.id}`}
                      className="text-slate-900 hover:underline"
                    >
                      {row.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{row.name}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {row.tenantName ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs ${STATUS_PILL[row.status]}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
