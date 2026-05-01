import type { ButtonHTMLAttributes, ElementType } from 'react';
import { Loader2 } from 'lucide-react';
import { ICON_SIZE } from '../lib/icon-size';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  icon?: ElementType | null;
}

export default function LoadingButton({
  loading,
  disabled,
  icon: Icon,
  children,
  className = 'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed',
  ...rest
}: LoadingButtonProps) {
  // If loading, force a spinner. If not loading but an Icon is provided, show it.
  const DisplayIcon = loading ? Loader2 : Icon;

  return (
    <button
      disabled={loading || disabled}
      aria-busy={loading}
      className={className}
      {...rest}
    >
      {DisplayIcon && (
        <DisplayIcon
          size={ICON_SIZE.sm}
          className={loading ? 'animate-spin' : ''}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
