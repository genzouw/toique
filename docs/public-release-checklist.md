# toique Public 化 実行チェックリスト

**作成日**: 2026-05-19
**前提ドキュメント**: [`docs/public-release-risk-assessment.md`](./public-release-risk-assessment.md)（2026-05-17、Claude + Gemini 統合版）
**作成方法**: Claude（一次案） + Gemini（二次案）を統合
**位置づけ**: 前回リスクアセスメント以降の対応進捗を踏まえ、Public 化の直前・直後・継続フェーズで実行すべき作業を時系列に整理したチェックリスト

---

## 1. 既存リスクアセスメントとの差分

前回（2026-05-17）の指摘のうち、以下は対応済み:

| 旧リスク                                          | 対応 PR    | 状態 |
| ------------------------------------------------- | ---------- | ---- |
| C-3 3rd-party Action の SHA pin                   | #297, #309 | ✅   |
| C-4 GCP WIF `attribute_condition` 厳格化 + IaC 化 | #300       | ✅   |
| H-1 docs の本番固有名詞プレースホルダ化           | #301, #309 | ✅   |
| H-3 dogfooding email を env 経由に                | #302       | ✅   |
| H-4 backup-sa の権限を Job リソース単位に縮小     | #303       | ✅   |
| 周辺: stack trace leak / CSRF                     | #296, #305 | ✅   |

未対応・新規発見項目を本ドキュメントに整理する。

---

## 2. Claude 一次案（要点）

前回未対応 + 新規観点:

1. **GitHub Repository 設定**: Secret scanning / Push protection / Private vulnerability reporting / CodeQL default setup / Dependabot security updates / Branch protection / Environments `production` + reviewers / Actions の workflow permissions
2. **Cloudflare**: `CLOUDFLARE_API_TOKEN` を Pages:Edit + 単一プロジェクトに縮小、WAF / Bot Fight Mode / Rate Limiting / subdomain takeover
3. **GCP**: WIF の **本番 apply** 実機確認、課金アラート、Cloud Armor、GCS versioning + retention lock、Audit Logs
4. **Neon**: IP allowlist、不要 branch/role 削除、最小権限
5. **LINE / Stripe / Resend**: LINE channel secret/token の DB 暗号化（README に未対応と明記されている点）、Stripe Restricted Key、Resend domain-scoped key、SPF/DKIM/DMARC
6. **公開ファイル**: LICENSE、SECURITY.md、CONTRIBUTING.md、Issue/PR templates、`docs/superpowers/` レビュー
7. **CI / アプリ**: hono / Cloud Run レート制限、CSRF/CSP 最終確認、CodeQL or trivy 組み込み
8. **最終 git scan**: gitleaks + git log -p で差分確認
9. **fork / pull_request_target 攻撃面**: 不使用確認、fork PR ビルド時の postinstall 制御
10. **継続監視**: Dependabot / CodeRabbit の権限、通知先、WIF/IAM 棚卸し

## 3. Gemini 一次案（要点）

1. SECURITY.md 作成
2. 全 3rd-party Action SHA pin 最終確認
3. `infra/main.ts` の最新版を **apply** 済みか確認
4. GitHub Environments `production` + Required reviewers
5. Secret scanning / Push protection 有効化
6. Branch protection（main）
7. Dependabot / Renovate での迅速更新体制

判定: 「既に多くの Critical 対策は IaC 化済。SECURITY.md と GitHub 設定変更で安全に公開可能」。

差分:

- Cloudflare API Token スコープ、GCP 課金アラート、LINE 暗号化未対応、LICENSE、subdomain takeover、SPF/DKIM/DMARC は触れていない。
- GitHub 設定中心のため範囲は狭いが要点絞り込みは明快。

---

## 4. 統合最終チェックリスト

### フェーズ 0: 公開操作の **直前**（必須）

| #   | 項目                                                                                                                                                                                                                                                                                                                                                              | 重大度   | 補足                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| 0-1 | `infra/main.ts` を本番 GCP プロジェクトに **実 apply** 済みか確認。WIF `attribute_condition` が `assertion.repository == 'genzouw/toique' && assertion.ref == 'refs/heads/main'` で動作しているか `gcloud iam workload-identity-pools providers describe github-provider --location=global --workload-identity-pool=github-pool --project=$GCP_PROJECT_ID` で確認 | Critical | IaC 化 ≠ apply。コードが新しくても本番が古ければ意味なし    |
| 0-2 | `CLOUDFLARE_API_TOKEN` を Pages:Edit + 単一プロジェクト限定に再発行・置換（前回 C-3 残課題）                                                                                                                                                                                                                                                                      | High     | Account-wide のままだと供給網攻撃時の被害最大化             |
| 0-3 | LINE channel secret / token の DB 暗号化。少なくとも README から「Phase 1 の限界」セクションの該当行を削除、可能なら実装                                                                                                                                                                                                                                          | High     | 公開時に攻撃ヒントになる。DB ダンプ流出時の被害最大化リスク |
| 0-4 | `gitleaks detect --no-git --redact` と `git log -p` での最終秘密値スキャン（特に #289〜#309 の差分）                                                                                                                                                                                                                                                              | High     | マージ以降に新規混入していないか                            |
| 0-5 | `LICENSE` を追加（MIT / Apache-2.0 等）                                                                                                                                                                                                                                                                                                                           | High     | OSS の利用条件を明示しないと法的に曖昧                      |
| 0-6 | `SECURITY.md` を追加（報告先メール、対象範囲、SLA、PGP 任意）                                                                                                                                                                                                                                                                                                     | High     | GitHub の Private Vulnerability Reporting と組み合わせる    |
| 0-7 | `docs/superpowers/plans/*` と `docs/ROADMAP.md` を再確認。個人開発の弱点表明や未対応セキュリティ事項の列挙が無いか                                                                                                                                                                                                                                                | Medium   | 偵察コスト削減を許さない                                    |
| 0-8 | GCP / Cloudflare / Resend / Neon に **課金アラート**（月額予算上限通知）。Cloud Run の `--max-instances=3` は設定済 ✅ だが、他サービスにも上限通知                                                                                                                                                                                                               | Medium   | 公開後の濫用で破産しないため                                |
| 0-9 | Email 認証（SPF / DKIM / DMARC）が `YOUR_DOMAIN` で正しく設定されているか確認                                                                                                                                                                                                                                                                                     | Medium   | なりすまし送信防止                                          |

### フェーズ 1: GitHub 公開化の **直後**（公開と同日中）

| #   | 項目                                                                                                                                                                                                                                                        | 重大度   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1-1 | Settings → Code security: **Secret scanning / Push protection / Private vulnerability reporting / Dependabot alerts / Dependabot security updates / CodeQL default setup を全て Enabled**                                                                   | Critical |
| 1-2 | Settings → Branches → Branch protection (main): Require PR / Require status checks (`Frontend`, `Backend`, `Frontend E2E`) / Required linear history / Require conversation resolution / Web commit signoff / Restrict force pushes / Required reviewers: 1 | Critical |
| 1-3 | Settings → Environments → `production` を作成。Required reviewers = @genzouw、wait timer 5〜10 分、prod 系 Secret (`CLOUDFLARE_*`, `ADMIN_*`, `OPERATOR_EMAILS`, `DOGFOODING_EMAILS`) を environment-scoped に移動                                          | Critical |
| 1-4 | Settings → Actions → General: Workflow permissions = `Read repository contents`、`Allow GitHub Actions to create and approve pull requests` = OFF、Fork PR workflows = `Require approval for all outside collaborators`                                     | High     |
| 1-5 | Settings → Actions → General → Allowed actions: `Allow select actions` + `Require actions to be pinned to a full-length commit SHA`（前回 M-1 の `actions_sha_pinning_required` と等価）                                                                    | High     |
| 1-6 | 隣接リポ `genzouw.com/terraform` の `"toique"` 定義を `visibility = "public"` に変更し、上記設定が IaC で固定化されるようにする（前回ドキュメント末尾の推奨設定参照）                                                                                       | High     |

### フェーズ 2: 公開後 **24〜72 時間以内**

| #   | 項目                                                                                                                                        | 重大度 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2-1 | CodeRabbit / その他 third-party app の権限を再確認、不要なら revoke                                                                         | Medium |
| 2-2 | Cloudflare Pages の Preview deployment が PR 経由で勝手にビルドされる設定になっていないか、なっている場合は build 時の env 漏洩がないか確認 | Medium |
| 2-3 | hono / Cloud Run でログイン・サインアップ・Webhook エンドポイントへのレート制限（特に `/login`, `/webhooks/line/*`）                        | Medium |
| 2-4 | GCS バケット versioning + Bucket Lock（前回 M-2 残課題）                                                                                    | Medium |
| 2-5 | 不要な Cloudflare DNS レコード / custom domain を削除（subdomain takeover 防止）                                                            | Low    |

### フェーズ 3: **継続監視**（公開後 1〜3 ヶ月のうちに整備）

| #   | 項目                                                                                    |
| --- | --------------------------------------------------------------------------------------- |
| 3-1 | 月次の WIF / IAM 棚卸しを Routine 化（`/schedule` で cron 化候補）                      |
| 3-2 | Dependabot の `dependency-type: all` を `direct` に絞る検討（前回 H-2 一部対応）        |
| 3-3 | Issue / PR templates、CONTRIBUTING.md、CoC 整備（公開後のスパム・低品質 PR 対応）       |
| 3-4 | Audit log（GitHub / GCP / Cloudflare / Neon）を定期確認するスクリプト or ダッシュボード |

---

## 5. 両者の優劣

- **Claude**: 既存リソース横断、LINE 暗号化未対応、Cloudflare API Token スコープ、LICENSE / subdomain takeover / 課金アラート など **横断系の網羅性** が強い。
- **Gemini**: 既存対応状況の認識と要点絞り込みが速い。GitHub 設定 + SECURITY.md にフォーカスして明快。**ノイズが少ない** 反面、クラウド・課金・SPF/DKIM など範囲が狭い。
- **統合の判断**: フェーズ別チェックリストに圧縮することで、両者の強みを保ちつつ、前回ドキュメントとの差分が一目で分かるようにした。

---

## 6. 想定される攻撃シナリオと封じ込め対応

| シナリオ                                                                 | 主な対策項目                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------- |
| 供給網攻撃（compromised Action）→ OIDC / Cloudflare Token 奪取           | 全 SHA pin + 1-5                                        |
| Dependabot 自動 PR で typosquat / dep-confusion を仕込まれて main マージ | 1-2, 1-3, 3-2                                           |
| fork PR からの secret 奪取                                               | 1-4, pull_request_target 不使用（確認済）               |
| 公開後の DDoS / マイニング濫用で高額請求                                 | 0-8, Cloud Run max-instances, Cloudflare Bot Fight Mode |
| DB ダンプ流出時の LINE 全テナント乗っ取り                                | 0-3（LINE 暗号化）                                      |
| subdomain takeover（古い DNS レコード）                                  | 2-5                                                     |
| 公開リポジトリから個人 Gmail を特定 → フィッシング                       | 前回 H-3（対応済）, 0-9                                 |

---

## 7. 公開操作の取り消し不能性

GitHub リポジトリは一度 Public にすると、その瞬間に world-readable になる。fork や clone は **GitHub 側の権限制御を経由せず**、third-party 検索エンジン・ホスティングサービスにキャッシュされる可能性がある。後から Private に戻しても、すでに取得された clone は撤回できない。

したがってフェーズ 0 のチェックリストは **必ず Public 化操作の前に** 完了させること。

---

## 8. フェーズ 0 実施結果 (2026-05-19)

本リポジトリでの実施状況。✅ = リポジトリ側で完了 / ⚠️ = ユーザーによる手動対応が必要 / 📋 = 状況確認のみ。

| #   | 項目                                            | 状況 | メモ                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0-1 | WIF apply 実機確認                              | ⚠️   | `gcloud iam workload-identity-pools providers describe` で確認したところ、Provider `attributeCondition` は `assertion.repository_owner == 'genzouw'` のまま (緩い)。SA Binding は `attribute.repository/genzouw/toique` で絞り済。`infra/` で `bunx cdktf deploy` を本番に対して実行することで両層を `repository == 'genzouw/toique' && ref == 'refs/heads/main'` に厳格化できる。**Public 化前に必ず apply する** |
| 0-2 | Cloudflare API Token スコープ縮小               | ⚠️   | `CLOUDFLARE_API_TOKEN` は GitHub Secrets に保存済だがスコープは API Token 管理画面でのみ確認可能。ダッシュボード `https://dash.cloudflare.com/profile/api-tokens` で対象トークンを開き、Permissions が `Cloudflare Pages:Edit` かつ Account Resources / Zone Resources が `Include specific` (単一 Pages プロジェクト) になっているか確認。広い場合は新規 Token を発行して差し替え                                 |
| 0-3 | LINE channel secret/token 暗号化                | ✅   | README の「Phase 1 の限界」セクションを削除、`docs/ROADMAP.md` の「既知の制限」セクションを削除、セキュリティ TODO の具体記述を抽象化、`docs/superpowers/README.md` で計画書アーカイブの位置づけを注釈。暗号化実装は別 PR に切り出し                                                                                                                                                                               |
| 0-4 | gitleaks による最終秘密値スキャン               | ✅   | `gitleaks git .` で 342 commits をスキャン → no leaks。`gitleaks detect --no-git` で検出された 1 件は untracked な `.env` の `RESEND_API_KEY` で、Public 化で漏出する経路なし (前回 L-4 と同じ判定)                                                                                                                                                                                                                |
| 0-5 | LICENSE                                         | ✅   | MIT License を `LICENSE` として追加                                                                                                                                                                                                                                                                                                                                                                                |
| 0-6 | SECURITY.md                                     | ✅   | 報告窓口 (`genzouw@gmail.com` + GitHub Private Vulnerability Reporting) と SLA 目安を `SECURITY.md` に記載                                                                                                                                                                                                                                                                                                         |
| 0-7 | docs/superpowers と docs/ROADMAP の偵察情報     | ✅   | `docs/superpowers/plans/*` 内に残る「平文保存」「認証なし」記述は計画書アーカイブとして維持しつつ、`docs/superpowers/README.md` で「現状の実装ステータスとは一致しない」旨を明示                                                                                                                                                                                                                                   |
| 0-8 | 課金アラート (GCP / Cloudflare / Resend / Neon) | ⚠️   | `gcloud billing budgets list` は `billingbudgets.googleapis.com` 未有効化のため確認不可。**ユーザーが手動対応**: GCP は `Billing → Budgets & alerts` で月額予算 (例 5,000 円) と 50%/90%/100% アラートを設定。Cloudflare はダッシュボード `Billing → Notifications`、Resend は `Settings → Billing → Email alerts`、Neon は `Project Settings → Billing` で確認                                                    |
| 0-9 | SPF / DKIM / DMARC                              | ⚠️   | `dig +short` 結果: SPF レコード未設定 (TXT に `toique.pages.dev.` のみ、これは CNAME 文字列が誤って TXT に入っている可能性) / DKIM `resend._domainkey` 設定済 ✅ / DMARC `v=DMARC1; p=none;` (監視モード)。**ユーザーが手動対応**: (a) SPF を `v=spf1 include:_spf.resend.com -all` で追加、(b) DMARC を運用安定後に `p=quarantine` または `p=reject` に上げる                                                     |

### ⚠️ 公開化操作の前に **ユーザー側で必ず対応すべき** 残作業

以下を Claude では完了できないため、Public 化操作の前に手動で実施してください。

1. **0-1 WIF apply**:
   ```bash
   cd infra
   export GCP_PROJECT_ID=YOUR_GCP_PROJECT_ID
   export GCP_PROJECT_NUMBER=YOUR_GCP_PROJECT_NUMBER
   export GITHUB_REPOSITORY=YOUR_GITHUB_REPOSITORY
   bun install --frozen-lockfile
   bunx cdktf deploy
   ```
   apply 後に `gcloud iam workload-identity-pools providers describe github-provider --location=global --workload-identity-pool=github-pool --project=toique-app-prod` で `attributeCondition` が `assertion.repository == 'genzouw/toique' && assertion.ref == 'refs/heads/main'` になっていること、SA Binding の principalSet にも `:ref:refs/heads/main` が含まれていることを確認。
2. **0-2 Cloudflare Token 縮小**: 上記メモ参照。新規 Token 発行後に `gh secret set CLOUDFLARE_API_TOKEN < /path/to/new-token` で置換。
3. **0-8 課金アラート**: 上記メモ参照。最低でも GCP の月額予算アラートは公開化前に必須。
4. **0-9 SPF/DMARC**: 上記メモ参照。SPF 未設定はなりすまし送信に悪用される恐れあり。まず `dig TXT <ドメイン>` で既存の TXT レコードを確認し、`toique.pages.dev.` のような不正な値が含まれている場合は DNS 管理画面で **削除または置換** してから `v=spf1 include:_spf.resend.com -all` を追加すること（複数の SPF TXT レコードが存在すると SPF 検証が失敗する）。

これらが完了したら、本 PR をマージ → 後続の `genzouw.com/terraform` で `visibility = "public"` に切り替えて Public 化に進む。

---

_最終更新: 2026-05-19_
