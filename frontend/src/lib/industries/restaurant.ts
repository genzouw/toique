import { Utensils } from 'lucide-react';
import type { IndustryContent } from './index';

const restaurant: IndustryContent = {
  slug: 'restaurant',
  title: '飲食店のテイクアウト・予約受付をLINEで完結',
  metaTitle: '飲食店向け LINEテイクアウト注文・予約 | Toique',
  metaDescription:
    '飲食店のテイクアウト注文・席予約をLINE公式アカウントで対話形式に。メニュー選択から個数・受取時間まで自動受付、CSVで売上管理もスムーズ。',
  heroIcon: Utensils,
  heroSubtitle:
    'ピーク時の電話応対をLINEで置き換え。テイクアウトも席予約も、お客様が自分のペースで注文できる対話フォームで完結します。',
  painPoints: [
    {
      title: 'ランチピークに電話が取れない',
      description:
        '厨房もホールも手一杯な時間帯に電話が鳴り続けると、機会損失とオペレーションの乱れにつながります。',
    },
    {
      title: '口頭注文の聞き間違いでクレーム',
      description:
        'サイズや個数、受取時間の聞き間違いは、お客様とのトラブルの原因に。テキスト注文なら記録が残ります。',
    },
    {
      title: '売上データを集計する手間',
      description:
        '紙の注文票を手入力で集計していると、日々の売上把握や仕入れ計画にタイムラグが発生します。',
    },
  ],
  solutionSteps: [
    'お客様がLINEで「テイクアウト」と送信',
    'カテゴリ（お弁当／ドリンク／デザート）を選択',
    '商品と個数を入力',
    '受取希望時間を入力',
    '支払い方法を選択して注文完了',
  ],
  useCases: [
    {
      title: 'テイクアウト注文受付',
      description:
        'メニュー選択から個数・受取時間までを対話形式で受付。通話なしで注文を完結できます。',
    },
    {
      title: '席予約・コース予約',
      description:
        '人数・日時・コース選択をLINEで受付。要望欄でアレルギー情報も事前に把握できます。',
    },
    {
      title: '来店アンケート・リピーター施策',
      description:
        '食後の感想を対話形式でヒアリング。回答者に次回使えるクーポンを配信する運用もできます。',
    },
  ],
  formTemplateExample: JSON.stringify(
    {
      trigger: 'テイクアウト',
      steps: [
        {
          type: 'choice',
          label: 'カテゴリ',
          options: ['お弁当', 'ドリンク', 'デザート'],
        },
        { type: 'text', label: '商品名と個数（例: 唐揚げ弁当 2個）' },
        { type: 'text', label: '受取希望時間' },
        {
          type: 'choice',
          label: 'お支払い方法',
          options: ['店頭現金', '店頭カード', 'PayPay'],
        },
        { type: 'end', message: 'ご注文ありがとうございます。' },
      ],
    },
    null,
    2,
  ),
  faq: [
    {
      question: '注文締切時間は設定できますか？',
      answer:
        'フォームの受付時間を営業時間や仕込み開始前までに制限できます。締切後は自動で「受付終了」メッセージを返せます。',
    },
    {
      question: '支払いはLINE上で完結できますか？',
      answer:
        '決済はLINE Pay等の外部サービスと連携運用が基本です。Toique自体では受取時決済・振込確認運用をおすすめしています。',
    },
    {
      question: 'メニュー変更時の更新は大変ですか？',
      answer:
        'JSON形式のスキーマを編集するだけで、選択肢の追加・削除が即反映されます。画像付きメニューはLINEリッチメニューとの併用が効果的です。',
    },
  ],
};

export default restaurant;
