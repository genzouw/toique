import type { FaqArticle } from './index';

const articles: FaqArticle[] = [
  {
    slug: 'account-multi-org',
    category: 'account',
    question: '1 つのアカウントで複数組織を管理できますか？',
    answerParagraphs: [
      '現在の仕様では 1 ユーザー = 1 組織となっており、1 つのアカウントで複数組織を切り替える機能は提供していません。別組織が必要な場合は、別のメールアドレスで新規アカウント登録していただく運用をお願いしています。',
      '複数組織の切り替え・同一アカウントでの横断管理機能は、今後の対応予定となっています。',
      'グループ会社・複数店舗で運用したい場合は、お問い合わせフォームよりご相談ください。',
    ],
    relatedSlugs: ['account-invite-members', 'pricing-multi-org-discount'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'account-password-reset',
    category: 'account',
    question: 'パスワードを忘れた場合は？',
    answerParagraphs: [
      'ログインページの「パスワードをお忘れの方」リンクから、ご登録のメールアドレス宛にパスワード再設定メールをお送りします。メール記載のリンクから新しいパスワードを設定してください。',
      '再設定メールが届かない場合は、迷惑メールフォルダに振り分けられていないかご確認ください。また、メールアドレスが正しく登録されているかも合わせてご確認いただけます。',
      'それでも解決しない場合は、お問い合わせフォームからご本人確認のうえサポートいたします。',
    ],
    relatedSlugs: ['account-delete', 'account-invite-members'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'account-invite-members',
    category: 'account',
    question: 'チームメンバーを招待できますか？',
    answerParagraphs: [
      'Pro プランでは 1 組織あたり最大 5 名までのメンバーを招待できます。招待機能は管理画面の組織設定から、メールアドレスを入力してご招待いただけます。',
      'Free プランではメンバー数が 1 名に制限されています。複数名での運用をご希望の場合は Pro プランへのアップグレードをご検討ください。',
      'メンバー権限（管理者・編集者・閲覧者）などの詳細なロール管理機能は今後のアップデートで対応予定です。',
    ],
    relatedSlugs: ['account-multi-org', 'pricing-free-limits'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'account-delete',
    category: 'account',
    question: 'アカウントを削除するには？',
    answerParagraphs: [
      'アカウントの削除をご希望の場合は、お問い合わせフォームから「アカウント削除希望」の旨をお送りください。ご本人確認のうえ、サポート担当者が削除手続きを進めます。',
      'アカウント削除を行うと、組織情報・LINE チャネル設定・フォーム・問い合わせデータなどすべての関連データが削除され、復旧はできません。',
      '一時的に利用を停止したい場合は削除ではなく、Pro プランのダウングレードなどの代替手段をご検討いただくこともできます。',
    ],
    relatedSlugs: ['account-password-reset', 'security-personal-info'],
    updatedAt: '2026-04-23',
  },
];

export default articles;
