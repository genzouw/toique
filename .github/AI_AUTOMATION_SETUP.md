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

## 3. GitHub Models (Issue Triage, Weekly Summary, Release Drafter, AI ChatOps, AI PR Code Review, AI PR Description Generator 用)

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

PRのコメント欄で `/ai MESSAGE` を記述することで、`GitHub Models` (`gpt-4o`) と `Tavily`/`DuckDuckGo` を用いたアシスタント機能が起動します。
より精度の高い検索結果を得るために、リポジトリのSecretsに `TAVILY_API_KEY` を設定することを推奨します。設定されていない場合はDuckDuckGoへフォールバックします。
例:

- `/ai このPRのパフォーマンス上の懸念点を教えてください`
- `/ai セキュリティの観点からレビューしてください`

### AI Auto-Fix (/ai-fix)

PRのコメントで `/ai-fix [FIX_CONTENT]` と入力すると、AIが対象のコードを修正し、自動的にPRブランチへコミット・プッシュします。
**注意:** この機能はGitHub Modelsの推論APIを使用するため、リポジトリのSecretsに `PAT_FOR_MODELS` という名前で、GitHub ModelsおよびPull Requestへの書き込み権限を持ったPersonal Access Token (PAT) を手動で設定する必要があります。

### AI Test Generator (/ai-test)

PRのコメントで `/ai-test [追加の指示]` と入力すると、AIがPRの変更差分を解析し、不足しているユニットテストコードを自動生成してPRブランチへコミット・プッシュします。
これも `PAT_FOR_MODELS` シークレットの設定が必要です。

### 高精度な Web 検索の有効化 (Tavily API)

AI ChatOps、AI PR Review、AI Issue Triage の各機能において、AI が外部の最新情報を検索する (RAG) 際に、デフォルトの DuckDuckGo 検索に代わって、より高精度で安定した検索が可能な **Tavily API** を利用できます。
AI Test Generator (`/ai-test`) も同じ検索 (Tavily 優先 / DuckDuckGo フォールバック) を利用し、最新のテスト手法・ベストプラクティスを参照します。
**設定手順:**

1. [Tavily](https://tavily.com/) の公式サイトで無料アカウントを作成し、API キーを取得します。
2. GitHub リポジトリの **Settings → Secrets and variables → Actions** を開きます。
3. **New repository secret** をクリックし、名前を `TAVILY_API_KEY` とし、取得した API キーを値として保存します。
   ※ この設定を行わない場合は、自動的に無料の DuckDuckGo 検索にフォールバックされます。

### AI Dependabot Risk Analyzer

Dependabot による依存関係の更新 Pull Request が作成された際に、AIが自動的にリリースノートや既知の不具合を検索し、破壊的変更のリスクや影響範囲を分析してコメントを投稿します。
**注意:** Dependabot が作成する Pull Request から起動される GitHub Actions ワークフローは、セキュリティ制限により通常の Actions シークレットへアクセスできません。この機能を利用するには、ワークフローのイベントトリガーを `pull_request_target` に変更するなどの対応が必要です。なお、**Settings → Secrets and variables → Dependabot** に登録したシークレット（Dependabot secrets）は Dependabot 自身のプライベートレジストリ等へのアクセスに使われるもので、Actions ワークフロー (`secrets.PAT_FOR_MODELS` 等) からは参照できない点にもご注意ください。

- `PAT_FOR_MODELS`: GitHub Models API を呼び出すための Personal Access Token
- `TAVILY_API_KEY`: (推奨) 高精度な Web 検索を行うための Tavily API キー

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

### GitHub Actions Security Scanner (zizmor)

当リポジトリでは `zizmor` を用いて GitHub Actions ワークフローの静的解析を行っています。
`zizmor` はワークフロー内のセキュリティリスク（シークレットの漏洩、意図しないインジェクションなど）を事前に検知します。
マージ前に必ず GitHub の Security タブ（Code scanning alerts）で `zizmor` からの警告が出ていないか確認してください。
