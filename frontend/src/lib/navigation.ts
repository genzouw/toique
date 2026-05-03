export type NavItem = {
  to: string;
  label: string;
};

export const HEADER_NAV_ITEMS: NavItem[] = [
  { to: '/pricing', label: '料金プラン' },
  { to: '/faq', label: 'よくある質問' },
  { to: '/login', label: 'ログイン' },
];

export const HEADER_CTA: NavItem = {
  to: '/signup',
  label: '無料で始める',
};

export const FOOTER_NAV_ITEMS: NavItem[] = [
  { to: '/pricing', label: '料金プラン' },
  { to: '/faq', label: 'よくある質問' },
  { to: '/help', label: 'ヘルプ' },
  { to: '/contact', label: 'お問い合わせ' },
  {
    to: '/specified-commercial-transactions',
    label: '特定商取引法に基づく表記',
  },
  { to: '/login', label: 'ログイン' },
];

export function isNavItemActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}
