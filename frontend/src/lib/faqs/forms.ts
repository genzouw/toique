import type { FaqArticle } from './index';

const articles: FaqArticle[] = [
  {
    slug: 'forms-programming-required',
    category: 'forms',
    question: 'プログラミング知識は必要ですか？',
    answerParagraphs: [
      'プログラミング知識は基本的に不要です。対話フォームは JSON 形式で定義しますが、テンプレートが用意されているため、コピー＆ペーストと一部文言の修正だけでフォームを作成できます。',
      'ヘルプガイドの「フォームの作成」セクションに、買取査定・予約受付・資料請求などの業種別テンプレートを掲載しています。まずはテンプレートを複製して、必要な項目だけ書き換える形でお試しください。',
      '将来的には GUI のフォームビルダー機能も開発予定です。ご期待ください。',
    ],
    relatedSlugs: ['forms-templates', 'forms-branching'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'forms-templates',
    category: 'forms',
    question: 'テンプレートはありますか？',
    answerParagraphs: [
      'ヘルプガイドに業種別のフォームテンプレートを掲載しています。美容室の予約受付、飲食店のテイクアウト注文、買取査定、資料請求、社内ヘルプデスクなど、代表的なユースケース向けのサンプルを JSON 形式で提供しています。',
      '業界別ランディングページ（/for/salon、/for/restaurant など）にも各業種に特化したフォーム例を掲載していますので、あわせてご参照ください。',
      'カスタマイズのご相談は、お問い合わせフォームよりご連絡ください。',
    ],
    relatedSlugs: ['forms-programming-required', 'forms-branching'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'forms-branching',
    category: 'forms',
    question: '対話フォームで分岐条件を作れますか？',
    answerParagraphs: [
      'はい、対話フォームの各ステップで次の遷移先を指定でき、選択肢ごとに異なるステップへ分岐させることが可能です。JSON スキーマの choice ステップで、choices[].next に遷移先のステップ ID を指定してください。',
      'たとえば「商品カテゴリ」で時計を選んだらブランド入力へ、バッグを選んだらサイズ入力へ、といった条件分岐を組み立てられます。',
      '現時点では「複数の回答を組み合わせた複雑な条件分岐」はサポートしていませんが、線形＋単純分岐であれば十分表現できる設計となっています。',
    ],
    relatedSlugs: ['forms-programming-required', 'forms-multi-trigger'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'forms-multi-trigger',
    category: 'forms',
    question: 'トリガーキーワードを複数設定できますか？',
    answerParagraphs: [
      '現在はフォームごとに 1 つのトリガーキーワードを設定する仕様です。複数キーワードで同じフォームを起動したい場合は、同じスキーマを持つフォームを複数作成し、それぞれに異なるキーワードを割り当てることで対応できます。',
      '複数トリガーの一元管理機能は今後対応予定です。',
      'トリガーキーワードは完全一致（大文字・小文字・スペースを区別）で照合されます。部分一致や正規表現には現時点で対応していません。',
    ],
    relatedSlugs: ['forms-branching', 'forms-programming-required'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'forms-abandonment',
    category: 'forms',
    question: 'フォームの途中でユーザーが離脱したらどうなりますか？',
    answerParagraphs: [
      'ユーザーが途中でメッセージ送信を中断した場合、その時点までの回答は一時保存され、同じユーザーが後続のメッセージを送信すると続きから再開されます（セッションは一定時間保持）。',
      '一定時間経過するとセッションは自動的にクリアされ、再度トリガーキーワードを送信することで最初から開始されます。',
      '離脱率の可視化や途中回答データの確認機能は、今後の機能拡張で対応予定です。',
    ],
    relatedSlugs: ['forms-branching', 'data-where-to-check'],
    updatedAt: '2026-04-23',
  },
  {
    slug: 'forms-file-upload',
    category: 'forms',
    question: '画像・ファイルの受付はできますか？',
    answerParagraphs: [
      'LINE からの画像メッセージはイベントログとして「受信メッセージ」画面から確認できます。ただし、対話フォームのステップで画像を必須項目として受け付ける機能は現在開発中です。',
      '暫定的には、テキストで「画像を送ってください」とご案内したあとにユーザーから送信された画像を、受信メッセージ一覧から個別にご確認いただく運用が可能です。',
      '動画・PDF・その他ファイル種別の取り扱いについては、今後のアップデートで対応予定です。ご要望があればお問い合わせフォームよりお知らせください。',
    ],
    relatedSlugs: ['forms-programming-required', 'data-where-to-check'],
    updatedAt: '2026-04-23',
  },
];

export default articles;
