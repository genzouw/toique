import { useEffect, useState, useId, useCallback, memo } from 'react';
import { Trash2, Copy, Check, MessageCircle } from 'lucide-react';
import { api, type LineChannel } from '../lib/api';
import { ICON_SIZE } from '../lib/icon-size';
import EmptyState from '../components/EmptyState';
import LoadingButton from '../components/LoadingButton';
import { RequiredMark } from '../components/RequiredMark';
import { buildWebhookUrl } from '../lib/webhook-url';

const COPY_FEEDBACK_DURATION_MS = 2000;

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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.listChannels());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

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

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('削除してよろしいですか？')) return;
      try {
        await api.deleteChannel(id);
        await refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [refresh],
  );

  const handleCopy = useCallback(async (channelId: string, itemId: string) => {
    const url = buildWebhookUrl(channelId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(itemId);
      window.setTimeout(() => {
        setCopiedId((current) => (current === itemId ? null : current));
      }, COPY_FEEDBACK_DURATION_MS);
    } catch {
      setError('クリップボードへのコピーに失敗しました');
    }
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">LINEチャネル管理</h1>

      <div
        className={
          error ? 'mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm' : ''
        }
        role="alert"
      >
        {error}
      </div>

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
          <LoadingButton
            type="submit"
            loading={submitting}
            className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm disabled:opacity-50"
          >
            {submitting ? '登録中…' : 'チャネルを登録'}
          </LoadingButton>
        </div>
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          登録済みチャネル ({items.length})
        </h2>
        {loading ? (
          <div className="mt-4 text-sm text-slate-500">読み込み中…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="まだ登録されていません"
            description="上のフォームから新しいLINEチャネルを登録してください。"
            className="mt-4 bg-white border border-slate-200 rounded-lg"
          />
        ) : (
          <ul className="mt-4 divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
            {items.map((ch) => (
              <ChannelRow
                key={ch.id}
                ch={ch}
                isCopied={copiedId === ch.id}
                onDelete={handleDelete}
                onCopy={handleCopy}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * ⚡ Bolt: 不要な再レンダーを防ぐために React.memo() でラップしています。
 * フォーム入力時に親コンポーネントの `form` 状態が頻繁に更新されても、
 * この ChannelRow は `ch` などの props が変更されない限り再レンダーされず、
 * パフォーマンスが向上します。
 */
const ChannelRow = memo(function ChannelRow({
  ch,
  isCopied,
  onDelete,
  onCopy,
}: {
  ch: LineChannel;
  isCopied: boolean;
  onDelete: (id: string) => void;
  onCopy: (channelId: string, itemId: string) => void;
}) {
  const webhookUrl = buildWebhookUrl(ch.channelId);
  return (
    <li className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900">{ch.displayName}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Channel ID: {ch.channelId}
          </div>
        </div>
        <button
          onClick={() => onDelete(ch.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-md shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 transition-colors"
          title={`${ch.displayName} を削除`}
          aria-label={`${ch.displayName} を削除`}
        >
          <Trash2 size={ICON_SIZE.md} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3">
        <div className="text-xs font-medium text-slate-700">Webhook URL</div>
        <div className="mt-1 flex items-stretch gap-2">
          <code
            className="flex-1 min-w-0 px-2 py-1.5 bg-slate-100 rounded text-xs text-slate-700 font-mono truncate"
            title={webhookUrl}
          >
            {webhookUrl}
          </code>
          <div className="sr-only" role="status">
            {isCopied ? 'Webhook URL をコピーしました' : ''}
          </div>
          <button
            type="button"
            onClick={() => onCopy(ch.channelId, ch.id)}
            className="px-2 py-1.5 text-slate-700 hover:bg-slate-100 rounded-md flex items-center gap-1 text-xs border border-slate-300 shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 transition-colors"
            aria-label={
              isCopied
                ? `${ch.displayName} の Webhook URL をコピー済み`
                : `${ch.displayName} の Webhook URL をコピー: ${webhookUrl}`
            }
            aria-live="polite"
          >
            {isCopied ? (
              <>
                <Check size={ICON_SIZE.xs} />
                コピー済み
              </>
            ) : (
              <>
                <Copy size={ICON_SIZE.xs} />
                コピー
              </>
            )}
          </button>
        </div>
      </div>
    </li>
  );
});

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  // 任意項目のフィールドを追加したときに必須マークが嘘にならないよう、
  // 表示と <input required> を同じ値で連動させる。
  required?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <RequiredMark />}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
      />
    </div>
  );
}
