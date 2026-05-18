# toique Public 化リスク調査 統合レポート

**調査日**: 2026-05-17
**調査対象**:

- `toique` リポジトリ (HEAD: PR #289 マージ後)
- 隣接リポジトリ `genzouw.com/terraform`

**調査者**: Claude (一次調査) + Gemini (二次照合) を統合
**判定方針**: 両者一致した指摘は重大度確定、片方のみは検出元を明記、誤検出は注記して訂正

---

## エグゼクティブサマリ

| 重大度      | 件数 | 検出元                                                                   |
| ----------- | ---- | ------------------------------------------------------------------------ |
| 🔴 Critical | 2    | Claude / Gemini 一致 2                                                   |
| 🟠 High     | 5    | Claude 4 / 両者一致 1                                                    |
| 🟡 Medium   | 4    | Claude 中心                                                              |
| 🟢 Low      | 4    | Claude (うち 1 件は Critical から再分類、1 件は Gemini 誤検出を訂正済み) |

**🔄 評価見直し履歴**:

1. 初版 C-1（`.env` ローカル平文の Resend API キー残存）→ **Low (L-4)** に再分類。Public 化で漏出する経路が存在せず、公開化が引き金になる固有リスクではないため。
2. 初版 C-2（隣接 `genzouw.com/terraform/environments/oci/terraform.tfvars` の平文 MySQL root パスワード）→ **対象外として削除**。`genzouw.com` は別リポジトリ (private のまま) で、toique の Public 化と因果関係がないため。「同じワークステーションでの運用習慣の横展開リスク」として強引に取り込んでいたが、論理飛躍が大きく toique 固有の Public 化リスクではない。

**git history の自動シークレットスキャン (Claude/Gemini 両者実施)**: API キー・トークン形式 (`AKIA*`, `AIza*`, `sk_live_*`, `ghp_*`, `re_*`, `BEGIN PRIVATE KEY` 等) のヒットは **0 件**。`tfstate` / `*.auto.tfvars` の追加履歴も検出されず。

**最大の残存リスク**: 「履歴」ではなく「**CI/CD パイプラインが掴む本番権限のスコープ**」と「**ローカル/隣接リポジトリの未追跡シークレット**」。

---

## 🔴 Critical（致命: Public 化前に必ず処置）

> 番号について: 旧 C-1（`.env` の Resend API キー）は **Low (L-4)** に再分類、旧 C-2（隣接 `genzouw.com` の tfvars 平文）は toique の Public 化と無関係のため **削除**。識別性のため C-3 / C-4 の番号は旧版のまま維持しています。

### C-3. 本番デプロイ workflow が mutable tag pin の 3rd-party Action に OIDC + Cloudflare API Token を渡す

- **検出元**: Claude / Gemini 一致
- **ファイル**: `toique/.github/workflows/deploy.yml`
- **該当 Action（`permissions: id-token: write` の job 内）**:
  - `google-github-actions/auth@v3`, `setup-gcloud@v3`, `deploy-cloudrun@v3`
  - `docker/build-push-action@v7`, `dorny/paths-filter@v4`
  - `cloudflare/wrangler-action@v3` (`CLOUDFLARE_API_TOKEN` を直接受け取る)
  - 唯一 SHA pin 済み: `oven-sh/setup-bun@0c5077e5...` のみ
- **リスク**: いずれかが供給網攻撃（タグ書き換え・compromise）に遭うと、main への push 経由で GCP OIDC トークンまたは Cloudflare API Token が流出 → 本番 Cloud Run / Pages を任意書き換え可能
- **対応**:
  1. 全 3rd-party Action を full commit SHA に pin（`# vX.Y.Z` コメント併記）
  2. `CLOUDFLARE_API_TOKEN` を Account-wide → 単一 Pages プロジェクト限定に縮小
  3. 将来的に `cloudflare/wrangler-action` を Cloudflare OIDC に切り替え、長期 API Token 廃止を検討

### C-4. GCP WIF の `attribute_condition` が緩い可能性（要実機確認 + IaC 化）

- **検出元**: Claude / Gemini 一致
- **状況**:
  - WIF は手動 gcloud で構築され IaC 化されていない (`docs/fork-setup.md:100-110` のレシピが唯一の記録)
  - `genzouw.com/terraform` には WIF / `<GCP_PROJECT_ID>` の管理なし（Claude 確認済み）
- **リスク**: `attribute_condition = "assertion.repository_owner == 'genzouw'"` のままだと、同オーナーの **任意の repo** から OIDC を発行できる。SA 側 `iam.workloadIdentityUser` の `principalSet` が repo 単位で絞られていれば即奪取は防げるが、設定ミス耐性が低い
- **対応**:

  ```bash
  # 実機確認
  gcloud iam workload-identity-pools providers describe github-provider \
    --location=global --workload-identity-pool=github-pool \
    --project=<GCP_PROJECT_ID>

  # attribute-condition を厳格化
  gcloud iam workload-identity-pools providers update-oidc github-provider \
    --location=global --workload-identity-pool=github-pool \
    --attribute-condition="assertion.repository == 'genzouw/toique' && assertion.ref == 'refs/heads/main'"

  # SA 側 binding も repo + branch まで絞る
  gcloud iam service-accounts add-iam-policy-binding \
    github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com \
    --member="principalSet://iam.googleapis.com/projects/<GCP_PROJECT_NUMBER>/locations/global/workloadIdentityPools/github-pool/attribute.repository/genzouw/toique" \
    --role="roles/iam.workloadIdentityUser"
  ```

  WIF 設定を `infra/main.ts` に取り込んで IaC 化（公開後の運用ミス耐性向上）

---

## 🟠 High（高: Public 化前に対応推奨）

### H-1. 本番固有名詞が docs に集約掲載

- **検出元**: Claude / Gemini 一致
- **ファイル**: `toique/docs/manual-deploy.md`, `toique/docs/backup.md`
- **値**:
  - `<GCP_PROJECT_ID>` (GCP プロジェクト名)
  - `github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com` (本番 SA email)
  - `<GCP_PROJECT_NUMBER>` (GCP プロジェクト番号)
  - `<STRIPE_PRO_PRICE_ID>` (Stripe Pro Price ID)
  - `<MAIL_FROM_ADDRESS>` (送信元)
  - `<OPERATOR_EMAIL>` (運営者 email)
  - `BACKUP_POSTGRES_USER=toique` (Neon DB ユーザー名)
- **リスク**: 攻撃者の偵察コスト 0 化。フィッシング標的選定・GCS バケット名 (`<GCP_PROJECT_ID>-db-backups`) 推測・DDoS ターゲット選定に直結
- **対応**: docs から本番値を全てプレースホルダ化 (`<YOUR_PROJECT_ID>`, `<YOUR_SA_EMAIL>`, `<YOUR_STRIPE_PRICE_ID>` 等)。Variables/Secrets で既に管理されているため docs に実値を書く必要はない

### H-2. workflow_run + 単独 reviewer 体制で Dependabot/誤 main マージが即時本番デプロイ

- **検出元**: Claude
- **ファイル**:
  - `toique/.github/workflows/deploy.yml` (`workflow_run` + `id-token: write`)
  - `toique/.github/dependabot.yml` (`dependency-type: 'all'`)
  - `toique/.github/CODEOWNERS` (`@genzouw` 単独)
- **リスク**: Dependabot 自動 PR を main にマージすると **即時** デプロイ。Public 化後は typosquat / dependency confusion 攻撃が刺さりやすい。単独レビュアーはカウンターチェックが弱い
- **対応**:
  1. GitHub Environments (`production`) を作成し **Required reviewers + wait timer** を設定
  2. Dependabot `allow: dependency-type: direct` のみに絞り、indirect 依存の lockfile-only PR を排除
  3. Branch protection を有効化 (Public 化と同時に GitHub Free でも利用可能になる)
- **Gemini の主張に対する訂正**: 「`workflow_run` は fork PR から発火する」は GitHub の仕様上誤り。`workflow_run` は **default branch の YAML** を使う。fork PR の CI 成功は本番 workflow_run のトリガにならない。ただし「main マージ = 即デプロイ」リスクは本物

### H-3. `dogfooding.ts` でハードコードされた Gmail

- **検出元**: Claude
- **ファイル**: `toique/backend/src/lib/dogfooding.ts:10`
- **状態**: `<DOGFOODING_EMAIL>` がコードに直接書かれ、該当ユーザーは Stripe 課金なしで `unlimited: true`
- **リスク**: Public 化後、攻撃者は「この Gmail を乗っ取れば Pro 機能無料化」と確実に知る → フィッシング集中
- **対応**:
  1. `DOGFOODING_EMAILS=...` 環境変数化、コードから削除
  2. 該当 Gmail アカウントの 2FA / Advanced Protection 有効化を再確認

### H-4. `infra/main.ts` の `backup-sa-run-invoker` が project-wide `roles/run.developer`

- **検出元**: Claude
- **ファイル**: `toique/infra/main.ts:65-69`
- **状態**: Cloud Scheduler 起動用 SA に **プロジェクト全体** `roles/run.developer` を付与。Cloud Run Job/Service の **更新** が可能なレベル
- **リスク**: backup-sa の credentials が漏れた場合（C-3 経由を想定）、任意の Cloud Run リソースを書き換え可能
- **対応**: `google_cloud_run_v2_job_iam_member` で **job リソース単位** の `roles/run.invoker` に縮小

### H-5. コミット履歴の本番固有名詞残存（履歴書き換えは推奨しない）

- **検出元**: Gemini
- **状態**: `git log -p` で `<GCP_PROJECT_ID>`, `<GCP_PROJECT_NUMBER>`, `github-deployer@...` 等が PR #289 マージ前の commit に残存
- **リスク**: API キー級ではないが、攻撃者の地図として機能（H-1 と本質的に同じリスクで二重カウント）
- **対応**: **履歴書き換え (`git filter-repo` / `.git` 削除して新規 init) は不採用**
  - 理由: 本リポジトリは OSS テンプレ・ジャーニー記録として価値あり。bun 移行・CSP 対応・公開化準備等の経緯が残ることに教育的価値がある
  - 代替: H-1 で実値を docs から削除 + C-4 で権限スコープを絞ることで実害ベースのリスクは封じる

---

## 🟡 Medium

### M-1. 1st-party / インフラ系 Action もメジャータグ pin

- **検出元**: Claude / Gemini 一致
- **状態**: `actions/checkout@v6`, `actions/upload-artifact@v4`, `docker/setup-buildx-action@v4`, `cloudflare/wrangler-action@v3` 等
- **重要**: `genzouw.com/terraform/environments/github/main.tf` で kakezan-manabo / monopo / hyakuninissyu が `actions_sha_pinning_required = true` を設定済み。**toique を public 化すると同じ設定が自動 ON** され、未 pin の Action があると CI が落ちる
- **対応**: Public 化と **同時に** 自動有効化される必須要件。先に全 Action を SHA pin に変換が必要

### M-2. バックアップバケットに versioning / retention lock なし

- **検出元**: Claude
- **ファイル**: `toique/infra/main.ts:31-48`
- **状態**: 30 日 lifecycle delete のみ。Object Versioning、Bucket Lock、Retention Policy なし
- **リスク**: backup-sa が奪われた場合 (C-3 経由想定) に過去 30 日分のバックアップを上書きできる
- **対応**:
  ```typescript
  versioning: { enabled: true },
  retentionPolicy: { retentionPeriod: 30 * 86400, isLocked: true },
  ```

### M-3. CDKTF/Terraform state バックエンド管理が不明確

- **検出元**: Claude
- **状態**: `toique/infra/` には GCS backend 設定なし。ローカル state を `.gitignore` 除外で運用
- **隣接観察**: `genzouw.com/terraform/environments/{github,aws}/` には `terraform.tfstate*` が tracked。toique 側で同じミスを再発させない仕組みが必要
- **対応**: `infra/main.ts` の synth で GCS backend を明示し、ローカル `*.tfstate*` を `.gitignore` に追加

### M-4. ベースイメージの SHA pin 不足

- **検出元**: Claude / Gemini 一致
- **状態**: `oven/bun:1.3.14-alpine` のようにタグまでは pin 済みだが SHA pin はなし
- **対応**: 余力時に `oven/bun@sha256:...` 形式へ。最低 deploy stage のイメージは SHA pin 推奨

---

## 🟢 Low

### L-1. ハードコード custom domain

- **検出元**: Claude
- **ファイル**: `frontend/public/ogp.svg` 内 `example.com` 文字列
- **状態**: 既に `docs/fork-setup.md` 「手動編集が必要なアセット」セクションで注記済み
- **対応**: 現状維持で OK

### L-2. GitHub Environments 未設定

- **検出元**: Claude
- **状態**: C-3 / H-2 と統合の供給網防御
- **対応**: H-2 で対応

### L-3. `compose.yml` に `${ADMIN_USERNAME:-admin}` のフォールバック残存

- **検出元**: Claude
- **状態**: 開発用 compose のみで production には影響なし
- **Gemini の主張に対する訂正**: Gemini は「`backend/src/middleware/auth.ts:82-83` に `const expectedPassword = process.env.ADMIN_PASSWORD || 'admin';` が存在」と主張したが、実装確認の結果 **そのような fallback は存在しない**。実コードは以下:

  ```typescript
  // backend/src/middleware/auth.ts:43-46
  if (
    NODE_ENV === 'production' &&
    (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD)
  ) {
    throw new Error(
      'ADMIN_USERNAME and ADMIN_PASSWORD must be set in production',
    );
  }
  ```

  production では明示的に未設定エラーで落ちる安全な実装。Gemini の指摘は **誤検出**

- **対応**: `compose.yml` の `${ADMIN_USERNAME:-admin}` を `${ADMIN_USERNAME:?required}` に変えて未設定エラーで落とすか、現状維持（dev only なので影響軽微）

### L-4. ローカル `.env` に本物の Resend API キー残存（旧 C-1、評価見直し済み）

- **検出元**: Claude
- **ファイル**: `toique/.env` (git 管理外、`.gitignore:16` 適用済み)
- **状態**: 実値がローカル平文（実値は本ドキュメント末尾でマスク済み）
- **確認結果**:
  - `git ls-files .env` → 0 件
  - `git log --all -p | grep 're_'` → ヒット 0 件
  - `gitleaks detect --no-git --redact` → `.env` のみ検出（untracked なので公開対象外）
- **再評価の根拠**:
  - Public 化で漏出する経路が存在しない (`.env` は tracked でないため公開されない)
  - 公開化が引き金になる固有リスクではなく、開発機の compromise / スクリーンショット等の **常時存在する一般リスク**
  - 同じ論理を本番 Secret 全てに適用すれば Stripe / BetterAuth / DB も rotate すべきになるが、それは合理的ではない
- **対応**: **必須ではない**。実施する場合の手順:
  1. Resend ダッシュボードで該当キーを revoke
  2. 新規 API キー発行、GCP Secret Manager の `RESEND_API_KEY` を更新
  3. ローカル `.env` を新キーに置換
- **判断のポイント**: 開発機の compromise や肩越し閲覧を強く心配する組織方針なら実施。そうでなければスキップしても Public 化のセキュリティ実害はない

---

## 🔥 Public 化前 必須アクションリスト（優先順）

事実確認の結果、最低限これだけは Public 化前に処置必須:

| #   | 項目                                                                                                                      | 重大度   | 工数目安 | 補足                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------------------------------------------------------------------------------------- |
| 1   | **deploy.yml の 3rd-party Action を全て SHA pin**                                                                         | Critical | 30 分    | `Renovate` か `Dependabot` で自動更新化                                                |
| 2   | **GCP WIF `attribute-condition` 厳格化** (`assertion.repository == 'genzouw/toique' && assertion.ref == refs/heads/main`) | Critical | 15 分    | `gcloud` で実機確認 + 設定変更                                                         |
| 3   | **docs/manual-deploy.md / backup.md の本番固有名詞をプレースホルダ化**                                                    | High     | 30 分    | <GCP_PROJECT_ID>, SA email, Price ID 等                                                |
| 4   | **GitHub Environments `production` 作成 + Required reviewers + wait timer**                                               | High     | 10 分    | Public 化と同時に必須                                                                  |
| 5   | **`dogfooding.ts` の Gmail を env 化 + 該当アカウント 2FA 強化**                                                          | High     | 30 分    | 攻撃面の縮小                                                                           |
| 6   | **`backup-sa` の権限をリソーススコープに縮小**                                                                            | High     | 30 分    | `infra/main.ts` 修正 + apply                                                           |
| 7   | **1st-party Action も SHA pin**                                                                                           | Medium   | 30 分    | genzouw.com Terraform で `actions_sha_pinning_required` 自動 ON されるため事前対応必須 |
| 8   | **WIF 設定を `infra/main.ts` に IaC 化**                                                                                  | High     | 60 分    | 中期。手動 gcloud 設定を Terraform に移行                                              |

**toique Public 化スコープ外**:

- 旧 C-1（L-4 に再分類）: Resend API キーの revoke + rotate は Public 化のセキュリティ実害には関係しないため必須リストから除外。開発機 compromise を強く警戒する組織方針なら別途実施。
- 旧 C-2（削除）: `genzouw.com/terraform/environments/oci/terraform.tfvars` の MySQL root パスワード平文は別リポジトリ (private) の独立した運用課題で、toique の Public 化とは因果関係なし。`genzouw.com` 側で対応する場合は別途。

**履歴書き換え (Gemini の `.git` 削除 + 新規 init 案) は不採用**: API キーは履歴に無く、固有名詞は実害ベースの権限スコープで封じる方が筋が良い。

---

## 副次的発見（補足）

### `genzouw.com/terraform` での public 化テンプレートが既に整備済み

`genzouw.com/terraform/environments/github/main.tf` には toique リポジトリの定義が既にあり (line 938-952):

```hcl
"toique" = {
  description = "Toique - LINE inquiry receipt SaaS (LINE問い合わせ受付SaaS)"
  visibility  = "private"
  ...
}
```

これを `visibility = "public"` に変更すると、`local.is_public_default[each.key]` 経由で以下が **自動 ON**:

- `secret_scanning` + `push_protection`
- `private_vulnerability_reporting`
- `actions_allowed_actions = "selected"` + `actions_sha_pinning_required = true`
- `enable_branch_protection`
- `required_linear_history`
- `require_conversation_resolution`
- `web_commit_signoff_required`

ただし以下は明示的に設定しないとデフォルトで緩い:

- `required_approving_review_count = 0` (個人開発前提)
- `required_status_checks_contexts = []`
- `manage_codeql_default_setup = false`
- `pull_request_bypassers = []`

**推奨**: toique を public 化する際は `kakezan-manabo` / `monopo` の設定をテンプレに、以下を明示する:

```hcl
"toique" = {
  visibility                      = "public"
  # ... 既存設定 ...

  secret_scanning                 = "enabled"
  secret_scanning_push_protection = "enabled"
  manage_private_vulnerability_reporting  = true
  private_vulnerability_reporting_enabled = true

  enforce_admins                  = false
  required_linear_history         = true
  allow_merge_commit              = false
  require_conversation_resolution = true
  required_approving_review_count = 1
  pull_request_bypassers          = ["/genzouw"]

  required_status_checks_strict   = true
  required_status_checks_contexts = [
    "Frontend (lint / typecheck / format / test / build)",
    "Backend (lint / typecheck / format / build / test)",
    "Frontend E2E (CSP smoke)",
  ]

  manage_actions_permissions   = true
  actions_allowed_actions      = "selected"
  actions_github_owned_allowed = true
  actions_verified_allowed     = true

  manage_actions_sha_pinning   = true
  actions_sha_pinning_required = true

  manage_codeql_default_setup = true
  web_commit_signoff_required = true
}
```

### Gemini が「fork PR から workflow_run が発火する」と誤った理解

`workflow_run` は **base リポジトリの default branch の YAML** で動作するため、fork PR の CI 成功は本番デプロイをトリガしない (GitHub の公式仕様)。ただし、main へのマージが即デプロイされる構造自体は本物のリスクで、H-2 で対応。

### Gemini が `auth.ts:82-83` の fallback を誤検出

実コード (`backend/src/middleware/auth.ts:43-46`) は production env var 必須チェックを実装済みで、`'admin'` というハードコードフォールバックは存在しない。`compose.yml` の dev only fallback は L-3 で言及。

### 旧 C-1 → L-4 への評価見直し経緯

初版で `.env` の Resend API キー残存を **Critical** と判定したが、以下の事実関係を再整理した結果 **Low (L-4)** に格下げした:

1. **Git で 0 ヒット**: `git ls-files .env` も `git log --all -p | grep 're_'` も 0 件
2. **`.gitignore:16` で除外済み**: Public 化しても `.env` 自体は公開されない
3. **gitleaks 検証**: `gitleaks detect --no-git --redact` で `.env` のみ検出（untracked / 公開対象外）
4. **論理整合性**: 「漏出した可能性をゼロ証明できないから rotate」というロジックを適用すると、Stripe / BetterAuth / DB など本番 Secret 全てを rotate する話になり合理的でない
5. **Public 化との因果関係**: Public 化が漏出を引き起こす経路は存在しない。開発機の compromise や肩越し閲覧は **常時存在する一般リスク** であり、リポジトリ公開とは独立

### 旧 C-2 → 削除（評価対象外）の経緯

初版で「隣接 `genzouw.com/terraform/environments/oci/terraform.tfvars` の平文 MySQL root パスワード」を **Critical** と判定したが、以下の理由で **削除（toique の Public 化リスク対象外）** に変更した:

1. **別リポジトリ**: `genzouw.com` は toique とは独立した別 GitHub リポジトリで、当該リポジトリは **private のまま** 維持される
2. **`.gitignore` で除外**: `terraform.tfvars` は `genzouw.com` 側で git tracked ではない
3. **toique からの参照経路なし**: toique の git tree・history・workflow・コード・docs のいずれにも当該 MySQL パスワード値や OCI MySQL の参照は存在しない
4. **論理飛躍**: Gemini の指摘を「同じワークステーションでの運用習慣の横展開リスク」として toique 文脈に取り込んだが、これは「同じ開発者が他リポでも秘密を平文管理しているかもしれない」という間接的な懸念であり、同論理を広げれば無限に他リポを巡る話になる。toique の Public 化が原因で漏れる経路は存在しない

`genzouw.com` 側の運用上の独立した課題としては存在するため、`genzouw.com` のメンテナンス時に対応するのが筋。

### 共通の教訓

セキュリティ評価では「秘密値の存在を見たら revoke 推奨」という反射的判定ではなく、「**Public 化が新たに引き起こす固有リスクか**」「**変更対象のリポジトリと直接の因果関係があるか**」という 2 つの視点で重大度を再評価する必要がある。本調査では Claude / Gemini の両者ともに反射判定の癖があり、初版に 2 件の過剰評価が混入していた。Public 化のチェックリストに無関係項目を混入させると、本来優先すべき項目（WIF condition、Action SHA pin など）の対応リソースを浪費する。

---

## 調査メソドロジー

### Claude の調査範囲

- 全リポジトリツリーの `grep -r` (API キーパターン、メールアドレス、ハードコード値)
- `git log --all -p | grep -iE '(api[_-]?key|secret|token|password|bearer|AKIA|AIza|sk_live_|sk_test_|ghp_|gho_|ghu_|ghs_|ghr_|xoxb-|-----BEGIN [A-Z ]*PRIVATE KEY-----)'` → ヒット 0 件
- `git log --all --diff-filter=A --name-only` で `.tfstate`/`.tfvars`/`credentials.json` 追加履歴 → ヒット 0 件
- `infra/main.ts` の IAM ポリシー精査
- `.github/workflows/*.yml` のトリガ・permissions・Action pin 状況の精査
- 隣接 `genzouw.com/terraform/` の WIF 関連検索 → 該当なし (WIF は手動 gcloud 管理と確認)
- 既存 public repo (`kakezan-manabo` 等) の terraform 定義との比較

### Gemini の調査範囲

- 同じスコープを `--include-directories` で `genzouw.com/terraform` まで拡張して再実行
- Gemini 独自発見: `terraform.tfvars` の平文パスワード（Claude 見落とし）⭐️
- Gemini 誤検出: `auth.ts` の fallback 解釈、workflow_run の挙動

### 両者の補完関係

- Claude: 実装詳細・隣接リポ運用・OSS テンプレ整備状況の評価に強い
- Gemini: 履歴ベースの広範囲スキャン・隣接リポの平文シークレット検出に強い
- ただし、両者ともに「秘密値の存在を見たら高重大度」という反射判定の癖があり、初版で 2 件の過剰評価（旧 C-1 / 旧 C-2）が発生した。Public 化との因果関係を吟味する 2 段目のレビュー（本ドキュメント末尾の評価見直しセクション）が補正に有効だった。

---

_最終更新: 2026-05-17_
