import { useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { ICON_SIZE } from '../lib/icon-size';

export type AuthFieldVariant = 'user' | 'admin';

// 一般ユーザー向け (slate) と運営者向け (amber) でフォーカスリング色と細部スタイルを切替。
// その他の差分（パスワードトグルの aria-pressed / aria-label / title 等の a11y 仕様）は
// variant に依らず常に同じ実装が適用される。
const inputClassByVariant: Record<AuthFieldVariant, string> = {
  user: 'text-sm focus-visible:ring-2 focus-visible:ring-slate-900',
  admin:
    'shadow-sm text-sm focus:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500',
};

const toggleButtonClassByVariant: Record<AuthFieldVariant, string> = {
  user: 'text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-900 rounded-sm',
  admin:
    'p-2 text-slate-500 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md',
};

export interface AuthFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  variant?: AuthFieldVariant;
  autoComplete?: string;
}

export function AuthField({
  label,
  type = 'text',
  value,
  onChange,
  variant = 'user',
  autoComplete,
}: AuthFieldProps) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="mt-1 relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          className={`w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none ${inputClassByVariant[variant]} ${isPassword ? 'pr-10' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-controls={id}
            aria-pressed={showPassword}
            className={`absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none ${toggleButtonClassByVariant[variant]}`}
            aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
            title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
          >
            {showPassword ? (
              <EyeOff size={ICON_SIZE.sm} />
            ) : (
              <Eye size={ICON_SIZE.sm} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
