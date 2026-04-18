const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> ?? {}),
  };

  if (path.startsWith('/api/v1/admin/')) {
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
      headers['Authorization'] = `Basic ${adminAuth}`;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type LineChannel = {
  id: string;
  tenantId: string;
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
};

export type InboundMessage = {
  id: string;
  lineChannelId: string;
  lineUserId: string | null;
  eventType: string;
  messageType: string | null;
  text: string | null;
  rawEvent: Record<string, unknown>;
  receivedAt: string;
};

export type OnboardingStatus = {
  user: { id: string; email: string; name: string };
  tenant: {
    id: string;
    name: string;
    plan: string;
    role: string;
  } | null;
};

export type Form = {
  id: string;
  tenantId: string;
  lineChannelId: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  triggerKeyword: string | null;
  schema: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type Submission = {
  id: string;
  tenantId: string;
  formId: string;
  lineUserId: string;
  answers: Record<string, unknown>;
  status: 'new' | 'in_review' | 'done';
  submittedAt: string;
};

export type ContactCategory =
  | 'bug'
  | 'feature'
  | 'pricing'
  | 'consultation'
  | 'other';

export type ContactStatus = 'new' | 'in_review' | 'done';

export type ContactListItem = {
  id: string;
  userId: string | null;
  tenantId: string | null;
  tenantName: string | null;
  name: string;
  email: string;
  category: ContactCategory;
  subject: string;
  status: ContactStatus;
  createdAt: string;
};

export type ContactDetail = ContactListItem & {
  body: string;
  url: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  updatedAt: string;
};

export type ContactSubmitInput = {
  name: string;
  email: string;
  category: ContactCategory;
  subject: string;
  body: string;
  url?: string;
  /** ハニーポット: 常に空文字で送る */
  website?: string;
};

export type ResourceUsage = { current: number; limit: number };

export type UsageResponse = {
  plan: string;
  usage: {
    lineChannels: ResourceUsage;
    forms: ResourceUsage;
    submissionsPerMonth: ResourceUsage;
    members: ResourceUsage;
  };
};

export const api = {
  getOnboardingStatus: () => request<OnboardingStatus>('/api/v1/onboarding/me'),
  createTenant: (tenantName: string) =>
    request<{
      tenant: { id: string; name: string; plan: string; role: string };
    }>('/api/v1/onboarding', {
      method: 'POST',
      body: JSON.stringify({ tenantName }),
    }),
  listChannels: () => request<LineChannel[]>('/api/v1/line-channels'),
  createChannel: (input: {
    channelId: string;
    channelSecret: string;
    channelAccessToken: string;
    displayName: string;
  }) =>
    request<LineChannel>('/api/v1/line-channels', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteChannel: (id: string) =>
    request<void>(`/api/v1/line-channels/${id}`, { method: 'DELETE' }),
  listMessages: () => request<InboundMessage[]>('/api/v1/messages'),
  listForms: () => request<Form[]>('/api/v1/forms'),
  getForm: (id: string) => request<Form>(`/api/v1/forms/${id}`),
  createForm: (input: {
    name: string;
    lineChannelId: string;
    status?: string;
    triggerKeyword?: string | null;
    schema: Record<string, unknown>;
  }) =>
    request<Form>('/api/v1/forms', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateForm: (
    id: string,
    input: Partial<{
      name: string;
      status: string;
      triggerKeyword: string | null;
      schema: Record<string, unknown>;
    }>,
  ) =>
    request<Form>(`/api/v1/forms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteForm: (id: string) =>
    request<void>(`/api/v1/forms/${id}`, { method: 'DELETE' }),
  listSubmissions: () => request<Submission[]>('/api/v1/submissions'),
  getUsage: () => request<UsageResponse>('/api/v1/usage'),
  createCheckout: () =>
    request<{ url: string }>('/api/v1/billing/checkout', { method: 'POST' }),
  createPortalSession: () =>
    request<{ url: string }>('/api/v1/billing/portal', { method: 'POST' }),
  exportSubmissionsUrl: (formId: string) =>
    `${BASE_URL}/api/v1/submissions/export?formId=${encodeURIComponent(formId)}`,
  submitContact: (input: ContactSubmitInput) =>
    request<{ ok: true; id: string }>('/api/v1/contact', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getAdminMe: () =>
    request<{ user: { id: string; email: string; name: string } }>(
      '/api/v1/admin/me',
    ),
  listAdminContacts: () => request<ContactListItem[]>('/api/v1/admin/contacts'),
  getAdminContact: (id: string) =>
    request<ContactDetail>(`/api/v1/admin/contacts/${id}`),
  updateAdminContactStatus: (id: string, status: ContactStatus) =>
    request<ContactDetail>(`/api/v1/admin/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  async downloadSubmissionsCsv(formId: string, suggestedName: string) {
    const res = await fetch(this.exportSubmissionsUrl(formId), {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`CSV ダウンロードに失敗しました: ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = `${suggestedName}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
