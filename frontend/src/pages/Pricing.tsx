import { useState } from 'react';
import { Link } from 'react-router';
import { Check, ArrowRight } from 'lucide-react';
import { getFaqsByCategory } from '../lib/faqs';
import { api } from '../lib/api';
import { useSession } from '../lib/auth-client';
import SEOMetadata from '../components/SEOMetadata';
import { ICON_SIZE } from '../lib/icon-size';
import LoadingButton from '../components/LoadingButton';
import SiteFooter from '../components/SiteFooter';
import { PLAN_PRICES, formatPriceWithSymbol } from '../lib/pricing';

const PLANS = [
  {
    name: 'Free',
    price: formatPriceWithSymbol(PLAN_PRICES.free),
    period: '',
    description: '個人・小規模事業者の方に',
    cta: '無料で始める',
    ctaTo: '/signup',
    highlight: false,
    features: [
      { label: 'LINEチャネル', value: '1' },
      { label: 'フォーム数', value: '3' },
      { label: '回答受信数 / 月', value: '100件' },
      { label: 'CSVエクスポート', value: '可' },
      { label: 'メンバー数', value: '1' },
    ],
  },
  {
    name: 'Pro',
    price: formatPriceWithSymbol(PLAN_PRICES.pro),
    period: '/ 月',
    description: '複数店舗・チームで運用する方に',
    cta: 'Pro プランを始める',
    ctaTo: '/signup',
    highlight: true,
    features: [
      { label: 'LINEチャネル', value: '5' },
      { label: 'フォーム数', value: '無制限' },
      { label: '回答受信数 / 月', value: '3,000件' },
      { label: 'CSVエクスポート', value: '可' },
      { label: 'メンバー数', value: '5' },
    ],
  },
];

export default function Pricing() {
  const { data: session } = useSession();
  const [upgrading, setUpgrading] = useState(false);

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const { url } = await api.createCheckout();
      if (url) window.location.href = url;
    } catch {
      alert('アップグレード処理に失敗しました');
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <div className="min-h-full bg-white">
      <SEOMetadata
        title="料金プラン | Toique - LINE問い合わせ受付SaaS"
        description="Toiqueの料金プラン。無料のFreeプランでLINE公式アカウント連携・対話フォーム作成・CSVエクスポートを利用可能。Proプランは複数チャネル・チーム運用向け。"
      />
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-slate-900">
            Toique
          </Link>
          <div className="flex items-center gap-4">
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

      {/* Hero */}
      <section className="py-16 px-6 text-center">
        <h1 className="text-3xl font-bold text-slate-900">料金プラン</h1>
        <p className="mt-3 text-base text-slate-600">
          Freeプランで始めて、必要に応じてProにアップグレード
        </p>
      </section>

      {/* Plan cards */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto grid gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border p-6 flex flex-col ${
                plan.highlight
                  ? 'border-slate-900 ring-1 ring-slate-900'
                  : 'border-slate-200'
              }`}
            >
              <div className="text-sm font-medium text-slate-500">
                {plan.name}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-slate-500">{plan.period}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600">{plan.description}</p>

              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <Check
                      size={ICON_SIZE.sm}
                      className="text-emerald-600 shrink-0"
                    />
                    <span>
                      {f.label}: <span className="font-medium">{f.value}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {plan.highlight && session?.user ? (
                <LoadingButton
                  onClick={handleUpgrade}
                  loading={upgrading}
                  className="mt-6 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {upgrading ? '処理中…' : plan.cta}
                </LoadingButton>
              ) : (
                <Link
                  to={plan.ctaTo}
                  className={`mt-6 block text-center px-4 py-2.5 text-sm font-medium rounded-md ${
                    plan.highlight
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing FAQ */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            料金に関するよくある質問
          </h2>
          <ul className="mt-8 space-y-2">
            {getFaqsByCategory('pricing').map((f) => (
              <li
                key={f.slug}
                className="bg-white border border-slate-200 rounded-lg"
              >
                <Link
                  to={`/faq/${f.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-slate-900">
                    {f.question}
                  </span>
                  <ArrowRight
                    size={ICON_SIZE.sm}
                    className="shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 text-center">
            <Link
              to="/faq"
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              すべての FAQ を見る
              <ArrowRight size={ICON_SIZE.sm} />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
