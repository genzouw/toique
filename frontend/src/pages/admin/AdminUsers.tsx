import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Users } from 'lucide-react';
import { api, type AdminUserListItem } from '../../lib/api';
import EmptyState from '../../components/EmptyState';

export default function AdminUsers() {
  const [rows, setRows] = useState<AdminUserListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listAdminUsers()
      .then(setRows)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : '読み込みに失敗しました'),
      );
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">ユーザー一覧</h1>
        {rows !== null && (
          <div className="text-sm text-slate-500">{rows.length} 件</div>
        )}
      </div>

      <div
        role="alert"
        className={
          error
            ? 'text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2'
            : ''
        }
      >
        {error}
      </div>

      {rows === null ? (
        <div className="text-sm text-slate-500">読み込み中…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="登録ユーザーはまだいません。"
          description="システムに登録されているユーザーがここに表示されます。"
          className="bg-white border border-slate-200 rounded-lg"
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-slate-700 whitespace-nowrap">
                  登録日時
                </th>
                <th className="px-4 py-2 font-medium text-slate-700">名前</th>
                <th className="px-4 py-2 font-medium text-slate-700">メール</th>
                <th className="px-4 py-2 font-medium text-slate-700">
                  メール認証
                </th>
                <th className="px-4 py-2 font-medium text-slate-700">
                  テナント
                </th>
                <th className="px-4 py-2 font-medium text-slate-700">プラン</th>
                <th className="px-4 py-2 font-medium text-slate-700">ロール</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      to={`/admin/users/${row.id}`}
                      className="text-slate-900 hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-700 break-all">
                    {row.email}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                        row.emailVerified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {row.emailVerified ? '認証済み' : '未認証'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {row.tenantName ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {row.tenantPlan ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {row.tenantRole ?? '—'}
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
