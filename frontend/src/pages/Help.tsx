import { Link } from 'react-router';
import {
  BookOpen,
  UserPlus,
  Building2,
  Plug,
  FileText,
  Inbox,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import Mermaid from '../components/Mermaid';
import SiteFooter from '../components/SiteFooter';
import { useSEO } from '../lib/useSEO';
import { ICON_SIZE } from '../lib/icon-size';

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

export default function Help() {
  useSEO({
    title: 'ヘルプ・使い方ガイド | Toique',
    description:
      'Toiqueの使い方ガイド。LINE公式アカウント連携、対話フォームの作成、問い合わせ回答のCSVエクスポートまでの手順を分かりやすく解説します。',
  });
  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-900">Toique</span>
            <span className="text-sm text-slate-500">ヘルプ</span>
          </Link>
          <Link
            to="/login"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ログイン
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <div className="bg-slate-100 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-700">
          質問ベースで探す場合は →{' '}
          <Link
            to="/faq"
            className="font-semibold text-slate-900 underline hover:no-underline"
          >
            FAQ (よくある質問)
          </Link>
        </div>

        <Section icon={BookOpen} title="Toique とは" id="about">
          <p>
            <strong>Toique（トイク）</strong>{' '}
            は、LINE公式アカウントに接続して対話型フォームで問い合わせを受け付ける
            SaaS です。LINE
            ユーザーからの問い合わせを、あらかじめ定義した質問フローに沿って自動で収集し、構造化データとして管理画面で確認できます。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              買取査定、予約受付、資料請求、会員登録などの一次受付を自動化
            </li>
            <li>LINE bot ではなく、管理者が確認できる業務ツールとして設計</li>
            <li>契約企業ごとに LINE公式アカウントを接続、データは完全分離</li>
          </ul>
        </Section>

        <Section icon={UserPlus} title="1. アカウント登録" id="signup">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              トップ画面右上の{' '}
              <Link to="/signup" className="underline">
                新規登録
              </Link>{' '}
              リンクから登録ページを開きます。
            </li>
            <li>
              お名前・メールアドレス・パスワード (8文字以上)
              を入力して送信します。
            </li>
            <li>
              登録完了後、自動的にログイン状態になり、組織登録画面に遷移します。
            </li>
          </ol>
        </Section>

        <Section
          icon={Building2}
          title="2. 組織（テナント）の作成"
          id="onboarding"
        >
          <p>
            アカウントと紐付く組織名（会社名・屋号など）を入力します。この組織単位でチャネル・フォーム・問い合わせデータが分離されます。
          </p>
          <div className="p-3 rounded-md bg-amber-50 text-amber-800 text-sm">
            現在の仕様: <strong>1 ユーザー = 1 組織</strong>
            です。複数組織所属・切り替えは今後の対応予定です。
          </div>
        </Section>

        <Section icon={Plug} title="3. LINE 公式アカウントの接続" id="channel">
          <p>
            Toique で受信するには、LINE 公式アカウントと Messaging API
            のチャネルを接続する必要があります。プロバイダー・チャネルの作成や
            Messaging API の有効化は、すべて{' '}
            <strong>LINE Developers Console</strong> 上で行います。
          </p>
          <p>
            アカウント作成・プロバイダー作成・Messaging API 利用開始・
            <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">
              Channel ID
            </code>{' '}
            /{' '}
            <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">
              Channel secret
            </code>{' '}
            の取得は、すべて LINE Official Account Manager 内で完結します。
            <strong>Channel access token (long-lived) の発行のみ</strong> LINE
            Developers Console での操作が必要です。
          </p>
          <div className="mt-4 mb-6">
            <Mermaid
              chart={`
graph TD
    A[LINE Official Account Manager<br>でアカウント作成] --> B[Messaging APIを利用する設定<br>＋プロバイダー／チャネル作成]
    B --> C[OAMで<br>Channel ID／Channel secret取得]
    C --> D[LINE Developers Consoleで<br>Channel access token発行]
    D --> E[Toiqueに<br>チャネル情報を登録]
    E --> F[LINE Developers Consoleで<br>Webhook URLを設定]
              `}
            />
          </div>

          <h3 className="font-semibold text-slate-900 mt-4">
            3.1 プロバイダーとチャネルを作成し Messaging API を有効化
          </h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <a
                href="https://developers.line.biz/ja/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-1"
              >
                LINE Developers
                <ExternalLink size={ICON_SIZE.xs} />
              </a>{' '}
              のトップページ右上にある「
              <strong>コンソールにログイン</strong>」から{' '}
              <strong>LINE Developers Console</strong> にログインします。
            </li>
            <li>
              左メニューの「<strong>プロバイダー</strong>」を開き、「
              <strong>作成</strong>
              」ボタンから新しいプロバイダーを登録します（既存のプロバイダーを利用しても構いません）。
              <figure className="mt-3">
                <img
                  src="/help/line-developers-console-providers.png"
                  alt="LINE Developers Console のプロバイダー一覧画面で「作成」ボタンを押下する様子"
                  className="rounded-md border border-slate-200 max-w-full"
                  loading="lazy"
                />
                <figcaption className="text-xs text-slate-500 mt-1">
                  LINE Developers Console
                  のプロバイダー一覧画面。「作成」ボタンから新規登録します。
                </figcaption>
              </figure>
            </li>
            <li>
              作成したプロバイダーを開き、「<strong>新規チャネル作成</strong>
              」から <strong>Messaging API</strong> チャネルを作成します。
            </li>
            <li>
              作成したチャネルを開き、「<strong>チャネル設定</strong>
              」タブで「<strong>Messaging APIを利用する</strong>
              」を有効にします。
            </li>
          </ol>

          <h3 className="font-semibold text-slate-900 mt-4">
            3.2 OAM で Channel ID / Channel secret を取得
          </h3>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              LINE Official Account Manager の{' '}
              <strong>設定 → Messaging API</strong> 画面を開く
            </li>
            <li>
              <strong>Channel情報</strong> セクションに表示される{' '}
              <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">
                Channel ID
              </code>{' '}
              と{' '}
              <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">
                Channel secret
              </code>{' '}
              を「コピー」ボタンで控える
            </li>
          </ol>
          <figure className="mt-3">
            <img
              src="/help/line-oam-channel-info.png"
              alt="LINE Official Account Manager の Messaging API 画面で Channel ID と Channel secret をコピーする様子"
              className="w-full rounded-md border border-slate-200"
              loading="lazy"
            />
            <figcaption className="text-xs text-slate-500 mt-1">
              OAM の Messaging API 画面。Channel ID / Channel secret
              はここから取得します。
            </figcaption>
          </figure>

          <h3 className="font-semibold text-slate-900 mt-4">
            3.3 LINE Developers Console で Channel access token を発行
          </h3>
          <p className="text-sm">
            Channel access token (long-lived) のみは OAM では発行できないため、
            LINE Developers Console での操作が必要です。
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              <a
                href="https://developers.line.biz/console/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-1"
              >
                LINE Developers Console
                <ExternalLink size={ICON_SIZE.xs} />
              </a>{' '}
              にログイン
            </li>
            <li>該当のプロバイダー → 作成済みチャネルを開く</li>
            <li>
              <strong>Messaging API</strong> タブを開き、
              <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">
                Channel access token (long-lived)
              </code>{' '}
              の「発行 (Issue)」をクリックして取得
            </li>
          </ol>

          <h3 className="font-semibold text-slate-900 mt-4">
            3.4 Toique にチャネルを登録
          </h3>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              <Link to="/channels" className="underline">
                LINEチャネル
              </Link>{' '}
              を開く
            </li>
            <li>表示名・Channel ID・Secret・Access Token を入力して登録</li>
          </ol>

          <h3 className="font-semibold text-slate-900 mt-4">
            3.5 LINE Developers に Webhook URL を登録
          </h3>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Webhook URL:{' '}
              <code className="px-1 py-0.5 bg-slate-100 rounded text-xs break-all">
                {`${API_BASE_URL}/webhooks/line/`}&lt;Channel ID&gt;
              </code>
            </li>
            <li>
              <strong>Webhookの利用 (Use webhook)</strong> を ON
            </li>
            <li>
              「Verify (検証)」ボタンで{' '}
              <code className="text-xs">成功 (Success)</code>{' '}
              が表示されれば接続完了
            </li>
          </ol>

          <h3 className="font-semibold text-slate-900 mt-4">
            3.6 LINE Official Account Manager で応答設定を変更
          </h3>
          <ol className="list-decimal pl-5 space-y-1">
            <li>LINE Official Account Manager の「応答設定」を開く</li>
            <li>
              <strong>あいさつメッセージ</strong> を オフ（Toique
              で制御する場合）
            </li>
            <li>
              <strong>応答メッセージ</strong> を オフ（Toique で制御するため）
            </li>
          </ol>
        </Section>

        <Section icon={FileText} title="4. フォームの作成" id="forms">
          <p>
            対話型の質問フローを JSON で定義します。
            <Link to="/forms" className="underline">
              フォーム
            </Link>{' '}
            から新規作成します。
          </p>

          <h3 className="font-semibold text-slate-900 mt-4">4.1 必須項目</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>表示名</strong>: 管理画面での識別名
            </li>
            <li>
              <strong>LINEチャネル</strong>:
              このフォームを適用する公式アカウント
            </li>
            <li>
              <strong>ステータス</strong>:{' '}
              <code className="text-xs">draft</code> /{' '}
              <code className="text-xs">published</code> /{' '}
              <code className="text-xs">archived</code>（
              <strong>published のみトリガー起動</strong>）
            </li>
            <li>
              <strong>トリガーキーワード</strong>:
              LINEユーザーがこの語句を送ったらフォームを起動（例:{' '}
              <code className="text-xs">査定</code>）
            </li>
            <li>
              <strong>スキーマ (JSON)</strong>: 質問フロー定義
            </li>
          </ul>

          <h3 className="font-semibold text-slate-900 mt-4">
            4.2 スキーマの基本構造
          </h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-md text-xs overflow-x-auto">
            {`{
  "startStep": "カテゴリ",
  "steps": {
    "カテゴリ": {
      "type": "choice",
      "prompt": "カテゴリを選んでください",
      "field": "カテゴリ",
      "choices": [
        { "label": "時計", "value": "時計", "next": "ブランド" },
        { "label": "バッグ", "value": "バッグ", "next": "ブランド" },
        { "label": "宝石・ジュエリー", "value": "宝石・ジュエリー", "next": "ブランド" },
        { "label": "アパレル", "value": "アパレル", "next": "ブランド" }
      ]
    },
    "ブランド": {
      "type": "text",
      "prompt": "ブランド名を教えてください",
      "field": "ブランド",
      "next": "完了"
    },
    "完了": {
      "type": "end",
      "thanks": "ありがとうございました"
    }
  }
}`}
          </pre>
          <div className="p-3 rounded-md bg-slate-100 text-slate-700 text-xs mt-3">
            ステップID / <code>field</code> / <code>value</code> /{' '}
            <code>next</code>{' '}
            などユーザー定義の識別子は日本語で指定できます。問い合わせ一覧での回答キーも日本語で表示されます。構造プロパティ（
            <code>startStep</code> / <code>type</code> / <code>prompt</code>{' '}
            など）は英語のままで使用してください。
          </div>

          <h3 className="font-semibold text-slate-900 mt-4">
            4.3 利用可能なステップ
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-md">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-3 py-2">type</th>
                  <th className="text-left px-3 py-2">説明</th>
                  <th className="text-left px-3 py-2">必須プロパティ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-3 py-2">
                    <code className="text-xs">choice</code>
                  </td>
                  <td className="px-3 py-2">LINE Quick Reply で選択肢を表示</td>
                  <td className="px-3 py-2 text-xs">
                    prompt, field, choices[].(label/value/next)
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2">
                    <code className="text-xs">text</code>
                  </td>
                  <td className="px-3 py-2">自由入力テキスト</td>
                  <td className="px-3 py-2 text-xs">prompt, field, next</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">
                    <code className="text-xs">end</code>
                  </td>
                  <td className="px-3 py-2">
                    終了メッセージを送信して submission 記録
                  </td>
                  <td className="px-3 py-2 text-xs">thanks</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section icon={Inbox} title="5. 問い合わせの確認" id="submissions">
          <p>
            LINEユーザーがフォームを完了すると、
            <Link to="/submissions" className="underline">
              問い合わせ
            </Link>{' '}
            に記録されます。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>受信日時・フォーム名・ステータス・回答内容を一覧表示</li>
            <li>
              ステータス: <code className="text-xs">new</code> /{' '}
              <code className="text-xs">in_review</code> /{' '}
              <code className="text-xs">done</code>
            </li>
          </ul>
        </Section>

        <Section icon={MessageSquare} title="6. 受信メッセージ" id="messages">
          <p>
            フォームを介さないメッセージも含め、LINEから受信した全イベントの raw
            ログは{' '}
            <Link to="/messages" className="underline">
              受信メッセージ
            </Link>{' '}
            で確認できます。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>message / follow / unfollow / postback イベント</li>
            <li>テキスト・画像・動画などの種別情報</li>
          </ul>
        </Section>

        <Section title="トラブルシューティング" id="troubleshooting">
          <dl className="space-y-3">
            <div>
              <dt className="font-semibold text-slate-900">
                Q. LINEから送っても返信が来ない
              </dt>
              <dd className="text-sm mt-1">
                Webhook URL が正しく設定されているか、Channel access token
                が有効か、ログイン状態でチャネルが登録済みか確認してください。
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">
                Q. トリガーキーワードで起動しない
              </dt>
              <dd className="text-sm mt-1">
                フォームのステータスが{' '}
                <code className="text-xs">published</code>{' '}
                になっているか、キーワードが完全一致するか確認してください。
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">
                Q. 組織をもう一つ作りたい
              </dt>
              <dd className="text-sm mt-1">
                現在は 1 ユーザー = 1
                組織に制限しています。別組織が必要な場合は別メールアドレスでアカウント登録してください（複数組織対応は今後予定）。
              </dd>
            </div>
          </dl>
        </Section>

        <div className="pt-6 border-t border-slate-200 text-sm text-slate-500">
          <p>
            解決しない場合は{' '}
            <Link to="/contact" className="underline">
              お問い合わせフォーム
            </Link>{' '}
            からご連絡ください。
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  id,
  children,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-3">
        {Icon && <Icon size={ICON_SIZE.xl} className="text-slate-600" />}
        {title}
      </h2>
      <div className="text-slate-700 text-sm leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
