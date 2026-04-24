import type { FaqArticle } from './index';

const articles: FaqArticle[] = [
  {
    slug: 'line-official-account-required',
    category: 'line-setup',
    question: 'LINE公式アカウントがなくても使えますか？',
    answerParagraphs: [
      'Toique をご利用いただくには LINE 公式アカウント（Messaging API 対応）が必要です。LINE 公式アカウント自体は無料プランでも作成できますので、未作成の方は LINE Official Account Manager から新規にご作成ください。',
      'LINE 公式アカウント作成後、Messaging API を有効化し、Channel ID・Channel Secret・Channel Access Token を取得したうえで Toique に登録すると連携が完了します。',
      '詳細な手順はヘルプガイドの「LINE 公式アカウントの接続」セクションをご参照ください。',
    ],
    relatedSlugs: [
      'line-messaging-api-cost',
      'line-webhook-url',
      'line-console-stuck',
    ],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'line-messaging-api-cost',
    category: 'line-setup',
    question: 'LINE Messaging API の利用料はかかりますか？',
    answerParagraphs: [
      'LINE Messaging API の利用料は LINE 社の料金体系に従います。コミュニケーションプラン（無料枠）では月あたり 200 通までのメッセージ送信が無料で、それ以上は有料プランへの切り替えが必要です。',
      'Toique 側では LINE メッセージの送受信にかかる追加費用は発生しませんが、LINE 公式アカウントの送信課金はユーザー様側でのご負担となります。',
      'LINE の料金プランは随時変更される可能性があるため、最新情報は LINE for Business の公式サイトをご確認ください。',
    ],
    relatedSlugs: ['line-official-account-required', 'pricing-overview'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'line-webhook-url',
    category: 'line-setup',
    question: 'Webhook URL はどこで発行されますか？',
    answerParagraphs: [
      'Webhook URL は LINE チャネルを Toique に登録した時点で自動的に発行されます。形式は「https://<あなたのドメイン>/webhooks/line/<Channel ID>」となります。',
      '発行された URL を LINE Developers Console の Messaging API 設定ページで「Webhook URL」として登録し、「Webhookの利用」を ON にすることで接続が完了します。',
      '「Verify」ボタンで検証が成功すれば、LINE からの受信メッセージが Toique に届くようになります。',
    ],
    relatedSlugs: [
      'line-official-account-required',
      'line-console-stuck',
      'line-channel-shared',
    ],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'line-channel-shared',
    category: 'line-setup',
    question: '既に別サービスで使っている LINE チャネルでも接続できますか？',
    answerParagraphs: [
      'LINE Messaging API の仕様上、1 つのチャネルで Webhook URL を登録できるのは 1 つだけです。そのため、既に別サービスで Webhook が設定されているチャネルを Toique に接続すると、従来のサービスへの受信が停止してしまいます。',
      'Toique 単独でご利用いただくか、新しい Messaging API チャネルを追加作成していただくことをおすすめします。1 つのプロバイダー配下に複数のチャネルを作成することが可能です。',
      'どうしても既存チャネルと併用したい場合は、外部の振り分けサーバーを経由する必要があります。お困りの際はお問い合わせフォームよりご相談ください。',
    ],
    relatedSlugs: ['line-webhook-url', 'line-multi-channel'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'line-access-token-rotation',
    category: 'line-setup',
    question: 'チャネルアクセストークンの更新はどうしますか？',
    answerParagraphs: [
      'LINE Developers Console で発行する「Channel access token (long-lived)」は有効期限がありません。ただし、セキュリティ上の理由からトークンを再発行した場合は、Toique 側のチャネル設定画面から新しいトークンを登録し直す必要があります。',
      'トークンの更新は Toique の「LINE チャネル」画面の該当チャネルを開き、「編集」から新しい値を貼り付けるだけで完了します。Webhook URL の再設定は不要です。',
      '短期間で自動失効する「stateless access token」は現時点で対応していません。long-lived トークンをご利用ください。',
    ],
    relatedSlugs: ['line-webhook-url', 'security-encryption'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'line-console-stuck',
    category: 'line-setup',
    question: 'LINE Developers Console の設定で詰まったときは？',
    answerParagraphs: [
      'LINE Developers Console の画面は UI 変更が頻繁に行われるため、手順通りに進まないケースがあります。ヘルプガイドの「LINE 公式アカウントの接続」に図解入りの最新手順をまとめていますので、まずはそちらをご覧ください。',
      '特に詰まりやすいポイントは「応答設定」の自動応答メッセージを OFF にし忘れるケースです。LINE Official Account Manager の「応答設定」で、あいさつメッセージと応答メッセージを OFF にする必要があります。',
      'それでも解決しない場合は、スクリーンショットを添えてお問い合わせフォームからご連絡いただければ、Toique サポートチームが個別にお手伝いします。',
    ],
    relatedSlugs: ['line-webhook-url', 'line-official-account-required'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'line-multi-channel',
    category: 'line-setup',
    question: '複数の LINE 公式アカウントを 1 つの組織で管理できますか？',
    answerParagraphs: [
      'はい、1 つの組織（テナント）で複数の LINE 公式アカウント（チャネル）を登録・管理できます。Free プランでは 1 チャネル、Pro プランでは 5 チャネルまで連携可能です。',
      'フォームごとに対象チャネルを指定できるため、店舗別・ブランド別に異なるフォームを運用することも可能です。',
      '受信したメッセージや問い合わせは一覧画面でチャネル単位にフィルタリングして確認できます。',
    ],
    relatedSlugs: ['line-channel-shared', 'pricing-free-limits'],
    updatedAt: '2026-04-23',
  },
];

export default articles;
