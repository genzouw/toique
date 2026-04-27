import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Shield } from 'lucide-react';
import { api } from '../../lib/api';
import { ICON_SIZE } from '../../lib/icon-size';
import LoadingButton from '../../components/LoadingButton';

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
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-700"
              >
                ユーザーID
              </label>
              <input
                id="username"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div>
            <LoadingButton
              type="submit"
              loading={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-slate-900 bg-amber-400 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition-colors"
            >
              ログイン
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
