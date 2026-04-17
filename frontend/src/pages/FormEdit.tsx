import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { api, type Form, type LineChannel } from '../lib/api';

const DEFAULT_SCHEMA = {
  startStep: 'カテゴリ',
  steps: {
    カテゴリ: {
      type: 'choice',
      prompt: 'ご希望のカテゴリを選んでください',
      field: 'カテゴリ',
      choices: [
        { label: '時計', value: '時計', next: 'ブランド' },
        { label: 'バッグ', value: 'バッグ', next: 'ブランド' },
        {
          label: '宝石・ジュエリー',
          value: '宝石・ジュエリー',
          next: 'ブランド',
        },
        { label: 'アパレル', value: 'アパレル', next: 'ブランド' },
      ],
    },
    ブランド: {
      type: 'text',
      prompt: 'ブランド名を教えてください',
      field: 'ブランド',
      next: 'お名前',
    },
    お名前: {
      type: 'text',
      prompt: 'お名前をフルネームで教えてください',
      field: 'お名前',
      next: '完了',
    },
    完了: {
      type: 'end',
      thanks:
        'お問い合わせありがとうございました。担当者よりご連絡いたします。',
    },
  },
};

export default function FormEdit() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const [channels, setChannels] = useState<LineChannel[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [name, setName] = useState('');
  const [lineChannelId, setLineChannelId] = useState('');
  const [status, setStatus] = useState<Form['status']>('draft');
  const [triggerKeyword, setTriggerKeyword] = useState('');
  const [schemaJson, setSchemaJson] = useState(
    JSON.stringify(DEFAULT_SCHEMA, null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [chs, f] = await Promise.all([
          api.listChannels(),
          !isNew ? api.getForm(id!) : Promise.resolve(null),
        ]);
        setChannels(chs);
        if (f) {
          setForm(f);
          setName(f.name);
          setLineChannelId(f.lineChannelId);
          setStatus(f.status);
          setTriggerKeyword(f.triggerKeyword ?? '');
          setSchemaJson(JSON.stringify(f.schema, null, 2));
        } else if (chs.length > 0) {
          setLineChannelId(chs[0].id);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let schema: Record<string, unknown>;
      try {
        schema = JSON.parse(schemaJson);
      } catch {
        throw new Error('JSON の構文が不正です');
      }
      if (isNew) {
        const created = await api.createForm({
          name,
          lineChannelId,
          status,
          triggerKeyword: triggerKeyword.trim() || null,
          schema,
        });
        navigate(`/forms/${created.id}`, { replace: true });
      } else {
        await api.updateForm(id!, {
          name,
          status,
          triggerKeyword: triggerKeyword.trim() || null,
          schema,
        });
        setForm((prev) => (prev ? { ...prev, name, status } : prev));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || isNew) return;
    if (!confirm('削除してよろしいですか？')) return;
    try {
      await api.deleteForm(id);
      navigate('/forms', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500">読み込み中…</div>;
  }

  return (
    <div>
      <Link
        to="/forms"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft size={14} />
        フォーム一覧に戻る
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          {isNew ? '新規フォーム' : form?.name || 'フォーム編集'}
        </h1>
        {!isNew && (
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
            aria-label="削除"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <Field label="表示名">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          />
        </Field>

        <Field label="LINE チャネル">
          <select
            value={lineChannelId}
            onChange={(e) => setLineChannelId(e.target.value)}
            disabled={!isNew}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-50"
          >
            <option value="">選択してください</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.displayName}
              </option>
            ))}
          </select>
          {!isNew && (
            <div className="text-xs text-slate-500 mt-1">
              作成後はチャネル変更できません
            </div>
          )}
        </Field>

        <Field label="ステータス">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Form['status'])}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          >
            <option value="draft">下書き</option>
            <option value="published">公開中</option>
            <option value="archived">アーカイブ</option>
          </select>
          <div className="text-xs text-slate-500 mt-1">
            公開中の場合のみトリガーキーワードで起動します
          </div>
        </Field>

        <Field label="トリガーキーワード">
          <input
            value={triggerKeyword}
            onChange={(e) => setTriggerKeyword(e.target.value)}
            placeholder="例: 査定"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          />
        </Field>

        <Field label="スキーマ (JSON)">
          <textarea
            value={schemaJson}
            onChange={(e) => setSchemaJson(e.target.value)}
            rows={20}
            spellCheck={false}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs font-mono bg-slate-50"
          />
        </Field>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !name || !lineChannelId}
            className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
