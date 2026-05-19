import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  title: string;
  children: ReactNode;
}

export function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="text-xl font-bold text-slate-900">Toique</div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
      <a
        href="/help"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="使い方・ヘルプを見る（別タブで開きます）"
        className="mt-6 text-xs text-slate-500 hover:text-slate-900 underline"
      >
        使い方・ヘルプを見る ↗
      </a>
    </div>
  );
}
