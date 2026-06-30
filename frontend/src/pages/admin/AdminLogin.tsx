import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Shield } from 'lucide-react';
import { api } from '../../lib/api';
import { ICON_SIZE } from '../../lib/icon-size';
import LoadingButton from '../../components/LoadingButton';
import { AuthField } from '../../components/AuthField';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const token = btoa(
        String.fromCharCode(
          ...new TextEncoder().encode(`${username}:${password}`),
        ),
      );
      localStorage.setItem('adminAuth', token);

      // Verify credentials
      await api.getAdminMe();
      navigate('/admin', { replace: true });
    } catch {
      localStorage.removeItem('adminAuth');
      setError('IDまたはパスワードが正しくありません。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
            <Shield className="text-amber-400" size={ICON_SIZE.xxl} />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">
            運営者ログイン
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center" role="alert">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <AuthField
              label="ユーザーID"
              type="text"
              value={username}
              onChange={setUsername}
              variant="admin"
            />
            <AuthField
              label="パスワード"
              type="password"
              value={password}
              onChange={setPassword}
              variant="admin"
            />
          </div>
          <div>
            <LoadingButton
              type="submit"
              loading={isLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-slate-900 bg-amber-400 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition-colors"
            >
              ログイン
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
