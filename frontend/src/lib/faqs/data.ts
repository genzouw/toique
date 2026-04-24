import type { FaqArticle } from './index';

const articles: FaqArticle[] = [
  {
    slug: 'data-where-to-check',
    category: 'data',
    question: '受信したデータはどこで確認できますか？',
    answerParagraphs: [
      '対話フォームを通じて受信した問い合わせは、管理画面の「問い合わせ」一覧でご確認いただけます。受信日時・フォーム名・ステータス・回答内容がテーブル形式で表示されます。',
      'フォームを介さない LINE メッセージ（あいさつ・画像・postback など）は、「受信メッセージ」画面で raw ログとして確認できます。',
      'それぞれ一覧から個別の詳細を開いて、具体的な回答内容や送信元のユーザー ID を参照することが可能です。',
    ],
    relatedSlugs: ['data-csv-encoding', 'data-retention'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'data-csv-encoding',
    category: 'data',
    question: 'CSV エクスポートの文字コードは？',
    answerParagraphs: [
      'CSV エクスポートは UTF-8（BOM 付き）で出力されます。Microsoft Excel でもそのままダブルクリックで開いた際に文字化けせず日本語が表示されます。',
      'カラムにはフォームスキーマで定義した field 名がそのまま使われ、日本語のフィールド名も正しく出力されます。',
      'Google Sheets や Numbers など他の表計算ソフトでもインポート可能です。',
    ],
    relatedSlugs: ['data-where-to-check', 'data-retention'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'data-retention',
    category: 'data',
    question: 'データの保存期間は？',
    answerParagraphs: [
      '現在は受信した問い合わせ・メッセージの自動削除は行っておりません。組織（テナント）が存続する限り、データは継続して保存されます。',
      'ユーザー様ご自身で管理画面の削除ボタンから個別データを削除していただくことは可能です。',
      '一括削除や保存期間の上限設定などのデータライフサイクル管理機能は、今後のアップデートで対応予定です。',
    ],
    relatedSlugs: ['data-where-to-check', 'security-personal-info'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'data-reply-via-line',
    category: 'data',
    question: '問い合わせに対して LINE で返信できますか？',
    answerParagraphs: [
      '管理画面から個別のユーザーに LINE メッセージを送信する機能は現在開発中です。現時点では、LINE 公式アカウントの管理画面（LINE Official Account Manager）から個別チャットで返信していただく運用をお願いしています。',
      'Toique はフォーム受信後の自動応答メッセージ（「ありがとうございました」等の完了メッセージ）には既に対応しています。',
      '双方向のチャット機能は今後のロードマップに含まれています。',
    ],
    relatedSlugs: ['data-notifications', 'data-where-to-check'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'data-notifications',
    category: 'data',
    question: 'Slack や Gmail に通知できますか？',
    answerParagraphs: [
      '現時点では Slack や Gmail への直接通知機能は提供しておりませんが、今後のアップデートで Webhook 連携・メール通知機能を追加予定です。',
      '暫定対応として、管理画面を定期的に確認する運用、または CSV エクスポートをスケジュール実行する運用をおすすめしています。',
      '特に緊急度の高い問い合わせ通知が必要な場合は、ご要望をお問い合わせフォームからお知らせください。優先的に開発を検討します。',
    ],
    relatedSlugs: ['data-reply-via-line', 'data-where-to-check'],
    updatedAt: '2026-04-23',
  },
];

export default articles;
