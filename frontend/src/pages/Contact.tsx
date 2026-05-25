import { Link } from 'react-router';
import { useEffect, useId, useState } from 'react';
import { api, type ContactCategory } from '../lib/api';
import { useSession } from '../lib/auth-client';
import SEOMetadata from '../components/SEOMetadata';
import LoadingButton from '../components/LoadingButton';

const CATEGORY_OPTIONS: { value: ContactCategory; label: string }[] = [
  { value: 'bug', label: '不具合の報告' },
  { value: 'feature', label: '機能要望' },
  { value: 'pricing', label: '料金プランについて' },
  { value: 'consultation', label: '導入相談' },
  { value: 'other', label: 'その他' },
];

export default function Contact() {
  const { data: session } = useSession();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<ContactCategory>('other');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [website, setWebsite] = useState(''); // ハニーポット
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const websiteId = useId();
  const nameId = useId();
  const emailId = useId();
  const categoryId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const urlId = useId();

  // ログインユーザーの情報を自動入力
  useEffect(() => {
    if (session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName((prev) => prev || session.user.name || '');
      setEmail((prev) => prev || session.user.email || '');
    }
  }, [session?.user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.submitContact({
        name,
        email,
        category,
        subject,
        body,
        url: url || undefined,
        website,
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '送信に失敗しました。時間を置いて再度お試しください。',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      <SEOMetadata
        title="お問い合わせ | Toique"
        description="Toiqueへのお問い合わせフォーム。導入相談、料金プランに関する質問、不具合の報告、機能要望などを受け付けています。"
      />
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-900">Toique</span>
            <span className="text-sm text-slate-500">お問い合わせ</span>
          </Link>
          <Link
            to="/login"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ログイン
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <section>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            お問い合わせ
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            ご質問・ご要望・不具合のご報告などは、以下のフォームからお送りください。担当者より順次ご連絡いたします。
          </p>
        </section>

        <section
          className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-900"
          role="note"
        >
          まずは{' '}
          <Link
            to="/faq"
            className="font-semibold underline hover:no-underline"
          >
            FAQ (よくある質問)
          </Link>{' '}
          をご確認ください。同じ質問の回答が掲載されている場合があります。
        </section>

        {done ? (
          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              送信しました
            </h2>
            <p className="text-sm text-slate-600">
              お問い合わせありがとうございます。内容を確認のうえ、担当者よりご連絡いたします。
            </p>
            <div className="mt-4 flex gap-3 text-sm">
              <Link to="/" className="underline text-slate-700">
                トップへ戻る
              </Link>
              <button
                onClick={() => {
                  setDone(false);
                  setSubject('');
                  setBody('');
                  setUrl('');
                }}
                className="underline text-slate-700"
              >
                続けて問い合わせる
              </button>
            </div>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
          >
            {/* ハニーポット: 人間には見えない */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-10000px',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
              }}
            >
              <label htmlFor={websiteId}>Website</label>
              <input
                id={websiteId}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <Field label="お名前" required htmlFor={nameId}>
              <input
                id={nameId}
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="メールアドレス" required htmlFor={emailId}>
              <input
                id={emailId}
                type="email"
                required
                maxLength={200}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="お問い合わせ種別" required htmlFor={categoryId}>
              <select
                id={categoryId}
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as ContactCategory)}
                className={inputCls}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="件名" required htmlFor={subjectId}>
              <input
                id={subjectId}
                type="text"
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="お問い合わせ内容" required htmlFor={bodyId}>
              <textarea
                id={bodyId}
                required
                maxLength={5000}
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-500">
                最大 5000 文字 ({body.length} / 5000)
              </p>
            </Field>

            <Field label="関連URL (任意)" htmlFor={urlId}>
              <input
                id={urlId}
                type="url"
                maxLength={500}
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={inputCls}
              />
            </Field>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="pt-2">
              <LoadingButton
                type="submit"
                loading={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '送信中…' : '送信する'}
              </LoadingButton>
            </div>
          </form>
        )}

        <section className="text-sm text-slate-600">
          <p>
            よくある質問は{' '}
            <Link to="/help" className="underline">
              ヘルプ
            </Link>{' '}
            にもまとめています。
          </p>
        </section>
      </main>
    </div>
  );
}

const inputCls =
  'block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900';

function Field({
  label,
  required,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-900 mb-1"
      >
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
