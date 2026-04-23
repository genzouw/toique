import type { FaqArticle } from './index';

const articles: FaqArticle[] = [
  {
    slug: 'pricing-overview',
    category: 'pricing',
    question: '料金はかかりますか？',
    answerParagraphs: [
      'Toique はアカウント登録と基本機能を無料でご利用いただけます。LINE 公式アカウントの連携、対話フォームの作成、CSV エクスポートなどの主要機能は Free プランでご利用可能です。',
      '有料の Pro プランでは、連携できる LINE チャネル数や月あたりの回答受信数、メンバー数の上限が拡張されます。詳細なプラン比較は料金プランページをご確認ください。',
      '途中でプランを切り替えることもできますので、まずは無料プランから試していただくことをおすすめします。',
    ],
    relatedSlugs: ['pricing-free-limits', 'pricing-payment-method'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'pricing-free-limits',
    category: 'pricing',
    question: '無料プランでどこまで使えますか？',
    answerParagraphs: [
      'Free プランでは LINE チャネル 1 件、フォーム 3 件まで作成でき、月あたり 100 件の回答受信までご利用いただけます。CSV エクスポートや問い合わせ一覧などの基本機能に制限はありません。',
      '個人事業主の方や、LINE 経由の問い合わせ受付を試してみたい小規模事業者の方はまず Free プランから始めていただくのが一般的です。',
      '利用件数が上限に近づいた場合は管理画面で通知が表示されますので、その時点で Pro プランへのアップグレードをご検討ください。',
    ],
    relatedSlugs: ['pricing-overview', 'pricing-payment-method'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'pricing-payment-method',
    category: 'pricing',
    question: '有料プランの支払方法は？',
    answerParagraphs: [
      'Pro プランのお支払いはクレジットカード決済（Stripe）に対応しています。VISA、Mastercard、JCB、American Express、Diners Club の主要ブランドがご利用いただけます。',
      '請求書払い・銀行振込などの法人決済については、現在対応を進めております。ご希望の場合はお問い合わせフォームからご相談ください。',
      '決済情報は Stripe が安全に管理しており、Toique のサーバーにはカード番号は保存されません。',
    ],
    relatedSlugs: ['pricing-overview', 'pricing-cancel'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'pricing-cancel',
    category: 'pricing',
    question: '途中解約した場合の扱いは？',
    answerParagraphs: [
      'Pro プランはいつでも解約できます。解約をご希望の場合は管理画面の料金プランから手続きしてください。',
      '解約後も当該月の請求期間終了までは Pro プランの機能をご利用いただけます。期間終了後は自動的に Free プランへ移行し、上限を超えるフォームや連携チャネルは読み取り専用となります。',
      '受信済みの問い合わせデータはそのまま保持されるため、後日プランを戻していただいた場合も継続して参照できます。',
    ],
    relatedSlugs: ['pricing-overview', 'account-delete'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'pricing-multi-org-discount',
    category: 'pricing',
    question: '複数組織を契約するとディスカウントはありますか？',
    answerParagraphs: [
      '複数組織をまとめてご契約いただく場合のボリュームディスカウントは、現在個別でのご相談を承っております。',
      '3 組織以上のご利用や、グループ会社での包括契約をご検討の場合は、お問い合わせフォームより「料金プランについて」のカテゴリを選択してご連絡ください。',
      'なお、1 アカウント = 1 組織という現行仕様の下では、組織ごとに別メールアドレスでのご登録が必要です。複数組織の一元管理機能は今後対応予定です。',
    ],
    relatedSlugs: ['account-multi-org', 'pricing-payment-method'],
    updatedAt: '2026-04-23',
  },
];

export default articles;
