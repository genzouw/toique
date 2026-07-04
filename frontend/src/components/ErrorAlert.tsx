interface ErrorAlertProps {
  error: string | null;
  className?: string;
}

export default function ErrorAlert({
  error,
  className = 'mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm',
}: ErrorAlertProps) {
  return (
    <div role="alert" className={error ? className : ''}>
      {error}
    </div>
  );
}
