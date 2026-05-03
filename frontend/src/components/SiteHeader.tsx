import { Link, useLocation } from 'react-router';
import {
  HEADER_CTA,
  HEADER_NAV_ITEMS,
  isNavItemActive,
} from '../lib/navigation';

export default function SiteHeader() {
  const { pathname } = useLocation();

  return (
    <header className="border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-slate-900">
          Toique
        </Link>
        <div className="flex items-center gap-4">
          {HEADER_NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  active
                    ? 'text-sm text-slate-900 font-medium'
                    : 'text-sm text-slate-700 hover:text-slate-900'
                }
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            to={HEADER_CTA.to}
            className="text-sm px-4 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800"
          >
            {HEADER_CTA.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
