# シークレット漏洩防止 (Leak Prevention)

本リポジトリは公開リポジトリであり、認証情報やインフラ情報などのシークレットが誤ってコミットされることを防ぐため、多層的な防御策を講じています。

## 防御層の全体像

1. **コミット前検知 (Pre-commit / Pre-push)**
   - **ツール:** `pre-commit` framework (`.pre-commit-config.yaml` 経由での `gitleaks`, `detect-secrets`), `secretlint`, `lint-staged` (`package.json`) の厳格なフェイルファスト機構、Husky フックベースのファイルパスブロック・シークレットスキャン (`pre-commit`, `commit-msg` および `pre-push`)
   - **実行タイミング:** ローカルでの `git commit` 時（ファイル内容とコミットメッセージ）および `git push` 時（Husky を経由して実行）
   - **役割:** 開発者や AI エージェントが誤ってシークレットを含むファイルをステージングし、コミットしようとした際に検知してブロックします。`package.json` の `lint-staged` には、すべてのディレクトリ配下の `**/*.env*`, `**/*.pem`, `**/*.p12`, `**/*.p8`, `**/*.keystore`, `**/*.jks`, `**/*_rsa`, `**/.npmrc`, `**/.netrc`, `**/*.sqlite`, `**/*.db`, `**/*.log`, `**/*credentials*.json`, `**/*secret*.json` や AI エージェントの作業跡 (`**/.cursor/`, `**/.claude/` 等、および一時ファイルの `*.http`, `*.rest`, `*.patch`, `*.diff`, `*.local`)、およびインフラストラクチャの完全な平文状態やシークレットを内包する **Terraform / CDKTF の状態ファイル（`**/*.tfstate*`, `**/cdktf.out/**`, `**/.terraform/**` 等）** を検出した場合に即座にコミットをリジェクトする、クロスプラットフォーム対応の厳格なフェイルファスト機構 (`node -e "..."`) が組み込まれており、遅いリンターの実行前に漏洩を防ぎます。さらに `.husky/commit-msg` にてコミットメッセージ自体の内容も `gitleaks` でスキャンし、メッセージへのシークレット混入もブロックします。また、ルートの `.gitignore` により `.env` や各種鍵ファイル、状態ファイル、AIの一時作業ファイルなどを Git 管理対象から除外しています（機密管理の補助策であり、ファイルの読み込み自体を完全に防ぐセキュリティ制御ではありません）。Node.js に依存しているため、リポジトリを clone して`bun install`を実行すれば基本設定は一貫して動作します。
   - **Pre-push フックの最終防衛ライン:** `--no-verify` オプションで `pre-commit` をバイパスされた場合や、マージ・リベースによって意図せず機密ファイルが混入した場合に備え、`.husky/pre-push` フックを設けています。このフックはリモートへ送信されるコミット範囲（既存ブランチへの Push は `$remote_sha..$local_sha`、新規ブランチの Push は他のリモート追跡ブランチに存在しない範囲 `$local_sha --not --remotes`）に含まれる**各コミット**の変更パスを `git log --name-only` で個別に列挙して禁止パス検査を行い、あわせて `gitleaks detect` による内容スキャンを実行することで、途中のコミットで追加後に削除された機密ファイルも含めて公開リポジトリへのシークレット流出を水際でブロックします。
   - **pre-commit framework と Husky の連携:** Husky (`.husky/pre-commit`) をラッパーとして使用し、その内部で Python の `pre-commit` framework を呼び出します（バイナリが存在する場合）。これにより `.pre-commit-config.yaml` で定義された標準の `pre-commit-hooks`（`detect-private-key` など）、`gitleaks`、および `detect-secrets` が統一的に実行されます。バイナリが存在しない場合は、従来通りのフォールバックスキャン（Bashスクリプトによる個別実行）へと自動的に切り替わるため、環境依存を抑えつつ安全性を高めています。
   - **Gitleaks の利用:** `gitleaks` は API キーやトークン等の混入を防ぎます。Python の `pre-commit` framework 経由で実行される場合はフレームワークが管理する環境で動作しますが、ローカル環境に `pre-commit` が無く旧来のシェル実行にフォールバックした場合でも、対応 OS/ARCH（linux/darwin × x64/arm64）かつオンラインであれば `~/.cache/gitleaks/` へ自動ダウンロード・チェックサム検証を行った上でスキャンします。一方 `pre-push` フックはこの自動ダウンロードは行わず、既にインストール済みの `gitleaks` バイナリ、または `pre-commit` によってキャッシュ済みのバイナリのみを再利用します。いずれの手段でも利用できない場合はローカルでの内容スキャンをスキップし、コミット・Push 自体はブロックしません（CI での検知に委ねます）。ルール設定はリポジトリ直下の `.gitleaks.toml` で管理しており、デフォルトルールに加えてプロジェクト固有の漏洩リスク（ハードコードされた GCP Project ID・Project Number・Service Account、Resend・Stripe・Better Auth 等の特定の API キー、AI エージェントの一時プレースホルダや作業跡、PII としてのメールアドレス、Neon Postgres / Redis のエンドポイント、内部 IP アドレス、Cloudflare Pages / Cloud Run の未公開バックエンド URL）を検知するためのカスタムルールが定義されています。
   - **Detect-secrets の利用:** Yelp によって開発された `detect-secrets` は、正規表現ベースの `gitleaks` を補完する目的で導入されています。高エントロピーな文字列（ランダムに生成された API キーやパスワードなど）を検知することに長けています。これも通常は `pre-commit` framework 経由で実行されますが、フォールバック時にはローカルで `pip install detect-secrets==1.5.0`（`.secrets.baseline` が記録しているバージョンと同一のもの）がインストールされている場合に実行されます。未インストールの場合はローカルでのエントロピースキャンをスキップしますが、これによってブロックされないのは `detect-secrets` によるチェックのみです。`gitleaks` などその他のローカルチェックは通常どおり実行され、コミットをブロックし得ます（`detect-secrets` によるエントロピースキャンの欠落は、CI の `detect-secrets` ワークフロー (`.github/workflows/detect-secrets.yml`) での検知に委ねます）。`detect-secrets-hook` はステージ済みパス（`git diff --cached --name-only`）を受け取りますが、実際にはそのパスの作業ツリー上のファイルを開いてスキャンするため、同じファイルに unstaged な変更が残っている「部分ステージ」の状態ではコミット内容とスキャン対象が一致しません。そのため `.husky/pre-commit` は部分ステージを検出した場合はスキャンを実行せずコミットを拒否し、全体をステージし直すよう促します。また、検知候補の追加検証のための外部ネットワーク呼び出しはオフライン動作の担保と情報送信の抑制のため `--no-verify` で無効化しています。誤検知（False Positives）は `.secrets.baseline` ファイルによって管理・除外されます。ベースラインの更新が必要な場合は、`bun run detect-secrets:update` を実行して既存のベースラインに対して安全にマージ更新してください（このスクリプトは実行前に `detect-secrets --version` が `1.5.0` であることを検証し、異なる場合はベースラインを壊さないようフェイルファストします。実行後は `git diff .secrets.baseline` で検知結果を必ず確認し、実際のシークレットが含まれていないことを確認してからコミットしてください）。

2. **CI 検知 (CI/CD)**
   - **ツール:** `gitleaks`（`genzouw/ci-workflows` 経由の公式リリースバイナリ + SARIF アップロード、および `reviewdog/action-setup` + チェックサム検証済み Gitleaks 公式リリースバイナリ + `reviewdog` CLI による PR アノテーション）, `detect-secrets`, `trivy`, `TruffleHog`, `secretlint`, `osv-scanner`, `CodeQL`, `zizmor`, `deptrust`, カスタムパスブロッカー (`.github/workflows/forbidden-paths.yml`)
   - **実行タイミング:** 全てのブランチに対する GitHub への Push 時、同一リポジトリからの Pull Request 時（`pr-secret-review.yml`）、およびフォークからの Pull Request 時
   - **役割:** ローカルでの検知をすり抜けたシークレットや、CI環境特有の漏洩を検知します。**公開リポジトリにおいて「フィーチャーブランチへのプッシュ」も即座に公開される性質を考慮し、セキュリティスキャナー群（`gitleaks`, `detect-secrets`, `TruffleHog`, `secretlint`, `trivy`, `zizmor`, `deptrust` 等）はメインブランチだけでなく、全ブランチのPushに対して即座に動作するよう設定されています（`CodeQL` についても全ブランチに対するプッシュで静的解析が動作するように追記・厳格化を行っています）。** また、フォークからのPull Request（フォーク元リポジトリには `push` イベントが発火しない外部からのPull Request）に対しても、漏洩や脆弱性がマージ前に検知されるように `pull_request` トリガーが構成されています（フォークPR時は権限エラーを回避するためSARIFアップロードをスキップしますが、SARIF ファイルの結果チェックは実行され、検知時はジョブを失敗させます。ただしブランチ保護の必須チェックに設定されているのは `gitleaks` / `trivy` / `zizmor` の 3 件のみで、それ以外のジョブは失敗してもマージを自動的にはブロックしません（「PR マージ前後の検証手順」を参照））。`detect-secrets` ワークフローにより、`--no-verify` によってバイパスされた高エントロピーな文字列（ランダム生成された鍵など）の混入も CI 段階で検知します（このワークフローは必須チェックではないため、検知してもマージは自動的にはブロックされません。マージ前の確認手順は「PR マージ前後の検証手順」を参照）。`secretlint` によりファイルシステム全体の静的解析を行います。また、本リポジトリでは `secretlint` の結果を `@secretlint/secretlint-formatter-sarif` により SARIF 形式で出力し、GitHub Security Tab に連携させています。なお、`--output` オプション使用時は `secretlint` 自体が検知時でも exit code 0 を返すため、CI ワークフローには SARIF の `results` 件数を検証して検知時に明示的に `exit 1` する専用ステップを設けており、シークレット検知時にジョブが確実に失敗する設計になっています。これにより、Pull Request の変更行に対して直接警告がアノテーションされ、漏洩の早期発見と可視性が飛躍的に向上しています。`gitleaks` は `.github/workflows/gitleaks.yml` から `genzouw/ci-workflows` の reusable workflow を呼び出す構成で、その reusable workflow が `genzouw/ci-workflows` の composite action `.github/actions/setup-gitleaks` 経由で公式リリースバイナリをインストールして実行し、結果の SARIF を `github/codeql-action/upload-sarif` により GitHub Security タブへ連携します。検知時は `--exit-code 1` によってジョブが失敗し、マージがブロックされます（PR へのエラーコメント付与は行いません）。加えて、PR に直接アノテーションを行うために `.github/workflows/pr-secret-review.yml` を設けています。このワークフローは `reviewdog/action-setup` で `reviewdog` CLI を導入し、`genzouw/ci-workflows` の composite action `.github/actions/setup-gitleaks` 経由で Gitleaks 公式リリースのバイナリをチェックサム検証（`gitleaks_<version>_checksums.txt` と `sha256sum -c`）した上でインストールし、`gitleaks detect --no-git` で PR head の作業ツリーを SARIF 出力でスキャンし（履歴スキャンでは検知行が「シークレットを導入したコミット時点」の行番号になり、PR 差分の行番号と一致せずアノテーションが落ちるため、作業ツリーを直接スキャンしています）、その結果を `reviewdog -f=sarif -reporter=github-pr-review -filter-mode=added -fail-level=any` で PR の差分行にアノテーションすることで、シークレット漏洩の即時フィードバックを強化しています（このワークフローは同一リポジトリ由来の Pull Request 時にのみ動作し、Push イベントおよびフォークからの Pull Request では実行されません。Push 時とフォーク PR の検知は、上記の `.github/workflows/gitleaks.yml`（`genzouw/ci-workflows` 経由）をはじめとする他のスキャナー群が担います）。バージョン更新時は `reviewdog/action-setup` の SHA ピンと、同 action に渡す `reviewdog_version`（省略すると `latest` が解決されバイナリの版が浮動するため明示的に固定しています）が更新対象となります（`with:` 内の値のため Dependabot の更新対象外であり、手動更新が必要です）。**gitleaks のバージョンは `genzouw/ci-workflows` の composite action `.github/actions/setup-gitleaks` の `inputs.version` 既定値を単一の信頼できる情報源 (Single Source of Truth) としており、本リポジトリの `.github/workflows/pr-secret-review.yml` と、`.github/workflows/gitleaks.yml` が呼び出す ci-workflows 側の reusable workflow の双方がこの action を経由します。** 参照はいずれも `uses:` の SHA ピンで Dependabot (github-actions ecosystem) の更新対象に載るため、CI 側の2つのシークレットゲートが別バージョンの gitleaks で走る（ルール追加やパーサ修正の差によって「片方は検知し片方は見逃す」状態が気づかないまま続く）ことは構造的に起こりません。なお、ローカルフック側の gitleaks（`.husky/pre-commit` の `GITLEAKS_VERSION` フォールバックと `.pre-commit-config.yaml` の `gitleaks` hook の `rev`）はこの action の対象外で、別途の更新が必要です。ブランチ保護ルールでこれらのワークフローを必須チェック (Required status checks) に設定することで、マージをブロックできます。**ただし現時点で必須に設定されているのは `gitleaks` / `trivy` / `zizmor` の 3 件のみです**（「PR マージ前後の検証手順」を参照）。これにより、コードレビュー段階で漏洩に気づきやすくなります。さらに `TruffleHog` が補完的に動作して、実効性の高い Verified Secrets（クラウドプロバイダ等に到達可能な本物の鍵）をスキャンします。また、`osv-scanner` を用いて依存関係における脆弱性走査を行い、悪意のあるパッケージを通じたサプライチェーン攻撃（例: 実行時に `.env` の内容を外部へ送信する等のシークレット漏洩）のリスクを低減します。`zizmor` を利用して GitHub Actions ワークフロー自体の設定不備や潜在的なトークン漏出リスク（例: prompt injection 等）を検知します。`deptrust` は GitHub Actions の依存関係を監査し、悪意のある Action をブロックしてサプライチェーンセキュリティをさらに強固にします。さらに、`CodeQL` の `security-and-quality` クエリ（`security-extended` を包含する最も包括的なスイート）を有効化しており、変数名や関数の引数などソースコードの文脈を深く解析し、セキュリティ上の問題やコード品質の欠陥を検知します。なお、ハードコードされたシークレットや認証情報の検知（CWE-798 など）は 2025年5月の GitHub の変更により CodeQL クエリから除外されており、その検知は `GitHub Secret Scanning` が担います。加えて、`--no-verify` でローカルのフックをすり抜けたインフラ状態ファイル (`*.tfstate`) や AI の作業跡、認証情報ファイルが直接 Push・PR された場合に備え、CI 上で検知するカスタムパスブロッカー (`.github/workflows/forbidden-paths.yml`) を実行する多層防御 (Defense-in-depth) を敷いています（このワークフローも必須チェックではないため、失敗時はマージ前に目視で確認してください）。

3. **定期監査 (Audit)**
   - **ツール:** `gitleaks`（`genzouw/ci-workflows` 経由の公式リリースバイナリ）, `detect-secrets`, `trivy`, `TruffleHog`, `secretlint`, `osv-scanner`, `Dependabot`, `OpenSSF Scorecard`, `anchore/sbom-action`, `zizmor`, `deptrust`
   - **実行タイミング:** 日次スキャン（`Dependabot`）、週次スケジュール実行（その他のスキャナー）
   - **役割:** 過去の履歴全体や、新しく追加された依存パッケージ・ルールに対する棚卸しを行い、漏洩や脆弱性を見逃さないようにします。`gitleaks` の場合は全履歴を対象とした Full スキャンを定期実行します。`secretlint` のワークフローも同様に週次で全ファイルをスキャンします。加えて、`Dependabot` による依存関係スキャンを毎日（Daily）実行することで、悪意のあるパッケージを通じたサプライチェーン攻撃（シークレット漏洩など）に直結する脆弱性をいち早く検知します。サプライチェーンの安全性を徹底するため、フロントエンド・バックエンドだけでなく、ルートディレクトリ（`/`）の npm 依存関係も Dependabot のスキャン対象としてカバーし、リポジトリ全体のパッケージ起因の漏洩リスクを低減させています。また `osv-scanner` や `trivy` による脆弱性・構成ミスの定期スキャンにより、新たに報告された CVE に対しても継続的に追従し、意図しない露出や流出の経路を塞ぎます。さらに、`OpenSSF Scorecard` を用いてサプライチェーンセキュリティのベストプラクティスとリポジトリ構成の健全性を週次でスコアリングし、潜在的な脆弱性や構成不備を継続的に監査します。また、`anchore/sbom-action` を用いて Software Bill of Materials (SBOM) を定期生成し、リポジトリに含まれる依存関係の全体像を透過的に把握・管理することで、サプライチェーンセキュリティを補強しています。さらに、依存パッケージのライセンスコンプライアンスチェック（`license-compliance.yml`）を週次スケジュールおよびPR時に実行し、`license-checker-rseidelsohn`を用いて制限の強いライセンス（GPL、AGPLなど）の混入を検知することで、知的財産リスク（広義の漏洩リスク）を低減します。ただし判定は `--failOn` に列挙した 10 個の SPDX 識別子との完全一致に限られ、未知ライセンス・複合 SPDX 式・列挙外のコピーレフトは通過します（「license-compliance.yml の判定方式と限界」を参照）。
   - **pre-commit フックの定期更新:** 週次の `pre-commit-autoupdate.yml` により、ローカル検知ツール `gitleaks` のバージョンを自動更新する更新候補PRを作成します。ワークフローはフックを直接更新するわけではなく、レビュー・CI確認・マージが完了して初めてローカル検知ツールのバージョンが更新されます。なお **`detect-secrets` は自動更新の対象外（手動更新）** です。`detect-secrets` の版は `.pre-commit-config.yaml` の `rev` だけでなく `.secrets.baseline`（`"version"`）、`.husky/pre-commit`（バージョン不一致時はハードフェイル）、`package.json`（`detect-secrets:update`）、および本ドキュメントにも固定されており、`rev` だけを上げるとフォールバック経路のエントロピースキャンが停止します。更新する場合は上記すべてを揃えて変更し、`bun run detect-secrets:update` でベースラインを再生成してください。

4. **エディタによる保存時整形・表示除外 (Editor)**
   - **ツール:** VS Code の推奨拡張機能と設定ファイル (`.vscode/settings.json`, `.vscode/extensions.json`)
   - **役割:** ローカル開発環境での保存時に自動フォーマット・Lint 適用 (`editor.formatOnSave`, `editor.codeActionsOnSave`, および `.ts`/`.tsx` に対する `editor.defaultFormatter` の明示指定) を行い、コミット前にコードスタイルの逸脱を早期に解消します。また、エディタの検索・表示対象から `.env` や各種鍵ファイル、状態ファイル、AIの一時作業ファイルなどを外す除外設定 (`search.exclude`, `files.exclude`) により、エディタ上での偶発的な閲覧・混入リスクを低減します（機密管理の補助策であり、ファイルの読み込み自体を完全に防ぐセキュリティ制御ではありません）。なお VS Code Marketplace には本稿執筆時点で `secretlint` の公式拡張機能は存在しないため、エディタ上でのリアルタイムなシークレット検知は行っていません。シークレットの検知は上記 1〜3 の pre-commit フック・CI・定期監査の各層が担います。

## 検知限界と補完統制

いずれのスキャナーにも「構造上検知できないもの」があり、**どれか 1 つが通ったことは安全の証明になりません。** 本節は各ツールの限界と、それを補う統制を一覧化したものです（記載は 2026-09-14 時点のワークフロー定義およびローカル実測に基づきます）。

| ツール                                   | 構造上検知できないもの                                                                                                                                           | 補完する統制                                                                                              |
| :--------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `gitleaks`（ローカル）                   | `.gitleaks.toml` の正規表現に無い形式のシークレット。バイナリを用意できない環境ではスキャン自体をスキップし、コミット・Push をブロックしない                     | CI の `gitleaks.yml`（必須チェック）、`detect-secrets` のエントロピー検知、GitHub Secret Scanning         |
| `gitleaks`（CI）                         | 同上（ルールに無い形式）。`.gitleaks.toml` の `[allowlist]` に登録したパス・正規表現は対象外                                                                     | `secretlint` / `TruffleHog` の別系統ルール、Push Protection                                               |
| `detect-secrets`（ローカル）             | 未インストール環境ではエントロピースキャンが行われない（他のローカルチェックは動作する）                                                                         | CI の `detect-secrets.yml`（ただし任意チェック）                                                          |
| `detect-secrets`（CI）                   | `.secrets.baseline` に `filename + hashed_secret + type` で登録済みのものは新規検知として扱わない。ベースラインへの誤登録は、その 1 件の検知を恒久的に無効化する | `bun run detect-secrets:update` 実行後の `git diff .secrets.baseline` レビュー（「運用ルール」参照）      |
| `secretlint`                             | `--output` 使用時は検知しても exit code 0 を返す（ツール側の仕様）                                                                                               | SARIF の `results` 件数を検証して明示的に `exit 1` する専用ステップをワークフローに設置済み               |
| `TruffleHog`                             | `--only-verified` で実行しているため、**到達性を検証できないシークレットは報告しない**（失効済みの鍵、自己ホストのサービス、独自形式の資格情報など）             | `gitleaks` / `detect-secrets` / `secretlint` による未検証（パターン・エントロピー）検知                   |
| `CodeQL`                                 | ハードコードされたシークレット・認証情報（CWE-798 など）は 2025 年 5 月の GitHub の変更によりクエリから除外されている                                            | GitHub Secret Scanning、`gitleaks`、`secretlint`                                                          |
| GitHub Secret Scanning / Push Protection | 既知プロバイダのパターンに限られ、独自形式の資格情報や内部エンドポイントは対象外。有効化はリポジトリ設定側の手作業に依存する                                     | `.gitleaks.toml` のカスタムルール（GCP Project ID / Project Number、Neon・Redis エンドポイント、内部 IP） |
| `forbidden-paths.yml`                    | **パス名のみで判定し、ファイルの中身は見ない。** 禁止パス以外のファイル（例: `README.md`）に書かれたシークレットは対象外                                         | `gitleaks` / `detect-secrets` / `secretlint` による内容スキャン                                           |
| `osv-scanner` / `trivy` / `Dependabot`   | 公開脆弱性 DB に**登録済み**の問題のみ。未登録の悪性パッケージ、typosquatting、インストールスクリプトによる情報送信は検知しない                                  | `deptrust`（Actions 依存）、SBOM による依存の棚卸し、依存追加時のレビュー                                 |
| `deptrust`                               | 対象は `.github/workflows/*.yml` の `uses:` 参照のみ。npm / pip などアプリケーション依存は範囲外。外部 API のレート制限時はリトライ後に失敗する（fail closed）   | `osv-scanner` / `trivy` / `Dependabot`                                                                    |
| `zizmor`                                 | ワークフロー定義の静的解析のみ。実行時に注入される値や、Action 内部の実装は追わない                                                                              | `deptrust`、`CodeQL`（`actions` 言語）、`actionlint`                                                      |
| `OpenSSF Scorecard`                      | スコアリングのみで、低スコアでもジョブを失敗させない。`main` への push と週次のみで**PR では走らない**                                                           | 個別スキャナーのジョブ失敗による検知                                                                      |
| `anchore/sbom-action` / `sbom.yml`       | SBOM を生成・アップロードするのみで、内容に対するポリシー判定は行わない                                                                                          | `osv-scanner` / `trivy` / `license-compliance.yml`                                                        |
| `sbom-policy-check.yml`                  | **名称に反してポリシー判定を行わない。** SBOM の生成とアーティファクトへのアップロードのみで、判定ステップを持たない                                             | 同上。ポリシー判定が必要な場合は本ワークフローに判定ステップを追加すること                                |
| `license-compliance.yml`                 | 拒否リスト方式のため、列挙した 10 個の SPDX 識別子と**完全一致しない宣言はすべて通過する**（次項参照）                                                           | 依存追加時の目視確認（次項の手順）                                                                        |

### license-compliance.yml の判定方式と限界

`license-compliance.yml` は `license-checker-rseidelsohn@4.4.2` の `--failOn` に GPL / AGPL の 10 識別子を列挙する**拒否リスト方式**です（Root / Backend / Frontend / Infra の 4 ワークスペースで同一の引数）。許可リスト方式ではないため、**列挙文字列に完全一致しない宣言はすべて通過します。**

`license-checker-rseidelsohn@4.4.2` にダミーパッケージを与えて挙動を実測した結果は次のとおりです。

| 依存パッケージが宣言するライセンス                   | 判定        | 備考                                                    |
| :--------------------------------------------------- | :---------- | :------------------------------------------------------ |
| `GPL-3.0-only`                                       | ❌ ブロック | 意図どおり                                              |
| `GPL-3.0`（非推奨の旧 SPDX 識別子）                  | ⚠️ 通過     | npm 上の既存パッケージに広く残っている表記              |
| `(MIT OR GPL-3.0-only)`                              | ⚠️ 通過     | 複合 SPDX 式。MIT を選択できるため実害は小さい          |
| `(MIT AND GPL-3.0-only)`                             | ⚠️ 通過     | 複合 SPDX 式。**GPL の義務が課されるが通過する**        |
| `GPL-3.0-only WITH Classpath-exception-2.0`          | ⚠️ 通過     | 例外条項付き                                            |
| `LGPL-3.0-only` / `MPL-2.0` / `EPL-2.0` / `CDDL-1.1` | ⚠️ 通過     | 列挙外のコピーレフト                                    |
| `SSPL-1.0` / `BUSL-1.1`                              | ⚠️ 通過     | 列挙外。商用利用制限があり GPL より制約が強い場合がある |
| `UNKNOWN`（`license` フィールド無し）                | ⚠️ 通過     | 未知ライセンスは判定対象にならない                      |
| `UNLICENSED`                                         | ⚠️ 通過     | 同上                                                    |

つまり本ワークフローが保証しているのは「`--failOn` に列挙した 10 個の SPDX 識別子に**完全一致する**宣言が依存ツリーに無いこと」だけです。未知ライセンス・複合 SPDX 式・旧式識別子・列挙外のコピーレフトは**ブロックされません**。

**複合 SPDX 式（`AND` / `OR`）の判定・記録基準:** `OR` 式は、選択可能な識別子のいずれかが本リポジトリのライセンスポリシー（GPL / AGPL 非許容）に適合する場合は許可してよく（例: `(MIT OR GPL-3.0-only)` は MIT を選択したものとして扱う）、一律に禁止する必要はありません。`AND` 式は、列挙されたすべてのライセンスの義務を同時に負うため代替の選択肢が無く、拒否対象のライセンスが含まれる場合（例: `(MIT AND GPL-3.0-only)`）は無条件でブロック対象として扱います。`--failOn` の拒否リストはいずれの複合式も機械的には検知しないため、次項の目視確認で判定した結果（許可 / ブロックの別と対象パッケージ）を、依存追加時の PR 説明またはコミットメッセージに記録してください。第三者承認は求めませんが、判断の記録を必須とします。

**依存を新規追加・更新する際の運用:** CI の合否だけに依存せず、CI（`license-compliance.yml`）と同じ Root / Backend / Frontend / Infra の 4 ワークスペースそれぞれで次のコマンドを実行し、`UNKNOWN` / `UNLICENSED` / 見慣れない識別子・複合式が増えていないかを目視で確認してください。ルートで 1 回実行するだけでは、Backend / Frontend / Infra 配下にのみ追加した依存関係が確認対象から漏れます。

```bash
for d in . backend frontend; do (cd "$d" && bun x license-checker-rseidelsohn@4.4.2 --summary); done
(cd infra && npx license-checker-rseidelsohn@4.4.2 --summary)
```

## PR マージ前後の検証手順

### 必須チェックと任意チェックの区別

**セキュリティ系ワークフローの大半は、検知してジョブが失敗してもマージを自動的にはブロックしません。** ブランチ保護で必須（Required status checks）に設定されているのは次の 3 件だけです。

```console
$ gh api repos/genzouw/toique/branches/main/protection --jq '.required_status_checks.contexts'
["zizmor / zizmor","trivy / Trivy filesystem scan","gitleaks / Scan for leaked secrets"]
```

| ワークフロー                         | チェック名                           | 必須 / 任意                    |
| :----------------------------------- | :----------------------------------- | :----------------------------- |
| `gitleaks.yml`                       | `gitleaks / Scan for leaked secrets` | ✅ 必須                        |
| `trivy.yml`                          | `trivy / Trivy filesystem scan`      | ✅ 必須                        |
| `zizmor.yml`                         | `zizmor / zizmor`                    | ✅ 必須                        |
| `detect-secrets.yml`                 | Scan for high-entropy secrets        | ⚠️ 任意                        |
| `trufflehog.yml`                     | Scan for leaked secrets (TruffleHog) | ⚠️ 任意                        |
| `secretlint.yml`                     | Scan for leaked secrets (Secretlint) | ⚠️ 任意                        |
| `osv-scanner.yml`                    | Scan for vulnerabilities             | ⚠️ 任意                        |
| `codeql.yml`                         | Analyze (...)                        | ⚠️ 任意                        |
| `deptrust.yml`                       | DepTrust Check                       | ⚠️ 任意                        |
| `forbidden-paths.yml`                | Check for forbidden file paths       | ⚠️ 任意                        |
| `license-compliance.yml`             | OSS License Compliance Check         | ⚠️ 任意                        |
| `pr-secret-review.yml`               | reviewdog / gitleaks                 | ⚠️ 任意                        |
| `sbom.yml` / `sbom-policy-check.yml` | Generate SBOM ほか                   | ⚠️ 任意                        |
| `scorecard.yml`                      | Scorecard analysis                   | ⚠️ 任意（PR では実行されない） |

あわせて次の設定が有効です。

- `strict: true` — 必須チェックは最新の `main` を取り込んだ状態で通過している必要があります。
- レビュー承認 1 件および CODEOWNERS レビューが必須です。
- **`enforce_admins` は無効です。** リポジトリ管理者は上記をすべて迂回してマージできます。統制は最終的にオーナーの運用規律に依存しており、機械的に強制されているわけではありません。

### 同一リポジトリの PR ではどのイベントで走るか

各スキャナーのジョブには次の条件が付いています。

```yaml
if: github.event_name == 'push' || github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' || (github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name != github.repository)
```

このため、**同一リポジトリのブランチから出した PR では `pull_request` 側のジョブはスキップされ、同一コミットに対する `push` 側の実行が結果を報告します**（同じ検査の二重実行とレート制限の回避が目的）。PR の Checks 欄にスキップ表示があっても、検査が行われていないとは限りません。フォークからの PR では逆に `pull_request` 側で実行されます（フォーク元に `push` イベントが発火しないため）。`pr-secret-review.yml` だけは逆で、同一リポジトリ由来の PR でのみ動作します。

### マージ前に確認すること

1. 必須 3 件（`gitleaks` / `trivy` / `zizmor`）が success であること。
2. **任意のセキュリティ系チェックが failure / cancelled でないことを目視で確認する。** これらは自動ではマージをブロックしないため、確認を省略すると検知を素通しできてしまいます。
3. `skipped` のジョブについて、上記のイベント分岐によるものか、パスフィルタによるものかを確認する。
4. Security タブの Code scanning alerts に新規アラートが出ていないこと。

一括確認には次のコマンドが使えます。

```bash
gh pr checks <PR番号>
```

### マージ後に確認すること

1. `main` への push で再実行されるスキャナー群の結果を確認する（`gh run list --branch main --limit 20`）。
2. 週次の定期監査（各ワークフローの `schedule`）の結果を確認する。定期監査は全履歴・全ファイルを対象とするため、PR 単位の差分スキャンでは出ない検知がここで出ることがあります。
3. シークレットの検知があった場合は、履歴の書き換えより先に**必ずローテート**する（「運用ルール」参照）。

## gitleaks のバージョン管理

`gitleaks` はマイナー版でルール追加やパーサ修正が入るため、版がずれると「片方は検知し、片方は見逃す」状態が静かに続きます (#718)。バージョン定義の所在は CI 側とローカルフック側で分かれており、それぞれ更新手段が異なります。

**CI 側（自動追従）**

`genzouw/ci-workflows` の composite action `.github/actions/setup-gitleaks` の `inputs.version` 既定値が単一の信頼できる情報源です。本リポジトリの `.github/workflows/gitleaks.yml`（ci-workflows の reusable workflow 経由）と `.github/workflows/pr-secret-review.yml` の双方がこの action を `uses:` の SHA ピンで参照するため、Dependabot (github-actions ecosystem) が更新対象として拾います。本リポジトリ側でバージョン文字列を持たないため、CI の 2 つのシークレットゲートが別バージョンで走ることは構造的に起こりません。

**ローカルフック側（手動更新）**

GitHub Actions の composite action はローカルの git hook から呼べないため、ローカル側は下記に版を持ちます。**更新時は必ず 2 箇所を同じ版に揃えてください。**

| #   | ファイル                  | 箇所                                                                                               | 用途                                                                                                                                      |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `.husky/pre-commit`       | `GITLEAKS_VERSION="<version>"`                                                                     | `pre-commit` framework が無い環境でのフォールバック。`${XDG_CACHE_HOME:-$HOME/.cache}/gitleaks/gitleaks-<version>` へ自動ダウンロードする |
| 2   | `.pre-commit-config.yaml` | `repo: https://github.com/gitleaks/gitleaks` の `rev`（`# v<version>` コメント付きのコミット SHA） | `pre-commit` framework 経由での実行                                                                                                       |

補足:

- `.husky/pre-push` はバージョン文字列を持たず、`${XDG_CACHE_HOME:-$HOME/.cache}/gitleaks/` にキャッシュ済みのバイナリのうち**バージョン順で最新のもの**を選びます。旧版のキャッシュは消されずに残るため辞書順の先頭を選ぶと `gitleaks-8.21.2` が `gitleaks-8.30.1` より先に来てしまい、`.husky/pre-commit` の版を上げても pre-push だけ旧版で走り続けます。これを避けるため `sort -V | tail -n 1` で選択しています。
- グローバルインストール（`brew install gitleaks` など）された `gitleaks` が `PATH` 上にある場合、`.husky/pre-commit` / `.husky/pre-push` はそちらを優先します。この経路の版は上記の管理下に無いため、CI と揃えるかどうかは各開発者の環境に依存します。
- **#2 の `rev` を変更した場合は `bun run detect-secrets:update` によるベースライン更新が必須です。** 40 桁のコミット SHA は `detect-secrets` に `Hex High Entropy String` として検知され、`.secrets.baseline` に登録済みのハッシュは旧 SHA のものだからです。更新しないとローカルの `pre-commit` フックと CI の `detect-secrets` ワークフロー（`.github/workflows/detect-secrets.yml`）の双方で失敗します。
- 週次の `.github/workflows/pre-commit-autoupdate.yml` が上記 #2（`.pre-commit-config.yaml` の `rev`）の更新候補 PR を作成します。#1（`.husky/pre-commit` のシェル変数）は対象外のため手動更新が必要です。また同ワークフローは `add-paths: .pre-commit-config.yaml` で差分範囲を固定しているため `.secrets.baseline` を同梱できません。生成 PR は上記の理由で `detect-secrets` CI が落ちるので、レビュー時に手元でベースラインを再生成して追いコミットしてください。

## 責任分界

- **開発者（AIエージェント含む）:** コミット前にローカル環境で `secretlint` が正しく動作するように、必ず依存関係 (`bun install`) をインストールしておくこと。また、より強力な保護のために、Python の `pre-commit` framework (`3.0.0` 以上。`.pre-commit-config.yaml` に `minimum_pre_commit_version` として明示) をインストールすること (`pip install pre-commit` または `brew install pre-commit` など) を強く推奨します。`3.0.0` 未満では Gitleaks フック (`language: golang`) が前提とする Go の自動導入が行われず、フック初期化に失敗する可能性があるため、`pre-commit --version` で確認し、古い場合は `pip install -U pre-commit` 等でアップグレードしてください。これにより `gitleaks` と `detect-secrets` の管理と実行が自動化されます。`pre-commit` を使用しない場合は、フォールバック機構のためにローカル環境へ `gitleaks` と `detect-secrets` (`pip install detect-secrets==1.5.0`、`.secrets.baseline` のバージョンと揃える) を手動でインストールしてください。
- **リポジトリ管理者およびフォーク運用者:** **最も強力なゼロデイ防御である GitHub Secret Scanning / Push Protection を有効化**し、CI での多層的なチェックを維持してください。手動でリポジトリの Settings (Code security and analysis) から有効化する必要があります。

**Push Protection について:**
Push Protection は、ローカルの `pre-commit` フックをすり抜けたシークレットや、UI 経由での変更がリポジトリに到達する前に、GitHub のサーバーサイドで受信をブロックする強力な機能です。
CI ランナーにシークレットが渡る前にブロックされるため、最も確実な漏洩防止層として機能します。フォークから PR を作成する際は、フォーク元のリポジトリでも `Push Protection` が有効化されていることを確認（推奨）してください。

## 運用ルール

- **偽陽性 (False Positives) の対応:**
  テストコードやドキュメント内のダミーシークレットが検知された場合は、リポジトリルートの `.secretlintignore` にパスを追加するか、ファイル内で無効化コメント (`// secretlint-disable`) を使用してください。`gitleaks` に関しては `.gitleaks.toml` の `[allowlist]` にパスや正規表現を追加することで対応します。`detect-secrets` の場合は `bun run detect-secrets:update` でベースラインを更新して除外対象を更新してください（更新前後の差分 `git diff .secrets.baseline` を確認し、実際のシークレットをベースラインに追加しないこと）。実際のシークレットは**絶対に**コミットしないでください。
- **万が一シークレットがコミットされた場合:**
  速やかに該当のシークレットを無効化（ローテート）し、管理者へ報告してください。コミット履歴の改ざん (`force-push`) だけで解決しようとせず、必ずシークレット自体の無効化を行ってください。
- **例外承認および監査ワークフロー無効化の判断:**
  本リポジトリは単独運用のため、偽陽性の除外・監査ワークフローの無効化・必須チェックの一時解除は、オーナー (@genzouw) が単独で判断します。**第三者による承認プロセスおよび承認期限は設けません。** 承認者を置かない代わりに、記録を残すことを条件とします。
- **監査ワークフローを無効化・縮退させる場合の記録義務:**
  スキャナーを無効化する、必須チェックから外す、`[allowlist]` や `.secrets.baseline` に広い範囲の除外を追加するなど、検知能力を下げる変更を行う場合は、次の 3 点を本ドキュメントの末尾「無効化・縮退の記録」に追記してから実施してください。**記録のない無効化は行いません。**
  1. 無効化した対象（ワークフロー名・ファイルパス）と実施日
  2. 無効化した理由と、その間の代替監視手段（どの層が検知を肩代わりするか。「検知限界と補完統制」の表から補完先を選ぶ）
  3. 再有効化の見込み時期と、再有効化したことを確認する方法（例: `gh run list --workflow <name>.yml --limit 3` で success を確認する）
- **復旧・再有効化とロールバック:**
  無効化の解除は、無効化時のコミットを `git revert` して元に戻すことを基本とします（設定変更を手作業で再現しない）。ブランチ保護の必須チェックを外した場合は、`gh api repos/genzouw/toique/branches/main/protection --jq '.required_status_checks.contexts'` の出力が元の 3 件（`zizmor / zizmor`, `trivy / Trivy filesystem scan`, `gitleaks / Scan for leaked secrets`）に戻っていることを確認します。再有効化後は、無効化していた期間に積み上がった変更を取りこぼさないよう、対象ワークフローを `workflow_dispatch` で全履歴・全ファイルに対して 1 回実行し、その結果を確認してください。

## 無効化・縮退の記録

監査ワークフローを無効化・縮退させた場合は、上記「運用ルール」に従ってここへ追記します。

_現時点で無効化・縮退している監査ワークフローはありません。_
