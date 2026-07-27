import { memo } from 'react';

interface ErrorAlertProps {
  error: string | null;
  className?: string;
}

/**
 * ⚡ Bolt: Wrapped with React.memo() to prevent unnecessary re-renders when parent
 * components (e.g. Dashboard) update their state (e.g. loading flags) while the error
 * state remains the same.
 * Expected impact: Reduces virtual DOM diffing overhead during parent state transitions.
 */
const ErrorAlert = memo(function ErrorAlert({
  error,
  className = 'mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm',
}: ErrorAlertProps) {
  return (
    <div role="alert" className={error ? className : ''}>
      {error}
    </div>
  );
});

export default ErrorAlert;
