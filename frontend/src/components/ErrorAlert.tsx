import React from 'react';

interface ErrorAlertProps {
  error: string | null;
  className?: string;
}

// ⚡ Bolt: Use React.memo() on pure presentational components to prevent
// unnecessary Virtual DOM diffing overhead when parent components re-render
// (e.g. on loading state changes or data fetches).
export default React.memo(function ErrorAlert({
  error,
  className = 'mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm',
}: ErrorAlertProps) {
  return (
    <div role="alert" className={error ? className : ''}>
      {error}
    </div>
  );
});
