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

## 3. GitHub Models 依存ワークフローの撤去 (2026-07-30 提供終了)

GitHub Models は 2026-07-30 に playground・モデルカタログ・推論 API・BYOK のすべてが[提供終了](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)しました。
推論 API 自体が存在しないため、これに依存していたワークフローは**エンドポイントを差し替えても復旧しません**。
（`models.inference.ai.azure.com` は `models.github.ai` よりさらに古い旧エンドポイントであり、置換はむしろ後退です。）

そのため以下を撤去しました。

- `ai-*.yml` 23 本（Issue Triage / ChatOps / PR Review / PR Description / Weekly Summary / Release Drafter / CI Analyzer / Threat Modeling / Test Generator / Auto-Fix / Issue Solver / Auto-Documenter / OpenAPI Generator / Blog Generator / a11y Scanner / i18n Translator / Tech Debt Analyzer / Architecture Diagram / PR Labeler / PR Summary / Security Approval / Dependabot Analyzer / Agent Rules Sync）
- Composite Action `.github/actions/ai-web-search`（利用者が上記のみだったため）
- 上記に付随する `EXA_API_KEY` / `TAVILY_API_KEY`（RAG 用 Web 検索キー。他に利用者はありません）

**シークレットの取り扱い:**

- `EXA_API_KEY` / `TAVILY_API_KEY` — 利用者が無くなったため、登録されている場合はリポジトリの Secrets から削除して構いません。
- `PAT_FOR_MODELS` — 本リポジトリには**登録されていません**。「GitHub Models 用のトークンを削除するか残すか」という判断自体が対象不在で成立しません。
  - 確認範囲: Actions secrets / Dependabot secrets / Environment secrets の 3 面をそれぞれ API で確認済み（`gh api repos/genzouw/toique/actions/secrets`、`.../dependabot/secrets`、`.../environments`）。**User 所有リポジトリでも Environment secrets と Dependabot secrets は利用可能**なので、Actions secrets の結果だけでは未登録と断定できない点に注意してください。対象外となるのは Organization secrets の階層だけです（owner が User のため存在しません）。
  - `pre-commit-autoupdate.yml` は PR 作成用トークンとして `secrets.PAT_FOR_AUTOMATION` を参照します（`GITHUB_TOKEN` で PR を作ると後続の Actions がトリガーされないため専用トークンが必要）が、これも上記 3 面のいずれにも未登録です。**このワークフローは現状のままではトークン未設定により失敗します。** `with:` にキーを指定している以上、`peter-evans/create-pull-request` 側の `default: ${{ github.token }}` は適用されず空文字が渡り、v8.1.1 は API を叩く前に `Input 'token' not supplied. Unable to continue.` で終了します（401 にはなりません）。
  - **未対応の手動作業**: fine-grained Personal Access Token を新規発行し、`PAT_FOR_AUTOMATION` という名前でリポジトリの Secrets に登録してください。必要な権限は本リポジトリに対する **Contents: write** と **Pull requests: write** の 2 つです。当ワークフローは `add-paths: .pre-commit-config.yaml` で workflow ファイルを書き換えないため、`workflow` 相当の権限は不要です。GitHub Models へのスコープも不要です。

AI によるレビュー・トリアージの代替方針は第5節を参照してください。

## 4. AIコードレビューの設定最適化

当リポジトリでは CodeRabbit および Qodo Merge (旧 PR Agent) といった外部 AI レビューツールを導入対象としています（Qodo Merge の無料利用条件は「新規AIレビューツール (CodeRabbit & PR-Agent) の導入手順」を参照。本リポジトリは現時点で無料対象外です）。
生成AIのレビュー精度を向上させるため、各設定ファイル（`.coderabbit.yaml`, `.pr_agent.toml`）には以下のような追加のレビュー観点が定義されています。
もし新たなセキュリティやパフォーマンス、アクセシビリティの懸念事項があれば、設定ファイルを手動で調整し、AIのプロンプトを最適化してください。

- パフォーマンス: O(N)ループの回避、N+1問題の防止、不要なDBクエリの削減など
- アクセシビリティ: ボタン等のアクション要素における具体的な対象を含んだ aria-label や title の付与、role="tablist" におけるキーボードナビゲーションや roving tabIndex のサポートなど

## 5. AI 実行基盤の方針: 無料枠のみを利用する

**当リポジトリの CI/CD から呼び出す AI モデル・外部サービスは、すべて無料で利用できるものに限定します。**

> **⚠️ GitHub Models は 2026-07-30 をもって完全に終了しました。**
> playground・モデルカタログ・推論 API・BYOK のいずれも利用できません（[GitHub Changelog](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)）。
> `permissions: models: read` を付与しても推論 API 自体が存在しないため、GitHub Models に依存するワークフローは動作しません。
> 該当した 23 本のワークフローは**撤去済み**です（第3節）。

**現行の方針: GitHub ネイティブの無料 AI 推論基盤は存在しないため、リポジトリ側で AI 推論を実行するワークフローは新規に追加しません。**

AI によるレビュー・トリアージは、リポジトリ側に API キーも課金設定も必要としない外部 App（CodeRabbit / Qodo Merge、第4節参照）に一本化します。

ただし「App 側で推論が走る」ことと「無料である」ことは別問題です。App ごとに無料条件を確認し、条件を満たさないものは本方針上採用できません。

- **CodeRabbit**: 公開リポジトリ向けの無料プラン（Open Source）があり、本リポジトリは対象です。
- **Qodo Merge**: 無料利用は [Qodo for Open Source](https://docs.qodo.ai/open-source-program) に承認された場合のみ（公開リポジトリ・stars 100 以上・継続的なメンテナンス・利用ポリシー遵守）。本リポジトリは stars が条件未達のため**現時点では無料対象外**で、通常プランはクレジット課金となるため導入を見送っています。

**採用しないもの:**

- **GitHub Models**: 2026-07-30 に提供終了。新規採用・再導入とも不可です。
- **GitHub Copilot / Microsoft Foundry**: GitHub Models の後継として案内されていますが、いずれも premium request 消費（課金）または API キー管理を伴うため、上記の無料方針と両立しません。
- **GitHub Agentic Workflows (`gh-aw`)**: 2026年に一度導入しましたが、`copilot` エンジンが GitHub Copilot の premium request / AI クレジットを消費する**有料**サービスであり、無料方針と両立しないため撤去しました。関連ファイル（`.github/workflows/*-agent.md`、`*.lock.yml`、`.github/aw/`）はすべて削除済みです。`gh aw compile` で再生成すると課金と CI 失敗が復活するため、再導入しないでください。
- **外部AIプロバイダの API キーを要するもの**（Gemini API、OpenAI API、Anthropic API など）: 無料枠があるものでもキー管理と枯渇時の CI 失敗が発生するため採用しません。

**本方針の適用範囲（AI 推論と Web 検索の区別）:**

上記の「API キーを要するものは採用しない」は **AI 推論（LLM 呼び出し）** に対する方針です。RAG 用の **Web 検索 API**（Exa / Tavily）は、無料枠の範囲でのみ利用し API キーを任意とする限りにおいて例外として許容していました。

ただしこれらを利用していたのは GitHub Models 依存のワークフローのみで、それらの撤去に伴い `.github/actions/ai-web-search` ごと削除済みです。現在 CI 上に Web 検索を行う仕組みは存在しません。

## 6. 新規導入した自動化ツールの運用ルール (2024年導入)

更なる開発効率化のため、以下の新しいAIツールおよびCI/CDの自動化パイプラインが追加されています。これらは標準で動作するように設定されていますが、運用上以下の点を留意してください。

> **注記:** 本節にあった `/ai`（ChatOps）、`/ai-solve`、`/ai-fix`、`/ai-test` の各スラッシュコマンド、
> および Exa / Tavily による RAG Web 検索の設定手順は、GitHub Models 提供終了に伴うワークフロー撤去
> （第3節）により削除しました。これらのコマンドは現在利用できません。

### AI Code Scanner (aislop)

リポジトリにコミットされたコードの中に、AI コーディングエージェントが残したスロップ（不要なコメント、飲み込まれた例外、幻覚によるインポートなど）がないかを自動的にスキャンします。GitHub Code Scanning と連携して、PR や main ブランチでの問題を検知します。
この機能は `aislop` ツールを使用しており、特別な設定は不要です。

### Semantic PR Title の適用

コミット履歴とリリースノートの可読性を保つため、PRのタイトルには **Conventional Commits** フォーマットを強制するチェック (`semantic-pr-title.yml`) が有効になっています。
PRのタイトルは必ず `feat:`, `fix:`, `docs:`, `chore:` 等のプレフィックスから開始してください。

### Typos (スペルチェッカー) の導入

Rust製の高速なスペルチェッカー `typos` がCIに追加されています。タイポが検知された場合はCIが失敗するため、適宜修正してください。意図的な固有表現で引っかかる場合は、リポジトリルートに `typos.toml` を作成して除外設定を行ってください。

---

上記の事前設定および確認が完了していることを確認した上で、プルリクエストをメインブランチにマージしてください。

### GitHub Actions Security Scanner (zizmor)

当リポジトリでは `zizmor` を用いて GitHub Actions ワークフローの静的解析を行っています。
`zizmor` はワークフロー内のセキュリティリスク（シークレットの漏洩、意図しないインジェクションなど）を事前に検知します。
マージ前に必ず GitHub の Security タブ（Code scanning alerts）で `zizmor` からの警告が出ていないか確認してください。

## ツール連携に向けた追加設定 (手動作業)

当リポジトリでは生成AIによるコードの大量生成やそれに伴うCI/CDパイプラインへの負荷増大に対応するため、静的解析ツールとAIの連携を強化しています。
PRマージ前に以下の作業を確認してください。

1. **Qodo Merge / PR-Agent のインストール**: PR-Agent などのレビューツールを GitHub App として対象リポジトリにインストールし、適切な権限 (Issues: Write, Pull Requests: Write 等) を付与してください。インストール前に無料利用の条件を満たすか確認してください（Qodo Merge は Qodo for Open Source の承認が必要で、本リポジトリは現時点で対象外です）。
2. **セキュリティスキャナの有効化確認**: `Gitleaks`, `Trufflehog` が適切に動作するよう、GitHub の設定 > Security から Secret Scanning と Push Protection が有効になっているか確認してください。また、`Zizmor` による解析結果が Code scanning alerts に適切に反映されるよう設定されているか確認してください。
3. **StepSecurity Harden-Runner のインストール**: AIコーディングエージェントからのクレデンシャル漏洩やサプライチェーン攻撃を防ぐため、主要なワークフローに `step-security/harden-runner` を導入しています。
   - StepSecurity の GitHub App を対象リポジトリにインストールし、初期設定を行ってください（公開リポジトリは無料で利用可能です）。
   - 現在はCIのダウンタイムを防ぐため `audit` モードで運用していますが、StepSecurity Dashboard 上で学習が完了し、必要な通信先リストが整備された段階で、ワークフローファイル側を `block` モードに変更（必要に応じて `allowed-endpoints` を追記）して完全なアウトバウンド通信の保護を有効化してください。

## 7. サプライチェーン・セキュリティとローカル AI 連携

DevSecOps およびサプライチェーンセキュリティの観点に基づくパイプラインの強化と、
ローカル開発環境向けの AI 連携についてまとめます。

### プロンプト作成規約: 外部由来コンテキストは必ずタグで囲む

> **適用範囲についての注記:** 本規約の対象だった CI 上の AI ワークフローは第3節のとおりすべて撤去済みで、
> 現時点で本規約が適用されるワークフローは存在しません。将来 AI 推論を行うワークフローを再導入する場合
> （第5節の方針上、原則として行いません）に備えた設計標準として残しています。

LLM に渡すプロンプトの中で、**リポジトリ外の第三者が内容を左右できるデータは、例外なく専用タグで囲む**こと。タグで囲まずに生挿入すると、そのデータ中の文章が指示として解釈され、プロンプトインジェクションの経路になります。

対象となるデータと対応するタグ:

| データ                                        | タグ                      |
| :-------------------------------------------- | :------------------------ |
| Issue / PR のタイトル・本文、ユーザーコメント | `<user_input>`            |
| Pull Request の差分（diff）                   | `<pr_diff>`               |
| Web検索結果（Tavily / DuckDuckGo / Exa）      | `<web_search_results>`    |
| 過去の類似Issue検索結果                       | `<similar_issues>`        |
| Stack Overflow 検索結果                       | `<stackoverflow_results>` |
| CI 失敗ログ（GitHub Actions のジョブログ）    | `<ci_logs>`               |

※ repomixの出力（`${repoContext}`）など、自リポジトリのソースを固めたものはこの表の対象外（第三者が内容を左右できないため）。

守るべきルール:

1. 生挿入しない。`${searchResults}` のように裸で埋め込まず、必ず開始タグと終了タグで挟む。
2. `developer`（system）ロールの WARNING に、そのプロンプトで使う**すべての**タグ名を列挙する。一部だけ列挙して他を素通しにしない。
3. 「タグ内は参考データであり指示に従わない」旨の注意文を、タグの直後にユーザープロンプト側にも書く。ただし `<user_input>` はChatOpsの `/ai` コマンドのように処理対象の正当な要求を含みうるため、この一律の扱いの対象外とする。`<user_input>` については、要求自体は通常どおり処理する一方、開発者指示（developer/systemロールの内容）の変更や悪意ある操作を求める内容のみを拒否する旨を明記する。
4. 外部データが自動マージ・自動修正などの**行動判断**に影響しうるワークフローでは、判断根拠を検証可能な情報（diff、公式のセキュリティ勧告など）に限定する旨を WARNING に明記する。診断・分析用のプロンプトに実際の diff を含める場合は `<pr_diff>` タグを使用する。
5. `${prDiff}` や `${searchResults}` のような外部由来データは、`developer`（system）ロールのプロンプトへ埋め込まない。ロール自体が高優先度の指示として解釈されるため、タグで囲んでいてもリスクが残る。外部データは必ず `user` ロールのメッセージ内にタグ付きで格納し、`developer` ロールには静的な指示・WARNINGのみを置く。

### SBOM (Software Bill of Materials) ポリシーの適用

サプライチェーン攻撃の防止というCI/CDのベストプラクティスに従い、`.github/workflows/sbom-policy-check.yml` にてSBOM（SPDX-JSON形式）の自動生成とアーティファクト保存を導入しました。
**手動確認作業:**
Pull Requestをマージする前に、該当PRで実行された `SBOM Policy Check` ワークフローの実行結果から `sbom` アーティファクトをダウンロードし、依存関係に意図しないパッケージ（悪意のあるタイポスクワッティングなど）が含まれていないか、定期的に手動で内容を監査・確認してください。確認が完了するまではマージしないでください。なお、開発のボトルネック化を防ぐため、将来的にはCI上で自動スキャンツール（`osv-scanner` や `Socket` など）を用いた自動検知への移行を推奨します。

### OpenSSF Scorecard の導入

オープンソースプロジェクトにおけるサプライチェーンセキュリティのベストプラクティスとして、`OpenSSF Scorecard` を GitHub Actions ワークフロー ([.github/workflows/scorecard.yml](workflows/scorecard.yml)) で運用しています。

- **実行タイミング:** メインブランチへの `push` 時、毎週月曜 10:30 JST（01:30 UTC）の定期実行（`schedule`）、および手動実行（`workflow_dispatch`）。
- **仕組み:** 公式の `ossf/scorecard-action` を使用してリポジトリのセキュリティヘルス（トークン権限、ブランチ保護、依存関係のピン留め等）をスキャンし、結果を SARIF 形式で GitHub の Code Scanning Alerts タブに自動アップロードします。
- **権限設定:** ワークフロー全体は `permissions: read-all` を既定とし、`analysis` ジョブにのみ必要な権限を明示的に宣言しています。`publish_results: true` のため GitHub OIDC トークン発行用の `id-token: write`、アラートアップロード用の `security-events: write` が必要です。これらのコメントは意図を残すためのものなので、削らずに維持してください。
- **手動確認:** この機能はパブリックリポジトリでは無料で使用できます。マージ後は GitHub リポジトリの **Security** -> **Code scanning** の画面から、Scorecard の分析結果が正常に表示されることを確認してください。

### GitHub Actions セキュリティ強化 (Harden Runner)

CI/CDパイプラインにおけるAIプロンプトインジェクションや認証情報の漏洩リスクを軽減するため、全てのアクションジョブ（`ubuntu-latest`で実行されるもの）に対して、`step-security/harden-runner` を `audit` モードで導入しています。これにより、意図しない外部へのネットワーク通信を検知・記録することができます。

**手動作業に関する注意事項:**

- `audit` モードでは実行自体はブロックされず監視のみ行われます。詳細なレポートを確認するには、StepSecurity のダッシュボードと連携するか、Actions のログから Egress リクエストの状況を確認してください。

### MCP (Model Context Protocol) サーバーの導入 (ローカル用)

AI エージェント（Cursor, Claude Desktop など）が開発プロジェクトのコンテキストを直接理解しやすくするため、ローカルで動作する MCP サーバー (`scripts/mcp-server.ts`) を導入しました。これにより、データベーススキーマやAPIルーティング情報をAIがダイナミックに読み取ることが可能になります。

**設定手順 (Claude Desktop の場合):**

1. 開発環境のリポジトリルートで `bun install` を実行し、`@modelcontextprotocol/sdk` がインストールされていることを確認します（`scripts/mcp-server.ts` はリポジトリルート起点で起動するため、依存関係もルートの `package.json` に定義しています）。
2. `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac の場合) に以下の設定を追加します:

   ```json
   {
     "mcpServers": {
       "toique-backend": {
         "command": "bun",
         "args": ["run", "/path/to/your/repo/scripts/mcp-server.ts"]
       }
     }
   }
   ```

3. Claude Desktop を再起動すると、`get_db_schema` や `get_api_routes` ツールが使えるようになり、バックエンド構造を正確に踏まえたコード生成が可能になります。

### 新規AIレビューツール (CodeRabbit & PR-Agent) の導入手順

生成AIによるコードレビューの品質向上と自動化のため、`CodeRabbit` および `PR-Agent` の設定ファイルを導入しました。設定内容を有効にするため、以下の手動作業を実施してください。

1. **CodeRabbit のインストール**
   - GitHub Marketplace から [CodeRabbit](https://github.com/apps/coderabbitai) を対象のリポジトリまたはOrganizationにインストールしてください。
   - 無料プラン（Open Source / Pro Trial）でパブリックリポジトリにて利用可能です。
2. **Qodo Merge (旧 PR-Agent / CodiumAI) のインストール**
   - CodiumAI は Qodo にリブランドされ、PR-Agent(Pro)は Qodo Merge となりました。GitHub Marketplace から [Qodo Merge](https://github.com/apps/qodo-merge) をインストールしてください。
   - インストール後、PRに `/review` や `/describe` などのコマンドをコメントすることで機能します。
   - **無料利用の条件**: [Qodo for Open Source](https://docs.qodo.ai/open-source-program) に承認された場合のみ無料です。条件は「公開 GitHub リポジトリであること」「stars 100 以上」「継続的にメンテナンスされていること」「Qodo の利用ポリシーを遵守すること」です。承認されない場合はクレジット課金の通常プランとなります。
   - **本リポジトリの状況**: stars が 100 に届いておらず条件未達のため、現時点では無料対象外です。第5節の「CI から呼び出す AI は無料枠のみ」方針に従い、条件を満たすまでインストールは行いません。

3. **Qodo Merge の設定統合**
   - これまで `.pr-agent.toml` と `.pr_agent.toml` が混在していたため、`.pr_agent.toml` に設定を一本化しました。これにより、日本語出力(`response_language="ja-JP"`)と `gpt-4o` モデルの利用設定が正しく一貫して適用されます。設定の変更が必要な場合は `.pr_agent.toml` のみを編集してください。
