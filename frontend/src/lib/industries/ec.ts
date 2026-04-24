import { Package } from 'lucide-react';
import type { IndustryContent } from './index';

const ec: IndustryContent = {
  slug: 'ec',
  title: 'ECショップのアフターサポート窓口をLINEで運用',
  metaTitle: 'EC向け LINEアフターサポート窓口 | Toique',
  metaDescription:
    'EC事業者向け。注文番号・問い合わせ種別・内容をLINEで対話形式に受付。返品・交換・配送トラブルを構造化データで効率対応。',
  heroIcon: Package,
  heroSubtitle:
    '返品・交換・配送トラブルの問い合わせをLINEで受付。注文番号と種別を対話形式でヒアリングし、一次対応のリードタイムを短縮します。',
  painPoints: [
    {
      title: '問い合わせメールの一次仕分けに時間がかかる',
      description:
        '件名だけでは内容が判別できず、注文番号の問合せ・返品依頼・発送遅延など担当割り振りに工数がかかります。',
    },
    {
      title: '注文番号の記載漏れで返信が往復する',
      description:
        'フリーフォーマットのメールでは必要情報が抜けがち。確認のために何度もやり取りが発生します。',
    },
    {
      title: 'SNS時代にメール対応では遅い',
      description:
        'お客様はスマホ中心。LINEなら開封率が高く、一次応答までの時間を大幅に短縮できます。',
    },
  ],
  solutionSteps: [
    'お客様がLINEで「問い合わせ」と送信',
    'お問い合わせ種別（返品／交換／配送／その他）を選択',
    '注文番号を入力',
    '状況や不具合内容を入力',
    '写真添付の案内と連絡先確認で完了',
  ],
  useCases: [
    {
      title: '返品・交換受付',
      description:
        '理由と商品状態を対話形式でヒアリング。返品ポリシーに沿った案内を自動で返せます。',
    },
    {
      title: '配送トラブル対応',
      description:
        '「届かない」「破損していた」などを種別で分岐。配送会社への確認に必要な情報を抜け漏れなく収集できます。',
    },
    {
      title: '商品レビュー・改善アンケート',
      description:
        '購入後一定期間後に自動送信。回答を商品改善やレビュー投稿促進に活用できます。',
    },
  ],
  formTemplateExample: JSON.stringify(
    {
      trigger: '問い合わせ',
      steps: [
        {
          type: 'choice',
          label: 'お問い合わせ種別',
          options: ['返品希望', '交換希望', '配送トラブル', 'その他'],
        },
        { type: 'text', label: '注文番号（例: ORD-2026-0001）' },
        { type: 'text', label: '状況・ご要望の詳細' },
        {
          type: 'choice',
          label: '商品の写真',
          options: ['後ほど追加で送る', '必要ない'],
        },
        { type: 'text', label: 'お名前と折り返し連絡先' },
        {
          type: 'end',
          message: 'お問い合わせを受け付けました。2営業日以内にご連絡します。',
        },
      ],
    },
    null,
    2,
  ),
  faq: [
    {
      question: '複数ECモールを運営していても使えますか？',
      answer:
        'LINE公式アカウントを共通窓口にすることで、どのモール購入でも同じ導線で対応できます。注文番号欄にモール名を含めるガイドを用意すると便利です。',
    },
    {
      question: '画像添付はどのように扱えますか？',
      answer:
        'LINE上で画像を送信いただき、運営管理画面またはLINE上で確認する運用が基本です。フォーム内で画像の有無を選択肢として確認しておくとスムーズです。',
    },
    {
      question: 'Shopify等のEC基幹と連携できますか？',
      answer:
        '現時点では直接連携はしていません。CSVエクスポートを既存CRMやサポートツールに取り込む運用が中心です。',
    },
  ],
};

export default ec;
