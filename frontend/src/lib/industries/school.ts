import { GraduationCap } from 'lucide-react';
import type { IndustryContent } from './index';

const school: IndustryContent = {
  slug: 'school',
  title: '学習塾・スクールの体験授業申込をLINEで受付',
  metaTitle: '学習塾向け LINE体験申込・問い合わせ | Toique',
  metaDescription:
    '学習塾・習い事教室向け。LINEでお子さまの学年・科目・希望日を対話形式で受付、体験申込から入塾まで一貫管理。',
  heroIcon: GraduationCap,
  heroSubtitle:
    '体験授業の申込フォームをLINEに。学年・科目・希望日時を対話形式でヒアリングし、保護者の負担なく申込を完了できます。',
  painPoints: [
    {
      title: 'Webフォームの離脱率が高い',
      description:
        '長文の申込フォームは保護者のハードルが高く、途中離脱が発生します。LINEなら数タップで完了できます。',
    },
    {
      title: '電話申込の対応時間が限られる',
      description:
        '保護者の連絡可能時間は夜間や土日に偏りがち。営業時間内の電話対応では取りこぼしが発生します。',
    },
    {
      title: '体験希望の情報整理が大変',
      description:
        'お子さまの学年・科目・曜日希望を手書きメモで管理すると、担当講師へのアサインが非効率になります。',
    },
  ],
  solutionSteps: [
    '保護者がLINEで「体験申込」と送信',
    'お子さまの学年を選択',
    '希望科目を選択',
    '希望曜日・時間帯を選択',
    '保護者氏名・連絡先を入力して申込完了',
  ],
  useCases: [
    {
      title: '体験授業の申込受付',
      description:
        '学年・科目・希望日時を対話形式でヒアリング。そのまま担当講師のアサインに活用できます。',
    },
    {
      title: '入塾相談・保護者面談予約',
      description:
        '相談内容と希望日時を事前にヒアリング。面談の質を高められます。',
    },
    {
      title: '定期テスト対策講座の申込',
      description:
        '季節講習や特別講座の申込を期間限定で受付。回答データをCSVで出力し、教材準備に活用できます。',
    },
  ],
  formTemplateExample: JSON.stringify(
    {
      trigger: '体験申込',
      steps: [
        {
          type: 'choice',
          label: 'お子さまの学年',
          options: ['小1〜小3', '小4〜小6', '中1〜中3', '高1〜高3'],
        },
        {
          type: 'choice',
          label: '希望科目',
          options: ['算数・数学', '国語', '英語', '理科', '社会', '総合'],
        },
        {
          type: 'choice',
          label: '希望曜日',
          options: ['平日', '土曜', '日曜'],
        },
        {
          type: 'choice',
          label: '希望時間帯',
          options: ['16:00〜', '17:00〜', '18:00〜', '19:00〜'],
        },
        { type: 'text', label: '保護者氏名・連絡先' },
        {
          type: 'end',
          message: '体験申込を受け付けました。担当よりご連絡します。',
        },
      ],
    },
    null,
    2,
  ),
  faq: [
    {
      question: '兄弟姉妹同時の申込はできますか？',
      answer:
        'フォーム末尾を自由記述にして兄弟情報を追加できます。または人数分フォーム送信いただく運用もシンプルでおすすめです。',
    },
    {
      question: '申込後のキャンセルは？',
      answer:
        'キャンセル用トリガーを別途用意し、お名前と体験予定日を確認するフォームを設定できます。',
    },
    {
      question: '保護者と生徒どちらのLINEで申込すべき？',
      answer:
        '連絡窓口は保護者アカウント、授業連絡は生徒アカウントと使い分ける運用が一般的です。フォーム冒頭にご案内を入れておくと迷いません。',
    },
  ],
};

export default school;
