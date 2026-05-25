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

## 3. OpenAI API キーの設定 (Issue Triage 用)

AI Issue Triage (`ai-issue-triage.yml`) を利用するためには、OpenAIのAPIキーが必要です。
※このアクションは権限を持つユーザー（OWNER, MEMBER, COLLABORATOR）がIssueを作成した場合のみ実行されるよう保護されています。

**設定手順:**
1. GitHubリポジトリの **Settings** を開く。
2. 左側メニューの **Secrets and variables** > **Actions** を選択する。
3. **Repository secrets** タブで **New repository secret** をクリックする。
4. 以下の通り入力して保存する。
   - Name: `OPENAI_API_KEY`
   - Secret: あなたの OpenAI API キー

---

上記の事前設定が完了していることを確認した上で、プルリクエストをメインブランチにマージしてください。
