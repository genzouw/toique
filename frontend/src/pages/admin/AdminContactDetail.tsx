import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { formatDate } from '../../lib/format-date';
import {
  api,
  type ContactCategory,
  type ContactDetail,
  type ContactStatus,
} from '../../lib/api';
import { ICON_SIZE } from '../../lib/icon-size';

const CATEGORY_LABEL: Record<ContactCategory, string> = {
  bug: '不具合',
  feature: '機能要望',
  pricing: '料金プラン',
  consultation: '導入相談',
  other: 'その他',
};

const STATUSES: ContactStatus[] = ['new', 'in_review', 'done'];
const STATUS_LABEL: Record<ContactStatus, string> = {
  new: '新着',
  in_review: '対応中',
  done: '完了',
};

export default function AdminContactDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getAdminContact(id)
      .then(setDetail)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : '読み込みに失敗しました'),
      );
  }, [id]);

  async function changeStatus(status: ContactStatus) {
    if (!id) return;
    setUpdating(true);
    setError(null);
    try {
      const updated = await api.updateAdminContactStatus(id, status);
      setDetail(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  }

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
          to="/admin/contacts"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={ICON_SIZE.sm} />
          一覧へ戻る
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">{detail.subject}</h1>
        <div className="text-sm text-slate-600">
          {formatDate(detail.createdAt)} ・ {CATEGORY_LABEL[detail.category]}
        </div>
      </header>

      <section className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Info label="お名前" value={detail.name} />
        <Info
          label="メール"
          value={
            <a href={`mailto:${detail.email}`} className="underline">
              {detail.email}
            </a>
          }
        />
        <Info label="テナント" value={detail.tenantName ?? '—'} />
        <Info label="関連URL" value={detail.url ?? '—'} />
        <Info
          label="UserAgent"
          value={
            <span className="break-all text-xs text-slate-500">
              {detail.userAgent ?? '—'}
            </span>
          }
        />
        <Info
          label="IP"
          value={
            <span className="text-xs text-slate-500">
              {detail.ipAddress ?? '—'}
            </span>
          }
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">内容</h2>
        <pre className="whitespace-pre-wrap break-words text-sm text-slate-800 font-sans">
          {detail.body}
        </pre>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          ステータス
        </h2>
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              disabled={updating || detail.status === s}
              className={`px-3 py-1.5 rounded-md text-sm border focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition-colors ${
                detail.status === s
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              } disabled:opacity-60`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
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
