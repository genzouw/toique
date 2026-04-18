import { Link } from 'react-router';
import {
  MessageSquare,
  ListChecks,
  Download,
  Zap,
  Calendar,
  ShoppingBag,
  Monitor,
  Activity,
} from 'lucide-react';

const USE_CASES = [
  {
    icon: Calendar,
    title: '美容室・サロンの予約受付',
    category: '業務効率化',
    description:
      'LINEから希望日時やメニュー、担当者を選択。対話形式で予約を自動受付し、スタッフの電話対応の時間を削減します。',
  },
  {
    icon: ShoppingBag,
    title: '飲食店でのテイクアウト注文',
    category: '業務効率化',
    description:
      'メニュー選択から個数、受取時間の指定までをLINEで完結。注文データは一覧で確認でき、スムーズな商品の提供が可能です。',
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

export default function Landing() {
  return (
    <div className="min-h-full bg-white">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900">Toique</span>
          <div className="flex items-center gap-4">
            <Link
              to="/pricing"
              className="text-sm text-slate-700 hover:text-slate-900"
            >
              料金プラン
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

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            LINEからの問い合わせを
            <br />
            対話フォームで自動収集
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Toiqueは、LINE公式アカウントと連携し、対話形式のフォームでお客様の情報を自動で収集・管理するツールです。
            問い合わせ対応の手間を減らし、回答データを一元管理できます。
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
            主な機能
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-slate-200 rounded-lg p-6"
              >
                <f.icon className="text-slate-700" size={24} />
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
            具体的な利用シーン
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
                  <u.icon size={24} />
                </div>
                <div>
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
                </div>
              </div>
            ))}
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

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>Toique</span>
          <div className="flex gap-4">
            <Link to="/pricing" className="hover:text-slate-900">
              料金プラン
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
    </div>
  );
}
