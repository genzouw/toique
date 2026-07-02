import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { api, type Form, type LineChannel } from '../lib/api';
import FormSchemaBuilder from '../components/FormSchemaBuilder';
import { ICON_SIZE } from '../lib/icon-size';
import LoadingButton from '../components/LoadingButton';

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

type TabId = 'visual' | 'json';

const TAB_ORDER: TabId[] = ['visual', 'json'];

/** JSON スキーマのバリデーション */
function validateSchema(schema: Record<string, unknown>): string | null {
  if (!schema.startStep || typeof schema.startStep !== 'string') {
    return 'startStep が必要です';
  }
  if (
    !schema.steps ||
    typeof schema.steps !== 'object' ||
    Array.isArray(schema.steps)
  ) {
    return 'steps オブジェクトが必要です';
  }
  const steps = schema.steps as Record<string, Record<string, unknown>>;
  if (!(schema.startStep in steps)) {
    return `startStep "${schema.startStep}" が steps に存在しません`;
  }

  let hasEnd = false;
  for (const [id, step] of Object.entries(steps)) {
    if (!step.type) return `ステップ "${id}" に type がありません`;
    if (step.type === 'end') {
      hasEnd = true;
      if (!step.thanks || typeof step.thanks !== 'string') {
        return `ステップ "${id}" に thanks メッセージが必要です`;
      }
    } else if (step.type === 'text') {
      if (!step.prompt) return `ステップ "${id}" に prompt が必要です`;
      if (!step.field) return `ステップ "${id}" に field が必要です`;
      if (!step.next || !((step.next as string) in steps)) {
        return `ステップ "${id}" の next "${step.next}" が steps に存在しません`;
      }
    } else if (step.type === 'choice') {
      if (!step.prompt) return `ステップ "${id}" に prompt が必要です`;
      if (!step.field) return `ステップ "${id}" に field が必要です`;
      if (!Array.isArray(step.choices) || step.choices.length === 0) {
        return `ステップ "${id}" に choices が必要です`;
      }
      for (const c of step.choices as Array<Record<string, string>>) {
        if (!c.label) return `ステップ "${id}" の選択肢に label が必要です`;
        if (!c.next || !(c.next in steps)) {
          return `ステップ "${id}" の選択肢 "${c.label}" の next "${c.next}" が steps に存在しません`;
        }
      }
    } else {
      return `ステップ "${id}" の type "${step.type}" は無効です (choice / text / end)`;
    }
  }
  if (!hasEnd) return 'end タイプのステップが必要です';
  return null;
}

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
  const [schemaObj, setSchemaObj] = useState(
    DEFAULT_SCHEMA as Record<string, unknown>,
  );
  const [schemaJson, setSchemaJson] = useState(
    JSON.stringify(DEFAULT_SCHEMA, null, 2),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('visual');
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    visual: null,
    json: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const nameInputId = useId();
  const lineChannelInputId = useId();
  const statusInputId = useId();
  const triggerInputId = useId();

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
          const schema =
            f.schema ?? (DEFAULT_SCHEMA as Record<string, unknown>);
          setSchemaObj(schema);
          setSchemaJson(JSON.stringify(schema, null, 2));
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

  // ビジュアルビルダーからの更新
  function handleBuilderChange(newSchema: Record<string, unknown>) {
    setSchemaObj(newSchema);
    setSchemaJson(JSON.stringify(newSchema, null, 2));
    setJsonError(null);
  }

  // JSONテキストからの更新
  function handleJsonChange(text: string) {
    setSchemaJson(text);
    try {
      const parsed = JSON.parse(text);
      setSchemaObj(parsed);
      setJsonError(null);
    } catch {
      setJsonError('JSON の構文が不正です');
    }
  }

  // タブ切替時にJSONからビジュアルへ同期
  function switchTab(newTab: TabId) {
    if (newTab === 'visual' && tab === 'json') {
      try {
        const parsed = JSON.parse(schemaJson);
        setSchemaObj(parsed);
        setJsonError(null);
      } catch {
        setJsonError(
          'JSON の構文が不正です。修正してからビジュアルモードに切り替えてください。',
        );
        return;
      }
    }
    if (newTab === 'json' && tab === 'visual') {
      setSchemaJson(JSON.stringify(schemaObj, null, 2));
    }
    setTab(newTab);
  }

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = TAB_ORDER.indexOf(tab);
    let nextIndex: number;
    switch (e.key) {
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
        break;
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % TAB_ORDER.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = TAB_ORDER.length - 1;
        break;
      default:
        return;
    }
    if (nextIndex === currentIndex) return;
    e.preventDefault();
    const nextTab = TAB_ORDER[nextIndex];
    switchTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      let schema: Record<string, unknown>;
      if (tab === 'json') {
        try {
          schema = JSON.parse(schemaJson);
        } catch {
          throw new Error('JSON の構文が不正です');
        }
      } else {
        schema = schemaObj;
      }

      const validationError = validateSchema(schema);
      if (validationError) {
        throw new Error(`スキーマ検証エラー: ${validationError}`);
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
        <ChevronLeft size={ICON_SIZE.sm} />
        フォーム一覧に戻る
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          {isNew ? '新規フォーム' : form?.name || 'フォーム編集'}
        </h1>
        {!isNew && (
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 transition-colors"
            title="フォームを削除"
            aria-label="フォームを削除"
          >
            <Trash2 size={ICON_SIZE.md} />
          </button>
        )}
      </div>

      <div
        className={
          error ? 'mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm' : ''
        }
        role="alert"
      >
        {error}
      </div>

      <div className="mt-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <Field label="表示名" htmlFor={nameInputId}>
          <input
            id={nameInputId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          />
        </Field>

        <Field label="LINE チャネル" htmlFor={lineChannelInputId}>
          <select
            id={lineChannelInputId}
            value={lineChannelId}
            onChange={(e) => setLineChannelId(e.target.value)}
            disabled={!isNew}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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

        <Field label="ステータス" htmlFor={statusInputId}>
          <select
            id={statusInputId}
            value={status}
            onChange={(e) => setStatus(e.target.value as Form['status'])}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <option value="draft">下書き</option>
            <option value="published">公開中</option>
            <option value="archived">アーカイブ</option>
          </select>
          <div className="text-xs text-slate-500 mt-1">
            公開中の場合のみトリガーキーワードで起動します
          </div>
        </Field>

        <Field label="トリガーキーワード" htmlFor={triggerInputId}>
          <input
            id={triggerInputId}
            value={triggerKeyword}
            onChange={(e) => setTriggerKeyword(e.target.value)}
            placeholder="例: 査定"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          />
        </Field>

        {/* スキーマ編集: タブ切替 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              フォーム設計
            </span>
            <div
              role="tablist"
              aria-label="フォーム設計の編集モード"
              className="flex bg-slate-100 rounded-md p-0.5"
            >
              <button
                ref={(el) => {
                  tabRefs.current.visual = el;
                }}
                role="tab"
                aria-selected={tab === 'visual'}
                aria-controls="panel-visual"
                id="tab-visual"
                tabIndex={tab === 'visual' ? 0 : -1}
                onClick={() => switchTab('visual')}
                onKeyDown={handleTabKeyDown}
                className={`px-3 py-1 text-xs rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 transition-colors ${
                  tab === 'visual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                ビジュアル
              </button>
              <button
                ref={(el) => {
                  tabRefs.current.json = el;
                }}
                role="tab"
                aria-selected={tab === 'json'}
                aria-controls="panel-json"
                id="tab-json"
                tabIndex={tab === 'json' ? 0 : -1}
                onClick={() => switchTab('json')}
                onKeyDown={handleTabKeyDown}
                className={`px-3 py-1 text-xs rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 transition-colors ${
                  tab === 'json'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          <div
            role="tabpanel"
            id="panel-visual"
            aria-labelledby="tab-visual"
            hidden={tab !== 'visual'}
          >
            <FormSchemaBuilder
              schema={
                schemaObj as {
                  startStep: string;
                  steps: Record<string, unknown>;
                }
              }
              onChange={handleBuilderChange}
            />
          </div>
          <div
            role="tabpanel"
            id="panel-json"
            aria-labelledby="tab-json"
            hidden={tab !== 'json'}
          >
            <textarea
              aria-label="JSON schema editor"
              value={schemaJson}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={20}
              spellCheck={false}
              className={`w-full px-3 py-2 border rounded-md text-xs font-mono bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                jsonError ? 'border-red-400' : 'border-slate-300'
              }`}
            />
            {jsonError && (
              <div className="text-xs text-red-600 mt-1">{jsonError}</div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <LoadingButton
            onClick={handleSave}
            loading={saving}
            disabled={!name || !lineChannelId || !!jsonError}
            className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中…' : '保存'}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
