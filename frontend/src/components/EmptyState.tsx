import type { ElementType, ReactNode } from 'react';
import { ICON_SIZE } from '../lib/icon-size';

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center p-12 text-center ${className}`.trim()}
    >
      <div
        className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4"
        aria-hidden="true"
      >
        <Icon className="text-slate-400" size={ICON_SIZE.xxl} />
      </div>
      <div>
        <h2 className="text-sm font-medium text-slate-900 mb-1">{title}</h2>
        <p className="text-sm text-slate-500 max-w-sm">{description}</p>
      </div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
