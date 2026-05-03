import { Link } from 'react-router';
import { FOOTER_NAV_ITEMS } from '../lib/navigation';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <span>Toique</span>
        <div className="flex gap-4">
          {FOOTER_NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
