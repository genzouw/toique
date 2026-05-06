import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { HelpCircle, Search, ChevronRight, ArrowRight } from 'lucide-react';
import { SITE_ORIGIN } from '../lib/site';
import SEOMetadata from '../components/SEOMetadata';
import { ICON_SIZE } from '../lib/icon-size';
import {
  CATEGORIES,
  FAQS,
  getFaqsByCategory,
  type FaqArticle,
} from '../lib/faqs';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

export default function FaqHub() {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const matchedFaqs: FaqArticle[] = useMemo(() => {
    if (!normalizedQuery) return [];
    return FAQS.filter(
      (f) =>
        f.question.toLowerCase().includes(normalizedQuery) ||
        f.answerParagraphs.some((p) =>
          p.toLowerCase().includes(normalizedQuery),
        ),
    );
  }, [normalizedQuery]);

  return (
    <div className="min-h-full bg-white">
      <SEOMetadata
        title="よくある質問・ヘルプセンター | Toique"
        description="Toique のよくある質問（FAQ）。料金、LINE 連携、フォーム作成、問い合わせ管理、セキュリティに関する質問をまとめたヘルプセンターです。"
        canonical={`${SITE_ORIGIN}/faq`}
      />
      <SiteHeader />

      {/* Title */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 text-slate-700 rounded-lg mb-4">
            <HelpCircle size={ICON_SIZE.xxl} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            よくある質問 / ヘルプセンター
          </h1>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Toique
            の使い方、料金、LINE連携などに関する質問にお答えします。解決しない場合はお問い合わせフォームからご連絡ください。
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="px-6">
        <div className="max-w-2xl mx-auto">
          <label className="relative block">
            <span className="sr-only">FAQを検索</span>
            <Search
              size={ICON_SIZE.md}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="FAQを検索"
              placeholder="キーワードで検索（例: LINE, 料金, CSV）"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </label>
        </div>
      </section>

      {/* Results or Categories */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          {normalizedQuery ? (
            <SearchResults query={query} results={matchedFaqs} />
          ) : (
            <CategoryGrid />
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            解決しない場合は
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            お問い合わせフォームから直接ご質問いただけます。担当者より順次ご連絡いたします。
          </p>
          <Link
            to="/contact"
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800"
          >
            お問い合わせはこちら
            <ArrowRight size={ICON_SIZE.sm} />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function CategoryGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {CATEGORIES.map((cat) => {
        const faqs = getFaqsByCategory(cat.slug);
        const preview = faqs.slice(0, 3);
        return (
          <div
            key={cat.slug}
            className="border border-slate-200 rounded-lg p-6 bg-white flex flex-col"
          >
            <h2 className="text-base font-semibold text-slate-900">
              {cat.title}
              <span className="ml-2 text-xs font-normal text-slate-500">
                {faqs.length}件
              </span>
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {cat.description}
            </p>
            <ul className="mt-4 space-y-2 flex-1">
              {preview.map((f) => (
                <li key={f.slug}>
                  <Link
                    to={`/faq/${f.slug}`}
                    className="flex items-start gap-2 text-sm text-slate-700 hover:text-slate-900"
                  >
                    <ChevronRight
                      size={ICON_SIZE.sm}
                      className="mt-0.5 shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <span>{f.question}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {faqs.length > preview.length && (
              <p className="mt-3 text-xs text-slate-500">
                ほか {faqs.length - preview.length} 件
              </p>
            )}
            {faqs.length > 0 && (
              <Link
                to={`/faq/${faqs[0].slug}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-900 hover:text-slate-700"
              >
                このカテゴリを見る
                <ArrowRight size={ICON_SIZE.sm} />
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SearchResults({
  query,
  results,
}: {
  query: string;
  results: FaqArticle[];
}) {
  if (results.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-base text-slate-900">
          「{query}」に一致する質問は見つかりませんでした。
        </p>
        <p className="mt-2 text-sm text-slate-600">
          別のキーワードでお試しいただくか、
          <Link to="/contact" className="underline text-slate-900">
            お問い合わせフォーム
          </Link>
          よりお寄せください。
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-600 mb-4">
        「{query}」の検索結果: {results.length} 件
      </p>
      <ul className="space-y-2">
        {results.map((f) => (
          <li
            key={f.slug}
            className="border border-slate-200 rounded-lg bg-white"
          >
            <Link
              to={`/faq/${f.slug}`}
              className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg"
            >
              <span className="text-sm font-medium text-slate-900">
                {f.question}
              </span>
              <ChevronRight
                size={ICON_SIZE.md}
                className="shrink-0 mt-0.5 text-slate-400"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
