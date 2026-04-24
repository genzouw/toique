import type { ButtonHTMLAttributes, ElementType } from 'react';
import { RefreshCw } from 'lucide-react';
import { ICON_SIZE } from '../lib/icon-size';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  icon?: ElementType;
}

export default function LoadingButton({
  loading,
  disabled,
  icon: Icon = RefreshCw,
  children,
  className = 'inline-flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed',
  ...rest
}: LoadingButtonProps) {
  return (
    <button disabled={loading || disabled} className={className} {...rest}>
      <Icon size={ICON_SIZE.sm} className={loading ? 'animate-spin' : ''} />
      {children}
    </button>
  );
}
