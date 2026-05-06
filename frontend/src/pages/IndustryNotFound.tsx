import { Link } from 'react-router';
import { INDUSTRIES } from '../lib/industries';
import SiteFooter from '../components/SiteFooter';

export default function IndustryNotFound() {
  return (
    <div className="min-h-full bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-slate-900">
            Toique
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/pricing"
              className="text-sm text-slate-700 hover:text-slate-900"
            >
              料金プラン
            </Link>
            <Link
              to="/login"
              className="text-sm text-slate-700 hover:text-slate-900"
            >
              ログイン
            </Link>
            <Link
              to="/signup"
              className="text-sm px-4 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800"
            >
              無料で始める
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          ページが見つかりません
        </h1>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          お探しの業界ページは存在しないか、URLが間違っている可能性があります。
          以下の業界ページからお探しください。
        </p>

        <div className="mt-8">
          <Link
            to="/"
            className="inline-block px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800"
          >
            トップへ戻る
          </Link>
        </div>

        <section className="mt-12">
          <h2 className="text-base font-semibold text-slate-900">
            業種別の活用例
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {INDUSTRIES.map((i) => (
              <li key={i.slug}>
                <Link
                  to={`/for/${i.slug}`}
                  className="block px-4 py-3 border border-slate-200 rounded-md text-sm text-slate-700 hover:bg-slate-50"
                >
                  {i.metaTitle.replace(' | Toique', '')} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
