import { useState } from 'react';
import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { api } from '../lib/api';
import { useSession } from '../lib/auth-client';
import { useSEO } from '../lib/useSEO';

const PLANS = [
  {
    name: 'Free',
    price: '¥0',
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
    price: '¥2,980',
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
  useSEO({
    title: '料金プラン | Toique - LINE問い合わせ受付SaaS',
    description:
      'Toiqueの料金プラン。無料のFreeプランでLINE公式アカウント連携・対話フォーム作成・CSVエクスポートを利用可能。Proプランは複数チャネル・チーム運用向け。',
  });
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
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span>
                      {f.label}: <span className="font-medium">{f.value}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {plan.highlight && session?.user ? (
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="mt-6 block w-full text-center px-4 py-2.5 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {upgrading ? '処理中…' : plan.cta}
                </button>
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

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>Toique</span>
          <div className="flex gap-4">
            <Link to="/help" className="hover:text-slate-900">
              ヘルプ
            </Link>
            <Link
              to="/specified-commercial-transactions"
              className="hover:text-slate-900"
            >
              特定商取引法に基づく表記
            </Link>
            <Link to="/login" className="hover:text-slate-900">
              ログイン
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
