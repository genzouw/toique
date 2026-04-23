import type { LucideIcon } from 'lucide-react';
import salon from './salon';
import restaurant from './restaurant';
import clinic from './clinic';
import realEstate from './real-estate';
import school from './school';
import ec from './ec';

export interface PainPoint {
  title: string;
  description: string;
}

export interface UseCase {
  title: string;
  description: string;
}

export interface IndustryFaq {
  question: string;
  answer: string;
}

export interface IndustryContent {
  /** URL 用の slug (例: 'salon') */
  slug: string;
  /** H1 に使う業界特化のタイトル */
  title: string;
  /** <title> タグ用 */
  metaTitle: string;
  /** <meta name="description"> 用 */
  metaDescription: string;
  /** Hero 部のアイコン */
  heroIcon: LucideIcon;
  /** Hero 部のサブコピー */
  heroSubtitle: string;
  /** よくある悩み 3 件 */
  painPoints: PainPoint[];
  /** 対話フォームの流れ 3〜5 ステップ */
  solutionSteps: string[];
  /** 具体的な活用例 3 件 */
  useCases: UseCase[];
  /** フォームテンプレート例 (JSON 文字列 / コードブロック表示用) */
  formTemplateExample: string;
  /** FAQ 3〜4 件 */
  faq: IndustryFaq[];
}

export const INDUSTRIES: IndustryContent[] = [
  salon,
  restaurant,
  clinic,
  realEstate,
  school,
  ec,
];

export function getIndustry(slug: string): IndustryContent | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}
