import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronRight, ThumbsUp, ThumbsDown, ArrowRight } from 'lucide-react';
import { useSEO } from '../lib/useSEO';
import { ICON_SIZE } from '../lib/icon-size';
import {
  getFaq,
  getCategory,
  getRelated,
  type FaqArticle as FaqArticleType,
} from '../lib/faqs';

const SITE_ORIGIN = 'https://toique.genzouw.com';

function setJsonLd(id: string, data: unknown) {
  let el = document.head.querySelector<HTMLScriptElement>(`script#${id}`);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  const el = document.head.querySelector(`script#${id}`);
  if (el) el.remove();
}

export default function FaqArticle() {
  const { slug } = useParams<{ slug: string }>();
  const faq = slug ? getFaq(slug) : undefined;

  if (!faq) {
    return <FaqNotFound slug={slug} />;
  }

  return <FaqArticleContent faq={faq} />;
}

function FaqArticleContent({ faq }: { faq: FaqArticleType }) {
  const category = getCategory(faq.category);
  const related = getRelated(faq);
  const firstParagraph = faq.answerParagraphs[0] ?? '';
  const descriptionBase = firstParagraph.slice(0, 100);

  useSEO({
    title: `${faq.question} | Toique ヘルプ`,
    description: descriptionBase,
    canonical: `${SITE_ORIGIN}/faq/${faq.slug}`,
  });

  useEffect(() => {
    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answerParagraphs.join('\n\n'),
          },
        },
      ],
    };
    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'ホーム',
          item: `${SITE_ORIGIN}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'よくある質問',
          item: `${SITE_ORIGIN}/faq`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: category?.title ?? faq.category,
          item: `${SITE_ORIGIN}/faq`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: faq.question,
          item: `${SITE_ORIGIN}/faq/${faq.slug}`,
        },
      ],
    };
    setJsonLd('faq-article-jsonld', faqJsonLd);
    setJsonLd('faq-breadcrumb-jsonld', breadcrumbJsonLd);
    return () => {
      removeJsonLd('faq-article-jsonld');
      removeJsonLd('faq-breadcrumb-jsonld');
    };
  }, [faq, category]);

  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  return (
    <div className="min-h-full bg-white">
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <nav aria-label="パンくずリスト" className="text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link to="/" className="hover:text-slate-900">
                ホーム
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={ICON_SIZE.xs} className="text-slate-400" />
            </li>
            <li>
              <Link to="/faq" className="hover:text-slate-900">
                FAQ
              </Link>
            </li>
            {category && (
              <>
                <li aria-hidden="true">
                  <ChevronRight
                    size={ICON_SIZE.xs}
                    className="text-slate-400"
                  />
                </li>
                <li>
                  <span className="text-slate-500">{category.title}</span>
                </li>
              </>
            )}
            <li aria-hidden="true">
              <ChevronRight size={ICON_SIZE.xs} className="text-slate-400" />
            </li>
            <li className="text-slate-700 font-medium truncate max-w-[16rem]">
              {faq.question}
            </li>
          </ol>
        </nav>

        <article className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            {category && (
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                {category.title}
              </span>
            )}
            <span className="text-xs text-slate-500">
              最終更新日: {faq.updatedAt}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
            {faq.question}
          </h1>

          <div className="mt-6 space-y-4 text-sm text-slate-700 leading-relaxed">
            {faq.answerParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Helpfulness */}
          <div className="mt-10 border-t border-slate-200 pt-6">
            <p className="text-sm font-medium text-slate-900 mb-3">
              このページは役に立ちましたか？
            </p>
            {feedback === null ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-pressed={false}
                  aria-label="役に立った"
                  onClick={() => setFeedback('up')}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm text-slate-700 rounded-md hover:bg-slate-50"
                >
                  <ThumbsUp size={ICON_SIZE.sm} />
                  役に立った
                </button>
                <button
                  type="button"
                  aria-pressed={false}
                  aria-label="役に立たなかった"
                  onClick={() => setFeedback('down')}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm text-slate-700 rounded-md hover:bg-slate-50"
                >
                  <ThumbsDown size={ICON_SIZE.sm} />
                  役に立たなかった
                </button>
              </div>
            ) : (
              <p
                className="text-sm text-slate-700"
                role="status"
                aria-live="polite"
              >
                {feedback === 'up'
                  ? 'フィードバックありがとうございました。'
                  : 'フィードバックありがとうございます。より良いコンテンツにできるよう改善いたします。'}
              </p>
            )}
          </div>
        </article>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              関連記事
            </h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <li
                  key={r.slug}
                  className="border border-slate-200 rounded-lg bg-white"
                >
                  <Link
                    to={`/faq/${r.slug}`}
                    className="block p-4 hover:bg-slate-50 rounded-lg h-full"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {r.question}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <section className="mt-12 bg-slate-50 rounded-lg p-6 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            まだ解決しない場合は
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            お問い合わせフォームよりお気軽にご連絡ください。
          </p>
          <Link
            to="/contact"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800"
          >
            お問い合わせへ
            <ArrowRight size={ICON_SIZE.sm} />
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function FaqNotFound({ slug }: { slug: string | undefined }) {
  useSEO({
    title: '記事が見つかりません | Toique ヘルプ',
    description:
      'ご指定の FAQ 記事は存在しないか、削除された可能性があります。FAQ トップから再度お探しください。',
    noIndex: true,
  });

  return (
    <div className="min-h-full bg-white">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          記事が見つかりません
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {slug ? `「${slug}」という記事は` : 'ご指定の記事は'}
          存在しないか、削除された可能性があります。
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/faq"
            className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800"
          >
            FAQ トップへ戻る
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-5 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50"
          >
            お問い合わせへ
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-slate-900">
          Toique
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/pricing"
            className="text-sm text-slate-700 hover:text-slate-900"
          >
            料金プラン
          </Link>
          <Link
            to="/faq"
            className="text-sm text-slate-700 hover:text-slate-900"
          >
            よくある質問
          </Link>
          <Link
            to="/login"
            className="text-sm text-slate-700 hover:text-slate-900"
          >
            ログイン
          </Link>
          <Link
            to="/signup"
            className="text-sm px-4 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800"
          >
            無料で始める
          </Link>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <span>Toique</span>
        <div className="flex gap-4">
          <Link to="/pricing" className="hover:text-slate-900">
            料金プラン
          </Link>
          <Link to="/faq" className="hover:text-slate-900">
            よくある質問
          </Link>
          <Link to="/help" className="hover:text-slate-900">
            ヘルプ
          </Link>
          <Link to="/contact" className="hover:text-slate-900">
            お問い合わせ
          </Link>
          <Link to="/login" className="hover:text-slate-900">
            ログイン
          </Link>
        </div>
      </div>
    </footer>
  );
}
