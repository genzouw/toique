# プロジェクトの技術スタックとコーディング規約

## 技術スタック
- バックエンド: Bun, Hono, Drizzle ORM, PostgreSQL (17)
- フロントエンド: React 19, Vite, Tailwind CSS 4
- 認証: better-auth
- クラウド/インフラ: Google Cloud (Cloud Run), Cloudflare Pages, CDKTF

## AI・コーディング向け共通規約
1. **言語とコメント**: ソースコード内のコメントや説明はすべて**日本語**で記述してください。
2. **パッケージ管理**: npmやpnpmではなく、**Bun** (`bun install`, `bun run ...`) を使用してください。
3. **セキュリティとアクセス制御**:
   - `ADMIN_USERNAME` や `ADMIN_PASSWORD` など、ハードコードされた認証情報は避けてください。
   - バックエンドの API エンドポイントには、適切なミドルウェア（`requireOperator`, `requireTenant` など）で認可チェックを行ってください。
4. **型安全性**: TypeScript の機能を最大限に活かし、any型はできる限り避けてください。
5. **UI コンポーネント**: `lucide-react` をアイコンに使用し、カスタムCSSよりもTailwind CSS 4 のクラスを使用してスタイリングを行ってください。
6. **パフォーマンス**:
   - 大きな配列操作には `Map` や `Set` を使用して計算量 O(1) でのルックアップを意識してください。
   - 不要なデータベースクエリを減らすために、必要なフィールドのみを取得してください。
