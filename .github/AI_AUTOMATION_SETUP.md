# AI & Automation 導入のための事前作業マニュアル

当リポジトリでは、2024年にパブリックリポジトリ向けに無料化された最新のAI機能および自動化機能を活用し、開発の自動化・セキュリティ向上を試験的に導入・検証しています。
これらの機能を最大限活用するため、PRをマージする前に**リポジトリの管理者が手動で設定する必要がある項目**を以下に記載します。

## 1. 依存関係の自動マージの有効化 (Dependabot Auto-merge)

Dependabotによるマイナー/パッチアップデートの自動マージ（`.github/workflows/dependabot-auto-merge.yml`）を機能させるために、リポジトリの設定で「Auto-merge」を許可する必要があります。

**設定手順:**

1. GitHubリポジトリの **Settings** を開く。
2. 左側メニューの **General** を選択する。
3. 画面中央の **Pull Requests** セクションまでスクロールする。
4. **Allow auto-merge** のチェックボックスをオン（有効）にする。
5. （推奨）合わせて **Allow squash merging** のみを有効化し、他を無効化することでコミット履歴をきれいに保ちます。

## 2. GitHub Copilot Autofix & Advanced Security の有効化

2024年より、パブリックリポジトリではGitHub Advanced Securityの一部機能（Copilot Autofixを含む）が無料で利用可能になっています。
これにより、CodeQL等で検出された脆弱性に対して、AIが自動で修正案（Autofix PRコメント）を提示するようになります。

**設定手順:**

1. GitHubリポジトリの **Settings** を開く。
2. 左側メニューの **Code security and analysis** を選択する。
3. 以下の機能をそれぞれ **Enable**（有効化）する。
   - **Dependabot alerts**
   - **Dependabot security updates**
   - **Code scanning alerts** (CodeQLは既に `.github/workflows/codeql.yml` で構成済み)
   - **Secret scanning**
   - **Secret scanning push protection**
4. 組織設定（Organization Settings）で Copilot の機能が有効化されている場合、Code scanning の設定内に **Copilot Autofix** のトグルが表示されるので、それを **On** にする。

## 3. GitHub Models (Issue Triage, Weekly Summary, Release Drafter, AI ChatOps, AI PR Code Review, AI PR Description 用)

AI Issue Triage (`ai-issue-triage.yml`)、AI Weekly Summary (`ai-weekly-summary.yml`)、AI Release Drafter (`ai-release-drafter.yml`) は、GitHubが提供する無料の GitHub Models (gpt-4o-mini) を利用しています。**AI ChatOps** (`ai-chatops.yml`)、**AI PR Code Review** (`ai-pr-review.yml`)、**AI PR Description Generator** (`ai-pr-description.yml`)、および **AI CI Failure Analyzer** (`ai-ci-analyzer.yml`) は GitHub Models (gpt-4o) を利用しています。追加のAPIキー設定は不要で、標準の `GITHUB_TOKEN` を用いて動作します。

**各ワークフローのトリガーと保護条件:**

- **AI Issue Triage** — Issue が作成された時にトリガー。`author_association` ガードにより権限を持つユーザー（OWNER, MEMBER, COLLABORATOR）が Issue を作成した場合のみ実行されます。
- **AI Weekly Summary** — `schedule`（毎週月曜 00:00 UTC）および `workflow_dispatch`（手動実行）でトリガー。スケジュール起動のため `author_association` ガードは適用されません。
- **AI Release Drafter** — `main` ブランチへの `push` でトリガー。push 権限を持つユーザーのみがトリガーできるため、`author_association` ガードは適用されません。
- **AI PR Code Review** — Pull Requestの `opened`, `synchronize`, `reopened` 時にトリガー。PRのdiffを取得し、GitHub Models (gpt-4o) と `duckduckgo-search` による Web 検索 (RAG) を用いて、自動でレビューコメントを投稿します。
- **AI PR Description Generator** — Pull Requestの `opened`, `synchronize`, `reopened` 時にトリガー。PRのdiffを取得し、GitHub Models (gpt-4o) を用いて、自動でPRのDescription（説明文）の改善案を提案します。
- **AI ChatOps** — Pull Request へのコメントが `/ai` で始まった時にトリガー。コメント内容と Web 検索 (RAG) を用いて回答や修正案を提示します。

**権限の注意事項:**
各ワークフローは設定不要で標準の `GITHUB_TOKEN` で動作しますが、ワークフローファイル内で `permissions` キーを使用して `issues: write` や `pull-requests: write` 権限を明示的に付与しています。最小権限の原則に従い、リポジトリ全体の Actions 設定では **`Read repository contents and packages permissions`（読み取り専用）のままにしておくことを推奨します。**

## 4. AIコードレビューの設定最適化

当リポジトリでは CodeRabbit および Qodo Merge (旧 PR Agent) などの無料AIレビューツールを導入しています。
生成AIのレビュー精度を向上させるため、各設定ファイル（`.coderabbit.yaml`, `.pr_agent.toml`）には以下のような追加のレビュー観点が定義されています。
もし新たなセキュリティやパフォーマンス、アクセシビリティの懸念事項があれば、設定ファイルを手動で調整し、AIのプロンプトを最適化してください。

- パフォーマンス: O(N)ループの回避、N+1問題の防止、不要なDBクエリの削減など
- アクセシビリティ: ボタン等のアクション要素における具体的な対象を含んだ aria-label や title の付与、role="tablist" におけるキーボードナビゲーションや roving tabIndex のサポートなど

## 5. 新規導入した自動化ツールの運用ルール (2024年導入)

更なる開発効率化のため、以下の新しいAIツールおよびCI/CDの自動化パイプラインが追加されています。これらは標準で動作するように設定されていますが、運用上以下の点を留意してください。

### AI ChatOps の利用 (PRコメント)

PRのコメント欄で `/ai <メッセージ>` を記述することで、GitHub Models (gpt-4o) と DuckDuckGo を用いたアシスタント機能が起動します。
例:

- `/ai このPRのパフォーマンス上の懸念点を教えてください`
- `/ai テストコードの作成を手伝ってください`

### AI Auto-Fix (/ai-fix)

PRのコメントで `/ai-fix [FIX_CONTENT]` と入力すると、AIが対象のコードを修正し、自動的にPRブランチへコミット・プッシュします。
**注意:** この機能はGitHub Modelsの推論APIを使用するため、リポジトリのSecretsに `PAT_FOR_MODELS` という名前で、GitHub ModelsおよびPull Requestへの書き込み権限を持ったPersonal Access Token (PAT) を手動で設定する必要があります。

### Semantic PR Title の適用

リリースノートの自動生成（AI Release Drafter）の精度向上のため、PRのタイトルには **Conventional Commits** フォーマットを強制するチェック (`semantic-pr-title.yml`) が有効になっています。
PRのタイトルは必ず `feat:`, `fix:`, `docs:`, `chore:` 等のプレフィックスから開始してください。

### Typos (スペルチェッカー) の導入

Rust製の高速なスペルチェッカー `typos` がCIに追加されています。タイポが検知された場合はCIが失敗するため、適宜修正してください。意図的な固有表現で引っかかる場合は、リポジトリルートに `typos.toml` を作成して除外設定を行ってください。

### AI CI Failure Analyzer (CI エラー自動分析)

`ci.yml` など主要なワークフローが失敗した際に、失敗したジョブのログを取得し、GitHub Models (`gpt-4o`) を用いてエラー原因の分析と修正案の提案を対象のPull Requestに自動でコメントします (`ai-ci-analyzer.yml`)。

- **トリガー**: 対象のワークフローが完了し、`conclusion` が `failure` の場合にトリガー。
- **権限設定**: `workflow_run` をトリガーとするため、Actions設定でデフォルトの `GITHUB_TOKEN` に `actions: read` と `pull-requests: write` の権限が含まれている、あるいはワークフローファイル内で明示的に定義された権限が有効である必要があります。

---

上記の事前設定および確認が完了していることを確認した上で、プルリクエストをメインブランチにマージしてください。
