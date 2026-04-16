# フロントエンド最小管理画面 実装計画 (Phase 2b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ブラウザから LINE チャネルの登録/削除と受信メッセージの閲覧ができる最小管理画面を構築する。認証なし、シンプルな UI、最短でフィードバックループを回すことが目的。

**Architecture:** Vite + React 19 + React Router 7 + Tailwind CSS 4 + @base-ui-components/react。既存 backend (port 3000) の REST API を直接叩く SPA。認証はPhase 2a で追加。

**Tech Stack:**

- Frontend: React 19 / Vite 6 / TypeScript 5.8 / Tailwind CSS 4 / @base-ui-components/react / lucide-react
- 既存 backend: port 3000 の REST API を利用

---

## File Structure

```
toique/
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── .dockerignore
│   └── src/
│       ├── main.tsx                # エントリポイント
│       ├── App.tsx                 # ルーティング + レイアウト
│       ├── index.css               # Tailwind + ベース
│       ├── vite-env.d.ts
│       ├── lib/
│       │   ├── api.ts              # fetch ラッパー（型付き）
│       │   └── utils.ts            # cn() など
│       ├── components/
│       │   ├── Layout.tsx          # ヘッダ + サイドナビ + 本文
│       │   ├── Button.tsx          # base-ui ベースの共通ボタン
│       │   └── Spinner.tsx
│       └── pages/
│           ├── Dashboard.tsx       # 統計カード
│           ├── Channels.tsx        # チャネル一覧 + 登録 + 削除
│           └── Messages.tsx        # 受信メッセージ一覧
└── compose.yml                     # frontend サービス追加
```

---

## Task 0: Frontend プロジェクトセットアップ

**Files:**

- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`

- [ ] **Step 0.1: frontend/package.json**

```json
{
  "name": "toique-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@base-ui-components/react": "^1.0.0-rc.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.8.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router": "^7.5.0",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^4.4.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.8.0",
    "vite": "^6.3.0"
  }
}
```

- [ ] **Step 0.2: frontend/tsconfig.json (ルート)**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 0.3: frontend/tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": false
  },
  "include": ["src"]
}
```

- [ ] **Step 0.4: frontend/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 0.5: frontend/vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
});
```

- [ ] **Step 0.6: frontend/index.html**

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Toique 管理画面</title>
  </head>
  <body class="h-full">
    <div id="root" class="h-full"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 0.7: frontend/Dockerfile**

```dockerfile
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]
```

- [ ] **Step 0.8: frontend/.dockerignore**

```
node_modules
dist
.env
*.log
```

- [ ] **Step 0.9: npm install**

```bash
cd frontend && npm install
```

- [ ] **Step 0.10: コミット**

```bash
git add frontend/package.json frontend/package-lock.json frontend/tsconfig*.json \
        frontend/vite.config.ts frontend/index.html frontend/Dockerfile \
        frontend/.dockerignore
git commit -m "chore: scaffold frontend project with vite + react + tailwind"
```

---

## Task 1: ベースCSS & エントリポイント

**Files:**

- Create: `frontend/src/index.css`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/vite-env.d.ts`
- Create: `frontend/src/App.tsx` (最小)

- [ ] **Step 1.1: frontend/src/index.css**

```css
@import 'tailwindcss';

html,
body,
#root {
  height: 100%;
}

body {
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
}
```

- [ ] **Step 1.2: frontend/src/vite-env.d.ts**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 1.3: frontend/src/App.tsx (最小ルーティング)**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Messages from './pages/Messages';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/messages" element={<Messages />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 1.4: frontend/src/main.tsx**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

---

## Task 2: API クライアント & ユーティリティ

**Files:**

- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/utils.ts`

- [ ] **Step 2.1: frontend/src/lib/utils.ts**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2.2: frontend/src/lib/api.ts**

```ts
const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
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

export const api = {
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
};
```

---

## Task 3: Layout コンポーネント

サイドナビ付きの共通レイアウト。

**Files:**

- Create: `frontend/src/components/Layout.tsx`

- [ ] **Step 3.1: frontend/src/components/Layout.tsx**

```tsx
import { NavLink, Outlet } from 'react-router';
import { MessageSquare, Plug, LayoutDashboard } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { to: '/channels', label: 'LINEチャネル', icon: Plug },
  { to: '/messages', label: '受信メッセージ', icon: MessageSquare },
];

export default function Layout() {
  return (
    <div className="flex h-full bg-slate-50">
      <aside className="w-60 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="text-xl font-bold text-slate-900">Toique</div>
          <div className="text-xs text-slate-500 mt-0.5">管理画面</div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100',
                  )
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-5 py-3 text-xs text-slate-400 border-t border-slate-200">
          v0.1.0 (Phase 2b)
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
```

---

## Task 4: Dashboard ページ

**Files:**

- Create: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 4.1: frontend/src/pages/Dashboard.tsx**

```tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Dashboard() {
  const [channels, setChannels] = useState<number | null>(null);
  const [messages, setMessages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, m] = await Promise.all([
          api.listChannels(),
          api.listMessages(),
        ]);
        setChannels(c.length);
        setMessages(m.length);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
      <p className="text-sm text-slate-500 mt-1">
        Phase 1 動作状況を表示します
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <StatCard label="登録済みチャネル" value={channels} unit="件" />
        <StatCard
          label="受信メッセージ (最新100件)"
          value={messages}
          unit="件"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">
          {value ?? '—'}
        </span>
        <span className="text-sm text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
```

---

## Task 5: Channels ページ

一覧、追加フォーム、削除。

**Files:**

- Create: `frontend/src/pages/Channels.tsx`

- [ ] **Step 5.1: frontend/src/pages/Channels.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api, type LineChannel } from '../lib/api';

export default function Channels() {
  const [items, setItems] = useState<LineChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    channelId: '',
    channelSecret: '',
    channelAccessToken: '',
    displayName: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await api.listChannels());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createChannel(form);
      setForm({
        channelId: '',
        channelSecret: '',
        channelAccessToken: '',
        displayName: '',
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('削除してよろしいですか？')) return;
    try {
      await api.deleteChannel(id);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">LINEチャネル管理</h1>
      <p className="text-sm text-slate-500 mt-1">
        Webhook URL は{' '}
        <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">
          /webhooks/line/&lt;Channel ID&gt;
        </code>{' '}
        になります
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-lg p-5"
      >
        <Field
          label="表示名"
          value={form.displayName}
          onChange={(v) => setForm({ ...form, displayName: v })}
          placeholder="例: テスト用チャネル"
        />
        <Field
          label="Channel ID"
          value={form.channelId}
          onChange={(v) => setForm({ ...form, channelId: v })}
          placeholder="2001234567"
        />
        <Field
          label="Channel Secret"
          value={form.channelSecret}
          onChange={(v) => setForm({ ...form, channelSecret: v })}
          placeholder="32文字のシークレット"
          type="password"
        />
        <Field
          label="Channel Access Token"
          value={form.channelAccessToken}
          onChange={(v) => setForm({ ...form, channelAccessToken: v })}
          placeholder="long-lived token"
          type="password"
        />
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm disabled:opacity-50"
          >
            {submitting ? '登録中…' : 'チャネルを登録'}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          登録済みチャネル ({items.length})
        </h2>
        {loading ? (
          <div className="mt-4 text-sm text-slate-500">読み込み中…</div>
        ) : items.length === 0 ? (
          <div className="mt-4 text-sm text-slate-500">
            まだ登録されていません
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
            {items.map((ch) => (
              <li
                key={ch.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {ch.displayName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Channel ID: {ch.channelId}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(ch.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  aria-label="削除"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
      />
    </label>
  );
}
```

---

## Task 6: Messages ページ

受信メッセージ一覧。

**Files:**

- Create: `frontend/src/pages/Messages.tsx`

- [ ] **Step 6.1: frontend/src/pages/Messages.tsx**

```tsx
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api, type InboundMessage } from '../lib/api';

export default function Messages() {
  const [items, setItems] = useState<InboundMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await api.listMessages());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">受信メッセージ</h1>
          <p className="text-sm text-slate-500 mt-1">
            LINEから受信した最新100件を表示します
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100"
        >
          <RefreshCw size={14} />
          更新
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-slate-500">読み込み中…</div>
        ) : items.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            まだメッセージを受信していません
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">受信時刻</th>
                <th className="text-left px-4 py-2 font-medium">イベント</th>
                <th className="text-left px-4 py-2 font-medium">
                  メッセージ種別
                </th>
                <th className="text-left px-4 py-2 font-medium">テキスト</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-slate-700 whitespace-nowrap">
                    {new Date(m.receivedAt).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">
                      {m.eventType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {m.messageType ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-900">
                    {m.text ?? (
                      <span className="text-slate-400">(テキストなし)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

---

## Task 7: ベース App.tsx / main.tsx / index.css コミット

Task 1-6 で作ったファイルすべてをまとめてコミット。

- [ ] **Step 7.1: コミット**

```bash
git add frontend/src/
git commit -m "feat: add minimal admin UI with dashboard, channels, messages"
```

---

## Task 8: Docker Compose に frontend を追加

**Files:**

- Modify: `compose.yml`

- [ ] **Step 8.1: compose.yml に frontend service を追加**

末尾（volumes の前）に追記:

```yaml
frontend:
  build:
    context: ./frontend
    target: dev
  ports:
    - '5173:5173'
  environment:
    VITE_API_URL: http://localhost:3000
  volumes:
    - ./frontend/src:/app/src
  depends_on:
    - backend
```

- [ ] **Step 8.2: Docker Compose 全体起動**

```bash
cd ~/.ghq/github.com/genzouw/toique
docker compose up -d --build
sleep 5
docker compose ps
```

Expected: `db`, `backend`, `frontend` がすべて Up。

- [ ] **Step 8.3: ブラウザ動作確認**

ブラウザで http://localhost:5173 を開く。

- ダッシュボード: 統計カードが表示される
- LINEチャネル: 登録/一覧/削除ができる
- 受信メッセージ: 一覧が表示される（空でもOK）

- [ ] **Step 8.4: コミット**

```bash
git add compose.yml
git commit -m "chore: add frontend service to docker compose"
```

---

## Task 9: README 更新

**Files:**

- Modify: `README.md`

- [ ] **Step 9.1: README.md に管理画面情報を追加**

`## ステータス` の直後に以下を追加:

```markdown
## 管理画面

http://localhost:5173 にアクセスすると、以下の機能が使えます:

- ダッシュボード: 登録チャネル数・受信メッセージ数
- LINEチャネル管理: 登録・一覧・削除
- 受信メッセージ一覧: 受信時刻・種別・テキスト
```

また、ポート表に frontend を追加:

```markdown
| frontend | 5173 | 5173 |
```

- [ ] **Step 9.2: コミット**

```bash
git add README.md
git commit -m "docs: document admin UI and frontend port"
```

---

## Self-Review

### Spec coverage

設計書 §10.1 管理画面の主要ページ:

- ダッシュボード → Task 4
- LINEチャネル管理 → Task 5
- 問い合わせ一覧 → Task 6 (messages)
- フォーム一覧/ビルダー → **Phase 3** で対応
- 問い合わせ詳細 → **Phase 2.5** で対応（最低限詳細画面が必要）
- 請求 → **Phase 3+**
- オペレーター管理 → **Phase 2a (better-auth)**

### 意図的な限界（Phase 2b の範囲外）

- 認証なし（誰でもアクセス可能）
- チャネルの secret/token をフォームに平文表示 (Phase 2a で masked に)
- メッセージ詳細画面なし
- ページネーション・検索なし
- テスト (vitest/testing-library) なし
