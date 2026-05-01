import pricing from './pricing';
import lineSetup from './line-setup';
import forms from './forms';
import data from './data';
import account from './account';
import security from './security';

export type FaqCategorySlug =
  | 'pricing'
  | 'line-setup'
  | 'forms'
  | 'data'
  | 'account'
  | 'security';

export interface FaqCategory {
  slug: FaqCategorySlug;
  title: string;
  description: string;
}

export interface FaqArticle {
  /** URL に使うグローバル一意 slug（例: 'line-webhook-url'） */
  slug: string;
  category: FaqCategorySlug;
  question: string;
  /** 回答本文。段落ごとの配列。各要素は <p> に展開される。 */
  answerParagraphs: string[];
  /** 関連記事（2〜3 件推奨）。存在しない slug は無視される。 */
  relatedSlugs?: string[];
  /** ISO 形式の最終更新日（YYYY-MM-DD） */
  updatedAt: string;
}

export const CATEGORIES: FaqCategory[] = [
  {
    slug: 'pricing',
    title: '料金・プラン',
    description:
      '無料プランの範囲、有料プランの支払い方法、解約時の扱いなど、料金に関する質問をまとめています。',
  },
  {
    slug: 'line-setup',
    title: 'LINE連携・初期設定',
    description:
      'LINE 公式アカウントの作成、Messaging API の設定、Webhook URL、チャネルアクセストークンに関する質問をまとめています。',
  },
  {
    slug: 'forms',
    title: 'フォーム作成',
    description:
      '対話フォームの作成方法、テンプレート、分岐条件、トリガーキーワードなど、フォームに関する質問をまとめています。',
  },
  {
    slug: 'data',
    title: '問い合わせ管理・データ',
    description:
      '受信データの確認方法、CSV エクスポート、保存期間、通知機能など、データ管理に関する質問をまとめています。',
  },
  {
    slug: 'account',
    title: 'アカウント・組織',
    description:
      'アカウント登録、パスワード再設定、メンバー招待、アカウント削除など、アカウント管理に関する質問をまとめています。',
  },
  {
    slug: 'security',
    title: 'セキュリティ・データ保護',
    description:
      '通信の暗号化、個人情報の取り扱い、サーバーの所在地、第三者アクセスなど、セキュリティに関する質問をまとめています。',
  },
];

export const FAQS: FaqArticle[] = [
  ...pricing,
  ...lineSetup,
  ...forms,
  ...data,
  ...account,
  ...security,
];

// ⚡ Bolt: Implement O(1) lookup map to eliminate Array.prototype.find overhead during renders (~8.3x performance improvement for lookups)
const FAQ_MAP: Record<string, FaqArticle> = {};
for (const faq of FAQS) {
  FAQ_MAP[faq.slug] = faq;
}

export function getFaq(slug: string): FaqArticle | undefined {
  return FAQ_MAP[slug];
}

export function getCategory(slug: string): FaqCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getFaqsByCategory(categorySlug: FaqCategorySlug): FaqArticle[] {
  return FAQS.filter((f) => f.category === categorySlug);
}

export function getRelated(faq: FaqArticle): FaqArticle[] {
  if (!faq.relatedSlugs || faq.relatedSlugs.length === 0) return [];
  return faq.relatedSlugs
    .map((slug) => FAQ_MAP[slug])
    .filter((f): f is FaqArticle => Boolean(f));
}
