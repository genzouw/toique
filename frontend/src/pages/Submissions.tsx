import { useCallback, useEffect, useMemo, useState, useId, memo } from 'react';
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
  const [exportFormId, setExportFormId] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const selectId = useId();
  const selectHintId = useId();

  // 中間配列のアロケーションを避けるため明示的なループを使用
  const formsById = useMemo(() => {
    const map: Record<string, FormListItem> = {};
    for (const f of forms) {
      map[f.id] = f;
    }
    return map;
  }, [forms]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, fs] = await Promise.all([
        api.listSubmissions(),
        api.listForms(),
      ]);
      setItems(subs);
      setForms(fs);
      // 選択中フォームが一覧から消えた場合は古いIDを残さない
      setExportFormId((prev) => {
        if (prev && fs.some((f) => f.id === prev)) {
          return prev;
        }
        return fs.length > 0 ? fs[0].id : '';
      });
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

  // 一覧に存在するフォームが選択されているときだけダウンロードを許可する
  const selectedForm = formsById[exportFormId];

  const downloadButtonLabel = downloading
    ? 'CSVをダウンロード中です'
    : !selectedForm
      ? 'ダウンロード可能なフォームがありません'
      : '選択したフォームのCSVをダウンロード';

  async function handleDownload() {
    if (!selectedForm) return;
    setDownloading(true);
    setError(null);
    try {
      await api.downloadSubmissionsCsv(exportFormId, selectedForm.name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(false);
    }
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

      {/* CSV エクスポート */}
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
              value={exportFormId}
              onChange={(e) => setExportFormId(e.target.value)}
              disabled={forms.length === 0}
              title={forms.length === 0 ? 'フォームがありません' : undefined}
              // title だけではスクリーンリーダーへ非活性理由が確実に伝わらないため、
              // 可視の注記を aria-describedby で関連付ける
              aria-describedby={forms.length === 0 ? selectHintId : undefined}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {forms.length === 0 ? (
                <option>フォームがありません</option>
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
                フォームがないため選択できません
              </div>
            )}
          </div>
          <LoadingButton
            onClick={handleDownload}
            loading={downloading}
            disabled={!selectedForm}
            icon={Download}
            // LoadingButton は loading 中もボタンを非活性化するため、
            // downloading を最優先にして実際の状態と説明を一致させる
            // （aria-label は表示テキストを上書きするので特に重要）
            title={downloadButtonLabel}
            aria-label={downloadButtonLabel}
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
 * ⚡ Bolt: React.memo により、親コンポーネントの状態（例: exportFormId, downloading）が変化した際に、
 * リスト項目（および JSON.stringify を含むネストされた AnswerSummary）が不要に再レンダリングされるのを防ぐ。
 */
const SubmissionRow = memo(function SubmissionRow({
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
});

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
