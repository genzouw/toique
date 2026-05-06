import { Link } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import {
  MessageSquare,
  ListChecks,
  Download,
  Zap,
  Calendar,
  ShoppingBag,
  Monitor,
  Activity,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { useSEO } from '../lib/useSEO';
import { safeJsonLdStringify } from '../lib/json-ld';
import { INDUSTRIES } from '../lib/industries';
import { ICON_SIZE } from '../lib/icon-size';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

interface UseCaseCard {
  icon: LucideIcon;
  title: string;
  category: string;
  description: string;
  /** 業界詳細ページへの導線（該当するユースケースにのみ付与） */
  detailLink?: string;
}

const USE_CASES: UseCaseCard[] = [
  {
    icon: Calendar,
    title: '美容室・サロンの予約受付',
    category: '業務効率化',
    description:
      'LINEから希望日時やメニュー、担当者を選択。対話形式で予約を自動受付し、スタッフの電話対応の時間を削減します。',
    detailLink: '/for/salon',
  },
  {
    icon: ShoppingBag,
    title: '飲食店でのテイクアウト注文',
    category: '業務効率化',
    description:
      'メニュー選択から個数、受取時間の指定までをLINEで完結。注文データは一覧で確認でき、スムーズな商品の提供が可能です。',
    detailLink: '/for/restaurant',
  },
  {
    icon: Monitor,
    title: '社内ヘルプデスク・備品申請',
    category: '業務効率化',
    description:
      '社員からの各種申請やトラブル報告をLINEで一元化。必要な情報を漏れなく収集し、管理部門の対応をスムーズにします。',
  },
  {
    icon: Activity,
    title: '日々の出費や習慣の記録',
    category: '生活の自動化',
    description:
      '「今日の支出は？」「運動した？」などの質問を定期的に自動送信。回答はCSVでエクスポートでき、手軽に記録を管理できます。',
  },
];

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'LINE公式アカウント連携',
    description:
      'お客様からのLINEメッセージを一元管理。複数チャンネルの受信メッセージをまとめて確認できます。',
  },
  {
    icon: ListChecks,
    title: 'ノーコードで対話フォーム作成',
    description:
      'JSONスキーマで分岐付きの対話フォームを定義。プログラミング不要で問い合わせフローを構築できます。',
  },
  {
    icon: Download,
    title: '回答データのCSVエクスポート',
    description:
      'フォームごとの回答一覧を確認し、CSV形式でダウンロード。Excel対応のUTF-8出力で即座に分析できます。',
  },
  {
    icon: Zap,
    title: 'キーワードトリガーで自動応答',
    description:
      '特定のキーワードに反応してフォームを自動起動。お客様の問い合わせに24時間即座に対応します。',
  },
];

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'LINE公式アカウントを持っていないと使えませんか？',
    answer:
      'まずLINE公式アカウントの作成（無料プランあり）が必要です。作成後、チャネルID・シークレット・アクセストークンを Toique に登録するだけで連携できます。',
  },
  {
    question: '料金はかかりますか？',
    answer:
      'アカウント登録と基本機能は無料でご利用いただけます。詳細は料金プランページをご確認ください。',
  },
  {
    question: 'プログラミング知識は必要ですか？',
    answer:
      '不要です。対話フォームは JSON スキーマで定義しますが、テンプレートが用意されているため、コピー＆ペースト感覚で作成できます。',
  },
  {
    question: '複数のLINE公式アカウントを連携できますか？',
    answer: 'はい、テナント単位で複数のLINEチャネルを登録・管理できます。',
  },
  {
    question: '回答データはどのように取り出せますか？',
    answer:
      '管理画面の「問い合わせ」一覧から個別に確認できるほか、CSV形式でまとめてダウンロードすることも可能です（Excel対応のUTF-8出力）。',
  },
  {
    question: '受信したメッセージはどのくらい保存されますか？',
    answer:
      '現時点で自動削除は行っていません。ユーザー自身で削除ボタンから削除することができます。',
  },
];

const SOFTWARE_APP_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Toique',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'ToiqueはLINE公式アカウントと連携し、対話形式のフォームでお客様の情報を自動で収集・管理するツールです。ノーコードでフォーム作成、回答データのCSVエクスポートに対応。',
  offers: {
    '@type': 'Offer',
    price: 0,
    priceCurrency: 'JPY',
  },
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.answer,
    },
  })),
};

export default function Landing() {
  useSEO({
    title: 'Toique - LINEからの問い合わせを対話フォームで自動収集',
    description:
      'ToiqueはLINE公式アカウントと連携し、対話形式のフォームで問い合わせを自動収集・管理するSaaS。ノーコードでフォーム作成、自動応答、CSVエクスポートに対応。',
    canonical: 'https://toique.genzouw.com/',
    ogImage: 'https://toique.genzouw.com/ogp.png',
  });

  return (
    <div className="min-h-full bg-white">
      <SiteHeader />

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            LINEからの問い合わせを
            <br />
            対話フォームで自動収集
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            ToiqueはLINE公式アカウントと連携する問い合わせフォームSaaSです。対話形式の自動応答でお客様の情報を漏れなく収集し、回答データを一元管理。電話やメール対応の負担を減らし、24時間365日の自動受付を実現します。
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              to="/signup"
              className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800"
            >
              無料で始める
            </Link>
            <Link
              to="/help"
              className="px-6 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50"
            >
              使い方を見る
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            LINE公式アカウント連携と対話フォームの主要機能
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-slate-200 rounded-lg p-6"
              >
                <f.icon className="text-slate-700" size={ICON_SIZE.xxl} />
                <h3 className="mt-3 text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            業種別の活用シーン（美容室・飲食店・ECなど）
          </h2>
          <p className="mt-4 text-center text-slate-600 max-w-2xl mx-auto">
            Toiqueは、様々な業種での業務効率化や、個人の生活の自動化・記録に活用できます。
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <div
                key={u.title}
                className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row gap-4"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-slate-50 text-slate-700 rounded-lg flex items-center justify-center">
                  <u.icon size={ICON_SIZE.xxl} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                      {u.category}
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">
                      {u.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {u.description}
                  </p>
                  {u.detailLink && (
                    <Link
                      to={u.detailLink}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
                    >
                      詳しく見る
                      <ArrowRight size={ICON_SIZE.xs} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Industry detail links */}
          <div id="industries" className="mt-12">
            <h3 className="text-base font-semibold text-slate-900 text-center">
              業種別の活用例
            </h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {INDUSTRIES.map((i) => (
                <li key={i.slug}>
                  <Link
                    to={`/for/${i.slug}`}
                    className="flex items-center justify-between px-4 py-3 border border-slate-200 rounded-md text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span>{i.metaTitle.replace(' | Toique', '')}</span>
                    <ArrowRight
                      size={ICON_SIZE.sm}
                      className="text-slate-400"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            3ステップで始められます
          </h2>
          <ol className="mt-10 space-y-6">
            {[
              {
                step: '1',
                title: 'LINE公式アカウントを登録',
                description:
                  'チャンネルID・シークレット・アクセストークンを入力するだけ。Webhook URLは自動で発行されます。',
              },
              {
                step: '2',
                title: '対話フォームを作成',
                description:
                  'カテゴリ選択 → テキスト入力 → 完了メッセージ、のような対話フローをJSON形式で定義します。',
              },
              {
                step: '3',
                title: '回答を確認・エクスポート',
                description:
                  'お客様がLINEで回答した内容を一覧で確認。CSVダウンロードですぐにデータ活用できます。',
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            よくある質問
          </h2>
          <div className="mt-10 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.question}
                className="group bg-white border border-slate-200 rounded-lg p-4 open:shadow-sm"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-semibold text-slate-900">
                  <span>{f.question}</span>
                  <ChevronDown
                    size={ICON_SIZE.lg}
                    className="text-slate-500 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/faq"
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              すべての質問を見る
              <ArrowRight size={ICON_SIZE.sm} />
            </Link>
          </div>
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

      {/* Structured data (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(SOFTWARE_APP_JSONLD),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(FAQ_JSONLD),
        }}
      />
    </div>
  );
}
