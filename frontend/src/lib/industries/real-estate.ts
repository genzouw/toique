import { Home } from 'lucide-react';
import type { IndustryContent } from './index';

const realEstate: IndustryContent = {
  slug: 'real-estate',
  title: '不動産の物件問い合わせをLINE公式アカウントで一元化',
  metaTitle: '不動産向け LINE物件問い合わせ | Toique',
  metaDescription:
    '不動産仲介・管理向け。LINEで希望エリア・予算・間取りを対話形式でヒアリングし、問い合わせ内容を構造化データで管理できます。',
  heroIcon: Home,
  heroSubtitle:
    '物件問い合わせをLINEで受付。希望条件を対話形式でヒアリングし、CSVで営業チームに共有できる構造化データとして保存します。',
  painPoints: [
    {
      title: 'SUUMO等からの流入を取り逃がす',
      description:
        '電話・メール・各ポータル経由の問い合わせ先が分散し、対応漏れや二重対応が発生しがちです。',
    },
    {
      title: '希望条件のヒアリングが何往復も必要',
      description:
        'エリア・予算・間取り・入居時期などを都度確認していると、返信のラリーが長くなりお客様も離脱します。',
    },
    {
      title: '内見予約の日程調整に時間がかかる',
      description:
        '営業担当の外出中は調整が止まり、内見までのリードタイムが長引いてしまいます。',
    },
  ],
  solutionSteps: [
    'お客様がLINEで「物件相談」と送信',
    '希望エリアを選択',
    '予算帯を選択',
    '間取り・入居時期・ペット可否を入力',
    '内見希望日と連絡先を入力して完了',
  ],
  useCases: [
    {
      title: '新規物件問い合わせヒアリング',
      description:
        'エリア・予算・間取りの一次ヒアリングを自動化。営業担当は精度の高い提案に集中できます。',
    },
    {
      title: '内見予約受付',
      description:
        '物件IDと希望日時を指定して内見予約。CSVで週次の予定表に取り込めます。',
    },
    {
      title: '入居者からの問い合わせ窓口',
      description:
        '設備不具合・契約相談・退去相談などを種別選択式で受付。管理業務の効率化に活用できます。',
    },
  ],
  formTemplateExample: JSON.stringify(
    {
      trigger: '物件相談',
      steps: [
        {
          type: 'choice',
          label: '希望エリア',
          options: ['都心部', '郊外', '駅近（徒歩10分以内）', 'その他'],
        },
        {
          type: 'choice',
          label: '予算（月額家賃）',
          options: ['〜8万円', '8〜12万円', '12〜18万円', '18万円以上'],
        },
        {
          type: 'choice',
          label: '希望間取り',
          options: ['1K/1R', '1LDK', '2LDK', '3LDK以上'],
        },
        { type: 'text', label: '入居希望時期' },
        {
          type: 'choice',
          label: 'ペット可希望',
          options: ['必須', '可能ならあり', '不要'],
        },
        { type: 'text', label: '内見希望日時とお名前・連絡先' },
        {
          type: 'end',
          message: 'ご希望を承りました。担当よりご連絡いたします。',
        },
      ],
    },
    null,
    2,
  ),
  faq: [
    {
      question: '個人情報の取り扱いは安全ですか？',
      answer:
        'LINE IDと回答内容は暗号化保管されます。CSVエクスポート時は社内の情報管理ポリシーに従って共有してください。',
    },
    {
      question: '複数物件を同時に相談されたら？',
      answer:
        'フォーム末尾を自由記述にして物件IDを複数入力できるようにするか、物件ごとに別トリガーを用意する運用が可能です。',
    },
    {
      question: '内見予約の枠は自動で抑えられますか？',
      answer:
        'Toique単体ではカレンダー連携は行いません。CSVエクスポートを既存スケジューラ（Google カレンダー等）に取り込む運用をおすすめします。',
    },
  ],
};

export default realEstate;
