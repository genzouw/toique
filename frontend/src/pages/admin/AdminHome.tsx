import { Link } from 'react-router';
import { Inbox, Users } from 'lucide-react';
import { ICON_SIZE } from '../../lib/icon-size';

/**
 * 運営者エリアのトップ。将来的にサマリーや他の運営機能の入口として拡張する。
 */
export default function AdminHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          運営者ダッシュボード
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Toique を運営する側のみがアクセスできる管理エリアです。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/admin/contacts"
          className="block bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-400 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Inbox size={ICON_SIZE.lg} />
            システム問い合わせ
          </div>
          <p className="text-sm text-slate-600 mt-1">
            契約者・見込み客から届いたシステム問い合わせを確認・対応します。
          </p>
        </Link>
        <Link
          to="/admin/users"
          className="block bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-400 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Users size={ICON_SIZE.lg} />
            ユーザー
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Toique に登録済みのユーザー一覧と所属テナントを確認します。
          </p>
        </Link>
      </div>
    </div>
  );
}
