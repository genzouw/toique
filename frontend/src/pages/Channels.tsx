import { useEffect, useState } from 'react';
import { Trash2, MessageCircle } from 'lucide-react';
import { api, type LineChannel } from '../lib/api';
import { ICON_SIZE } from '../lib/icon-size';

export default function Channels() {
  const [items, setItems] = useState<LineChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    channelId: '',
    channelSecret: '',
    channelAccessToken: '',
    displayName: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await api.listChannels());
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createChannel(form);
      setForm({
        channelId: '',
        channelSecret: '',
        channelAccessToken: '',
        displayName: '',
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('削除してよろしいですか？')) return;
    try {
      await api.deleteChannel(id);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">LINEチャネル管理</h1>
      <p className="text-sm text-slate-500 mt-1">
        Webhook URL は{' '}
        <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">
          /webhooks/line/&lt;Channel ID&gt;
        </code>{' '}
        になります
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-lg p-5"
      >
        <Field
          label="表示名"
          value={form.displayName}
          onChange={(v) => setForm({ ...form, displayName: v })}
          placeholder="例: テスト用チャネル"
        />
        <Field
          label="Channel ID"
          value={form.channelId}
          onChange={(v) => setForm({ ...form, channelId: v })}
          placeholder="2001234567"
        />
        <Field
          label="Channel Secret"
          value={form.channelSecret}
          onChange={(v) => setForm({ ...form, channelSecret: v })}
          placeholder="32文字のシークレット"
          type="password"
        />
        <Field
          label="Channel Access Token"
          value={form.channelAccessToken}
          onChange={(v) => setForm({ ...form, channelAccessToken: v })}
          placeholder="long-lived token"
          type="password"
        />
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm disabled:opacity-50"
          >
            {submitting ? '登録中…' : 'チャネルを登録'}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          登録済みチャネル ({items.length})
        </h2>
        {loading ? (
          <div className="mt-4 text-sm text-slate-500">読み込み中…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-lg mt-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="text-slate-400" size={ICON_SIZE.xxl} />
            </div>
            <h2 className="text-sm font-medium text-slate-900 mb-1">
              まだ登録されていません
            </h2>
            <p className="text-sm text-slate-500 max-w-sm">
              上のフォームから新しいLINEチャネルを登録してください。
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
            {items.map((ch) => (
              <li
                key={ch.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {ch.displayName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Channel ID: {ch.channelId}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(ch.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  aria-label="削除"
                >
                  <Trash2 size={ICON_SIZE.md} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
      />
    </label>
  );
}
