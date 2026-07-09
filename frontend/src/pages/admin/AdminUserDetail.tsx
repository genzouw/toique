import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import {
  api,
  type AdminUserDetail as AdminUserDetailType,
} from '../../lib/api';
import { formatDate } from '../../lib/format-date';

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminUserDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getAdminUser(id)
      .then(setDetail)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : '読み込みに失敗しました'),
      );
  }, [id]);

  if (error) {
    return (
      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
        {error}
      </div>
    );
  }

  if (!detail) {
    return <div className="text-sm text-slate-500">読み込み中…</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          一覧へ戻る
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">{detail.name}</h1>
        <div className="text-sm text-slate-600 break-all">{detail.email}</div>
      </header>

      <section className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Info
          label="ユーザーID"
          value={<code className="text-xs">{detail.id}</code>}
        />
        <Info
          label="メール認証"
          value={
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                detail.emailVerified
                  ? 'bg-green-100 text-green-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {detail.emailVerified ? '認証済み' : '未認証'}
            </span>
          }
        />
        <Info label="登録日時" value={formatDate(detail.createdAt)} />
        <Info label="更新日時" value={formatDate(detail.updatedAt)} />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">所属テナント</h2>
        {detail.tenantId ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Info label="テナント名" value={detail.tenantName ?? '—'} />
            <Info
              label="テナントID"
              value={<code className="text-xs">{detail.tenantId}</code>}
            />
            <Info label="プラン" value={detail.tenantPlan ?? '—'} />
            <Info label="ロール" value={detail.tenantRole ?? '—'} />
            <Info
              label="テナント作成日時"
              value={
                detail.tenantCreatedAt
                  ? formatDate(detail.tenantCreatedAt)
                  : '—'
              }
            />
          </div>
        ) : (
          <div className="text-sm text-slate-500">
            テナント未所属（オンボーディング未完了）
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-slate-900">{value}</div>
    </div>
  );
}
