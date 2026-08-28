import { Link, useParams } from 'react-router';
import { getIndustry, INDUSTRIES } from '../lib/industries';
import type { IndustryContent } from '../lib/industries';
import IndustryNotFound from './IndustryNotFound';
import { ICON_SIZE } from '../lib/icon-size';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import SEOMetadata from '../components/SEOMetadata';
import JsonLd from '../components/JsonLd';
import { SITE_ORIGIN } from '../lib/site';

function buildBreadcrumbJsonLd(content: IndustryContent) {
  return {
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
        name: '業種別',
        item: `${SITE_ORIGIN}/#industries`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: content.metaTitle.replace(' | Toique', ''),
        item: `${SITE_ORIGIN}/for/${content.slug}`,
      },
    ],
  };
}

function buildFaqJsonLd(content: IndustryContent) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export default function IndustryLanding() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? getIndustry(slug) : undefined;

  if (!content) {
    return <IndustryNotFound />;
  }

  return <IndustryLandingView content={content} />;
}

function IndustryLandingView({ content }: { content: IndustryContent }) {
  const HeroIcon = content.heroIcon;
  const relatedIndustries = INDUSTRIES.filter((i) => i.slug !== content.slug);

  return (
    <div className="min-h-full bg-white">
      <SEOMetadata
        title={content.metaTitle}
        description={content.metaDescription}
        canonical={`${SITE_ORIGIN}/for/${content.slug}`}
      />
      <JsonLd data={buildBreadcrumbJsonLd(content)} />
      <JsonLd data={buildFaqJsonLd(content)} />
      <SiteHeader />

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-slate-50 text-slate-700 rounded-lg flex items-center justify-center">
              <HeroIcon size={ICON_SIZE.hero} />
            </div>
          </div>
          <h1 className="mt-6 text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            {content.title}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            {content.heroSubtitle}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              to="/signup"
              className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800"
            >
              無料で始める
            </Link>
            <Link
              to="/"
              className="px-6 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50"
            >
              トップへ戻る
            </Link>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            こんなお悩みありませんか？
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {content.painPoints.map((p) => (
              <div
                key={p.title}
                className="bg-white border border-slate-200 rounded-lg p-6"
              >
                <h3 className="text-base font-semibold text-slate-900">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution steps */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            Toique なら、対話フォームで自動化できます
          </h2>
          <ol className="mt-10 space-y-4">
            {content.solutionSteps.map((step, idx) => (
              <li key={step} className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed pt-1">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            具体的な活用例
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {content.useCases.map((u) => (
              <div
                key={u.title}
                className="bg-white border border-slate-200 rounded-lg p-6"
              >
                <h3 className="text-base font-semibold text-slate-900">
                  {u.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {u.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form template example */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            この業界向けフォームテンプレート例
          </h2>
          <p className="mt-3 text-center text-sm text-slate-600">
            以下はJSONスキーマの一例です。Toiqueの管理画面からそのまま登録できます。
          </p>
          <pre className="mt-8 bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto">
            <code>{content.formTemplateExample}</code>
          </pre>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            よくある質問
          </h2>
          <div className="mt-8 space-y-3">
            {content.faq.map((f) => (
              <details
                key={f.question}
                className="bg-white border border-slate-200 rounded-lg p-4"
              >
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  {f.question}
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related industries */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            他の業界の活用例も見る
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {relatedIndustries.map((i) => (
              <li key={i.slug}>
                <Link
                  to={`/for/${i.slug}`}
                  className="block px-4 py-3 border border-slate-200 rounded-md text-sm text-slate-700 hover:bg-slate-50"
                >
                  {i.metaTitle.replace(' | Toique', '')} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white">
            今すぐ無料で始めましょう
          </h2>
          <p className="mt-3 text-sm text-slate-300">
            アカウント登録は無料です。LINE公式アカウントをお持ちなら、すぐにフォーム運用を開始できます。
          </p>
          <Link
            to="/signup"
            className="mt-6 inline-block px-6 py-2.5 bg-white text-slate-900 text-sm font-medium rounded-md hover:bg-slate-100"
          >
            無料で始める
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
