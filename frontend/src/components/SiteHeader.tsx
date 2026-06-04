import { NavLink } from 'react-router';
import { HEADER_CTA, HEADER_NAV_ITEMS } from '../lib/navigation';

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <NavLink
          to="/"
          end
          className="text-lg font-bold text-slate-900 focus-ring rounded-sm transition-colors"
        >
          Toique
        </NavLink>
        <div className="flex items-center gap-4">
          {HEADER_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `focus-ring rounded-sm transition-colors ${
                  isActive
                    ? 'text-sm text-slate-900 font-medium'
                    : 'text-sm text-slate-700 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to={HEADER_CTA.to}
            className="px-4 py-1.5 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-800 focus-ring transition-colors"
          >
            {HEADER_CTA.label}
          </NavLink>
        </div>
      </div>
    </header>
  );
}
