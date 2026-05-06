import { Link } from 'react-router';
import { SITE_ORIGIN } from '../lib/site';
import SEOMetadata from '../components/SEOMetadata';

/**
 * 特定商取引法に基づく表記
 *
 * 住所・電話番号は特定商取引法施行規則の改正（令和5年）により、
 * 消費者からの請求があった場合に遅滞なく開示する方式を採用。
 */
export default function Tokushoho() {
  return (
    <div className="min-h-full bg-slate-50">
      <SEOMetadata
        title="特定商取引法に基づく表記 | Toique"
        description="Toique（運営: flumen）の特定商取引法に基づく表記。販売事業者、所在地、連絡先、販売価格、支払方法、解約方法などを記載しています。"
      />
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-900">Toique</span>
            <span className="text-sm text-slate-500">
              特定商取引法に基づく表記
            </span>
          </Link>
          <Link
            to="/login"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ログイン
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          特定商取引法に基づく表記
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          特定商取引に関する法律第11条に基づき、以下の情報を表示しています。
        </p>

        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <dl className="divide-y divide-slate-200">
            <Row term="販売事業者">flumen（フルメン）</Row>
            <Row term="運営統括責任者">若林 利秋</Row>
            <Row term="所在地">
              ご請求をいただいた場合、遅滞なく開示いたします。
            </Row>
            <Row term="電話番号">
              ご請求をいただいた場合、遅滞なく開示いたします。
              <br />
              <span className="text-slate-500 text-sm">
                （お問い合わせは原則として以下のメールアドレス、または
                <Link to="/contact" className="underline hover:text-slate-900">
                  お問い合わせフォーム
                </Link>
                よりお願いいたします）
              </span>
            </Row>
            <Row term="メールアドレス">
              <a
                href="mailto:genzouw@gmail.com"
                className="underline hover:text-slate-900"
              >
                genzouw@gmail.com
              </a>
            </Row>
            <Row term="販売URL">
              <a
                href={`${SITE_ORIGIN}/`}
                className="underline hover:text-slate-900"
              >
                {`${SITE_ORIGIN}/`}
              </a>
            </Row>
            <Row term="販売価格">
              各プランの料金は
              <Link
                to="/pricing"
                className="underline hover:text-slate-900 mx-1"
              >
                料金プランページ
              </Link>
              に表示しています。
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Free プラン: 月額 0円（税込）</li>
                <li>Pro プラン: 月額 2,980円（税込）</li>
              </ul>
            </Row>
            <Row term="商品代金以外の必要料金">
              本サービスの利用に必要な通信料金・機器等はお客様のご負担となります。
            </Row>
            <Row term="支払方法">
              クレジットカード決済（Stripe 経由）
              <br />
              <span className="text-slate-500 text-sm">
                Visa / Mastercard / JCB / American Express / Diners Club
              </span>
            </Row>
            <Row term="支払時期">
              有料プランへのお申し込み時に初回料金を決済し、以降は毎月同日に自動で継続課金されます。
            </Row>
            <Row term="役務の提供時期">
              決済完了後、ただちにサービスをご利用いただけます。
            </Row>
            <Row term="解約・キャンセルについて">
              <p>
                有料プランは、ダッシュボード内の Stripe
                カスタマーポータルからいつでも解約いただけます。
              </p>
              <p className="mt-2">
                解約は次回請求日の前日までに手続きいただくことで、翌月以降の自動課金を停止できます。
              </p>
              <p className="mt-2 text-slate-500 text-sm">
                既にお支払いいただいた月額料金については、サービスの性質上、日割りでの返金は行っておりません。解約後も当該期間内はサービスをご利用いただけます。
              </p>
            </Row>
            <Row term="返金について">
              本サービスはデジタルコンテンツ・SaaS
              の提供であるため、役務の提供開始後の返金・返品はお受けできません。不具合等が発生した場合は{' '}
              <a
                href="mailto:genzouw@gmail.com"
                className="underline hover:text-slate-900"
              >
                genzouw@gmail.com
              </a>{' '}
              までご連絡ください。
            </Row>
            <Row term="動作環境">
              以下の最新版ブラウザでのご利用を推奨いたします。
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Google Chrome</li>
                <li>Safari</li>
                <li>Microsoft Edge</li>
                <li>Mozilla Firefox</li>
              </ul>
            </Row>
          </dl>
        </div>

        <p className="text-xs text-slate-500 mt-8">最終更新: 2026年4月24日</p>

        <div className="mt-10 pt-6 border-t border-slate-200 text-sm">
          <Link to="/" className="text-slate-600 hover:text-slate-900">
            ← トップに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2 md:gap-6 px-5 py-4">
      <dt className="text-sm font-semibold text-slate-900">{term}</dt>
      <dd className="text-sm text-slate-700 leading-relaxed">{children}</dd>
    </div>
  );
}
