import { useCallback, useEffect, useState, useId } from 'react';
import { Inbox, Download, RefreshCw } from 'lucide-react';
import { formatDate } from '../lib/format-date';
import { api, type Submission, type FormListItem } from '../lib/api';
import EmptyState from '../components/EmptyState';
import ErrorAlert from '../components/ErrorAlert';
import LoadingButton from '../components/LoadingButton';

const STATUS_LABEL: Record<Submission['status'], string> = {
  new: '新着',
  in_review: '対応中',
  done: '完了',
};

const STATUS_COLOR: Record<Submission['status'], string> = {
  new: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  done: 'bg-slate-100 text-slate-700',
};

export default function Submissions() {
  const [items, setItems] = useState<Submission[]>([]);
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, fs] = await Promise.all([
        api.listSubmissions(),
        api.listForms(),
      ]);
      setItems(subs);
      setForms(fs);
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

  // 行ごとに forms を線形探索しないよう、id 検索用のマップを作る
  const formsById: Record<string, FormListItem> = {};
  for (const f of forms) {
    formsById[f.id] = f;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">フォーム回答</h1>
          <p className="text-sm text-slate-500 mt-1">
            フォーム完了時に記録された回答データです
          </p>
        </div>
        <LoadingButton onClick={refresh} loading={loading} icon={RefreshCw}>
          更新
        </LoadingButton>
      </div>

      <ErrorAlert error={error} />

      <CsvExportPanel forms={forms} loading={loading} onError={setError} />

      {/* 一覧 */}
      <div className="mt-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-slate-500">読み込み中…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="まだ回答はありません"
            description="フォームを公開し、LINE上でトリガーキーワードを送信して、実際の回答フローをテストしてみましょう。"
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">受信日時</th>
                <th className="text-left px-4 py-2 font-medium">フォーム</th>
                <th className="text-left px-4 py-2 font-medium">ステータス</th>
                <th className="text-left px-4 py-2 font-medium">回答内容</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((s) => (
                <SubmissionRow
                  key={s.id}
                  submission={s}
                  formName={formsById[s.formId]?.name}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/**
 * CSVエクスポートUI。
 *
 * 選択中フォーム（`selectedId`）とダウンロード中フラグ（`downloading`）は
 * このブロックでしか使わないため、親ではなくここに閉じ込める。親に置くと
 * プルダウンを1回操作するたびに回答一覧まで再レンダーの対象となり、
 * それを打ち消すためのメモ化（一覧の useMemo、行の memo）が必要になる。
 * state をここへ置けば、その原因そのものが無くなる。
 */
function CsvExportPanel({
  forms,
  loading,
  onError,
}: {
  forms: FormListItem[];
  loading: boolean;
  onError: (message: string | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const selectId = useId();
  const selectHintId = useId();

  // 選択中フォームが一覧から消えた場合に古いIDを残さないための調整を、
  // 再取得時の setState ではなく描画時の導出で行う。フォーム一覧の更新と
  // 選択の整合が常に1箇所で決まり、同期漏れが起きない。
  const effectiveId = forms.some((f) => f.id === selectedId)
    ? selectedId
    : (forms[0]?.id ?? '');
  // 一覧に存在するフォームが選択されているときだけダウンロードを許可する
  const selectedForm = forms.find((f) => f.id === effectiveId);

  const downloadButtonLabel = downloading
    ? 'CSVをダウンロード中です'
    : !selectedForm
      ? loading
        ? 'フォームを読み込み中です'
        : 'ダウンロード可能なフォームがありません'
      : '選択したフォームのCSVをダウンロード';

  async function handleDownload() {
    if (!selectedForm) return;
    setDownloading(true);
    onError(null);
    try {
      await api.downloadSubmissionsCsv(selectedForm.id, selectedForm.name);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-700"
          >
            CSVダウンロード対象のフォーム
          </label>
          <select
            id={selectId}
            value={effectiveId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={forms.length === 0}
            title={
              forms.length === 0
                ? loading
                  ? 'フォームを読み込み中です'
                  : 'フォームがありません'
                : undefined
            }
            // title だけではスクリーンリーダーへ非活性理由が確実に伝わらないため、
            // 可視の注記を aria-describedby で関連付ける
            aria-describedby={forms.length === 0 ? selectHintId : undefined}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            {forms.length === 0 ? (
              // 値としての意味を持たないプレースホルダなので、
              // 文言由来の value が乗らないよう明示的に空文字を指定する
              <option value="">
                {loading ? 'フォームを読み込み中です' : 'フォームがありません'}
              </option>
            ) : (
              forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))
            )}
          </select>
          {forms.length === 0 && (
            <div id={selectHintId} className="text-xs text-slate-500 mt-1">
              {loading
                ? 'フォームを読み込み中です'
                : 'フォームがないため選択できません'}
            </div>
          )}
        </div>
        <LoadingButton
          onClick={handleDownload}
          loading={downloading}
          disabled={!selectedForm}
          icon={Download}
          // LoadingButton は loading 中もボタンを非活性化するため、
          // downloading を最優先にして実際の状態と説明を一致させる。
          // アクセシブル名は children（可視テキスト）に任せる。
          // aria-label で上書きすると WCAG 2.5.3 Label in Name に反し、
          // 音声コントロールで「CSVダウンロード」と発話しても一致しなくなる
          title={downloadButtonLabel}
          aria-describedby={forms.length === 0 ? selectHintId : undefined}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition-colors"
        >
          {downloading ? 'ダウンロード中…' : 'CSVダウンロード'}
        </LoadingButton>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        選択したフォームのスキーマに応じたカラム構成のCSVを出力します (UTF-8 /
        Excel対応)。
      </p>
    </div>
  );
}

function SubmissionRow({
  submission: s,
  formName,
}: {
  submission: Submission;
  formName?: string;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-2 text-slate-700 whitespace-nowrap">
        {formatDate(s.submittedAt)}
      </td>
      <td className="px-4 py-2 text-slate-900 whitespace-nowrap">
        {formName ?? s.formId.slice(0, 8)}
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        <span
          className={`px-2 py-0.5 text-xs rounded ${STATUS_COLOR[s.status]}`}
        >
          {STATUS_LABEL[s.status]}
        </span>
      </td>
      <td className="px-4 py-2 text-slate-700">
        <AnswerSummary answers={s.answers} />
      </td>
    </tr>
  );
}

function AnswerSummary({ answers }: { answers: Record<string, unknown> }) {
  const entries = Object.entries(answers);
  if (entries.length === 0) {
    return <span className="text-slate-400">(なし)</span>;
  }
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-xs text-slate-500">{key}</dt>
          <dd className="text-sm text-slate-900">
            {typeof value === 'string' ? value : JSON.stringify(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
