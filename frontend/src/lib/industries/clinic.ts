import { HeartPulse } from 'lucide-react';
import type { IndustryContent } from './index';

const clinic: IndustryContent = {
  slug: 'clinic',
  title: '整体院・治療院の初診予約と問診をLINEで自動化',
  metaTitle: '整体・治療院向け LINE予約・問診 | Toique',
  metaDescription:
    '整体院・接骨院・鍼灸院向け。LINEで症状の問診から初診予約まで受付。来院前に情報を収集し、施術時間を最大化します。',
  heroIcon: HeartPulse,
  heroSubtitle:
    '初診の問診はLINEで事前に完了。症状・既往歴・希望日時を対話形式で受け付け、来院時の滞在時間を短縮します。',
  painPoints: [
    {
      title: '初診の問診票記入に時間がかかる',
      description:
        '来院後の問診票記入で施術開始が遅れ、1日の予約枠を圧迫してしまいます。',
    },
    {
      title: '電話予約のタイムロスが大きい',
      description:
        '施術中は電話に出られず、折り返しのやり取りで半日以上かかることも。機会損失の温床です。',
    },
    {
      title: '症状ヒアリングの情報が属人化',
      description:
        '担当施術者のメモだけに頼ると、引き継ぎや他院連携時に情報が伝わりません。',
    },
  ],
  solutionSteps: [
    'お客様がLINEで「予約」と送信',
    '初診／再診を選択',
    'お困りの症状（肩こり／腰痛／頭痛など）を選択',
    '発症時期と痛みの強さを入力',
    '希望日時と連絡先を入力して受付完了',
  ],
  useCases: [
    {
      title: '初診予約＋事前問診',
      description:
        '予約と問診を1つのフォームで完結。来院時点で症状の概要が施術者に共有されています。',
    },
    {
      title: '再診予約の簡易受付',
      description:
        'カルテ番号の入力だけで素早く再予約できるフォーム。リピーター向けの導線を分離できます。',
    },
    {
      title: '施術後アフターケアの状態確認',
      description:
        '施術から3日後・1週間後に症状変化を自動ヒアリング。経過観察の材料として活用できます。',
    },
  ],
  formTemplateExample: JSON.stringify(
    {
      trigger: '予約',
      steps: [
        {
          type: 'choice',
          label: '受診区分',
          options: ['初診', '再診'],
        },
        {
          type: 'choice',
          label: 'お困りの症状',
          options: ['肩こり', '腰痛', '頭痛', '関節痛', 'その他'],
        },
        { type: 'text', label: '発症時期（例: 1週間前から）' },
        {
          type: 'choice',
          label: '痛みの強さ',
          options: ['弱い', '中程度', '強い'],
        },
        { type: 'text', label: '希望日時とお名前・連絡先' },
        {
          type: 'end',
          message: 'ご予約を承りました。当日お待ちしております。',
        },
      ],
    },
    null,
    2,
  ),
  faq: [
    {
      question: '医療情報の取り扱いは安全ですか？',
      answer:
        '通信・保管ともに暗号化した状態で管理します。機微情報の取り扱いについては運用ガイドに従い、院内でのアクセス権限管理も併用ください。',
    },
    {
      question: '保険診療と自費診療の分岐はできますか？',
      answer:
        'フォームの選択肢で保険／自費を分岐させ、それぞれ別の確認事項を提示できます。運用側で保険証確認の案内を付け加えるとスムーズです。',
    },
    {
      question: '予約キャンセル・変更は？',
      answer:
        'キャンセル用トリガーを別途設定し、予約番号と希望変更日時をヒアリングするフォームを用意できます。',
    },
  ],
};

export default clinic;
