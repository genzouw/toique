import { memo, type ElementType, type ReactNode } from 'react';
import { ICON_SIZE } from '../lib/icon-size';

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

/**
 * ⚡ Bolt: Wrapped with React.memo() to prevent unnecessary re-renders.
 * EmptyState is a pure presentational component used in lists/tables.
 * When the parent (e.g. AdminUsers, Forms) re-renders due to network state changes,
 * memoizing this prevents expensive recalculations and re-paints if props are unchanged.
 * Expected impact: Minor reduction in render time when parent re-renders.
 */
const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
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
});

export default EmptyState;
