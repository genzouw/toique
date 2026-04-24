import { Scissors } from 'lucide-react';
import type { IndustryContent } from './index';

const salon: IndustryContent = {
  slug: 'salon',
  title: '美容室・サロンの予約受付をLINE公式アカウントで自動化',
  metaTitle: '美容室・サロン向け LINE予約受付 | Toique',
  metaDescription:
    '美容室・ネイル・エステ向け。LINE公式アカウントでメニュー選択から希望日時の受付まで対話形式で自動化。電話対応や深夜の問い合わせ取りこぼしを削減します。',
  heroIcon: Scissors,
  heroSubtitle:
    '施術中でも取りこぼさず、LINEで24時間いつでも予約受付。メニュー・担当者・日時をお客様が自分のペースで入力できます。',
  painPoints: [
    {
      title: '施術中に電話が鳴って手が止まる',
      description:
        'カット中・カラー塗布中の電話対応は、お客様を待たせる原因に。LINEなら施術後にまとめて確認できます。',
    },
    {
      title: '営業時間外の予約希望を取りこぼす',
      description:
        '閉店後や休業日に届く問い合わせを翌日以降に対応していると、他店に流れてしまうケースも。',
    },
    {
      title: '常連さんごとの希望把握に時間がかかる',
      description:
        '電話や口頭でのヒアリングは記録が残らず、毎回同じやり取りを繰り返してしまいがちです。',
    },
  ],
  solutionSteps: [
    'お客様がLINEで「予約」と送信',
    'メニュー（カット／カラー／パーマ）を選択',
    '担当スタイリスト（指名なし／山田／田中）を選択',
    '希望日時を入力',
    '連絡先を入力して予約完了',
  ],
  useCases: [
    {
      title: '新規予約受付',
      description:
        '初めてのお客様でも、メニュー・担当・日時を選ぶだけで予約できる対話フォームを用意します。',
    },
    {
      title: 'リピーター向けクーポン配布アンケート',
      description:
        '来店回数や前回施術メニューをヒアリングし、次回使えるクーポンを自動配布できます。',
    },
    {
      title: '施術後フォロー',
      description:
        '施術から1週間後にスタイルの様子を自動でヒアリング。満足度調査と次回予約導線を兼ねられます。',
    },
  ],
  formTemplateExample: JSON.stringify(
    {
      trigger: '予約',
      steps: [
        {
          type: 'choice',
          label: 'メニュー',
          options: ['カット', 'カラー', 'パーマ'],
        },
        {
          type: 'choice',
          label: '担当者',
          options: ['指名なし', '山田', '田中'],
        },
        { type: 'text', label: '希望日時（例: 12/15 14:00）' },
        { type: 'text', label: 'お名前とお電話番号' },
        { type: 'end', message: 'ご予約ありがとうございます。' },
      ],
    },
    null,
    2,
  ),
  faq: [
    {
      question: '当日予約はできますか？',
      answer:
        'フォームの受付時間を営業時間内に制限でき、当日予約の可否は設定で切り替えられます。営業時間外は翌営業日の予約として受け付けることも可能です。',
    },
    {
      question: 'キャンセル対応はどうなりますか？',
      answer:
        'キャンセル用キーワード（例: 「キャンセル」）を別トリガーとして登録できます。予約番号とキャンセル理由をヒアリングするフォームを用意しましょう。',
    },
    {
      question: '指名料の扱いはどうすればよいですか？',
      answer:
        '担当者選択の選択肢に「（指名料 +¥500）」と明記しておけば、お客様が承知の上で指名できます。合計金額の計算はスタッフ側で行う運用がおすすめです。',
    },
  ],
};

export default salon;
