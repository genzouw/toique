import type { FaqArticle } from './index';

const articles: FaqArticle[] = [
  {
    slug: 'security-encryption',
    category: 'security',
    question: '受信メッセージは暗号化されますか？',
    answerParagraphs: [
      'LINE プラットフォームと Toique サーバー間の通信はすべて HTTPS（TLS 1.2 以上）で暗号化されており、第三者が通信経路上で内容を盗聴することはできません。',
      'データベースに保存される問い合わせ内容は、クラウドプロバイダ（Google Cloud）が提供する保存時暗号化（encryption at rest）が適用されます。',
      'LINE のチャネルアクセストークンなど特に機微な認証情報は、アプリケーション層でも暗号化して保管しています。',
    ],
    relatedSlugs: ['security-personal-info', 'security-third-party-access'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'security-personal-info',
    category: 'security',
    question: '個人情報の取り扱いは？',
    answerParagraphs: [
      'Toique では、LINE ユーザー ID および対話フォームで収集した回答内容を「個人情報」として取り扱い、法令および当社のプライバシーポリシーに従って厳重に管理しています。',
      'テナント（組織）ごとに完全にデータが分離されており、他組織のユーザーが他社のデータを参照することはできません。',
      '個人情報の開示・訂正・削除のご要望はお問い合わせフォームより承っております。',
    ],
    relatedSlugs: [
      'security-encryption',
      'security-server-location',
      'account-delete',
    ],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'security-server-location',
    category: 'security',
    question: 'サーバーの所在地は？',
    answerParagraphs: [
      'Toique のアプリケーションサーバーおよびデータベースは、Google Cloud のアジア地域（東京リージョン）でホスティングされています。日本国内にデータが保存されるため、海外リージョンへの越境移転は発生しません。',
      'CDN を通じた静的アセット配信や一部のログ収集については、グローバルに分散されたインフラを利用する場合があります。詳細はプライバシーポリシーをご確認ください。',
      'データの所在地に関してコンプライアンス上の個別要件がある場合は、お問い合わせフォームよりご相談ください。',
    ],
    relatedSlugs: ['security-encryption', 'security-personal-info'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'security-third-party-access',
    category: 'security',
    question: '第三者によるデータ閲覧のリスクは？',
    answerParagraphs: [
      'Toique のデータベースへのアクセスは、権限管理された運用担当者のみに限定されており、通常業務において第三者が個別のユーザーデータを閲覧することはありません。',
      '障害対応やサポートのためにデータ参照が必要な場合は、必要最小限の範囲で実施し、アクセスログが記録されます。',
      '法令に基づく開示請求への対応を除き、テナント（組織）の同意なく第三者にデータを提供することはありません。',
    ],
    relatedSlugs: ['security-encryption', 'security-personal-info'],
    updatedAt: '2026-04-23',
  },
];

export default articles;
