import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import { AuthLayout } from './Login';
import { AuthField } from '../components/AuthField';
import LoadingButton from '../components/LoadingButton';

export default function Onboarding() {
  const navigate = useNavigate();
  const [tenantName, setTenantName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createTenant(tenantName);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="組織の登録">
      <p className="text-sm text-slate-600 mb-4">
        Toique を利用する組織名 (会社名・屋号など) を入力してください。
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="組織名" value={tenantName} onChange={setTenantName} />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <LoadingButton
          type="submit"
          loading={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '作成中…' : '組織を作成して開始'}
        </LoadingButton>
      </form>
    </AuthLayout>
  );
}
