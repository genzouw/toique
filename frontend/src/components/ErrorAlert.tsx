import { memo } from 'react';

interface ErrorAlertProps {
  error: string | null;
  className?: string;
}

/**
 * ⚡ Bolt: 不要な再レンダーを防ぐために React.memo() でラップしています。
 * React.memo() は props の浅い比較を行い、親コンポーネント（例: Dashboard）が
 * ローディング状態などの更新で再レンダーされても、error の値が変化していない場合は
 * このコンポーネントの再レンダーをスキップします。
 * 期待される効果: 親の状態遷移時における仮想DOM差分計算のオーバーヘッド削減。
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
