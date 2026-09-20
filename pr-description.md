## 背景

本リポジトリは公開リポジトリであり、ローカル開発時においてシークレットが意図せずコミットされるのを防ぐ仕組みの強化が重要です。現在 `secretlint` が VS Code 保存時に実行される「Shift-left」防御が導入されていますが、正規表現ベースでより高速・高精度な `gitleaks` がローカル保存時のフックから漏れており、コミット時のフックまで発動しないギャップがありました。

## このPRで導入するもの

- ツール名: gitleaks v8.x (既存のローカルキャッシュ・環境を利用)
- 導入箇所: `.vscode/settings.json` の `emeraldwalk.runonsave` 設定および連携スクリプト (`scripts/run-security-scans-local.sh`)
- 期待される効果: VS Code でのファイル保存時に `secretlint` と共に `gitleaks` が自動実行され、コミット前により早い段階で API キー等の混入をローカル検知して警告（Shift-left 防御の強化）

## 検知漏れリスクと補完策

- 検知できないケース: `.gitleaks.toml` の正規表現にマッチしないカスタム形式のトークンや高エントロピーな文字列
- 補完策: 既存の `detect-secrets`（エントロピーベース）や、CI 上の `trufflehog`、GitHub Secret Scanning (Push Protection) で多層的に補完します。

## マージ前に必要な手動作業（チェックリスト）

レビュアーは PR をマージする前に必ず以下を実施してください。
本 PR の CI は手動作業完了を前提に通る設計です。

- [ ] GitHub repo settings → Code security → Push Protection が有効化されていることを再確認
- [ ] 開発者各員のローカル環境にて VS Code の `emeraldwalk.runonsave` 拡張機能が有効になっていることの周知
- [ ] 新規スクリプト `scripts/run-security-scans-local.sh` に実行権限 (`chmod +x`) が付与されていることの確認

## マージ後の確認手順

- [ ] 次の push / PR で既存の CI workflow が正常に green になることを確認
- [ ] ローカル環境でダミーのシークレットを含むファイルを保存した際、VS Code 上で `gitleaks` の警告が通知されることを確認

## ロールバック手順

VS Code 保存時の動作に支障をきたした場合は、本コミットを revert することで `run-secretlint-local.sh` に戻ります。または `.vscode/settings.json` から `emeraldwalk.runonsave` の設定を一時的に削除・無効化してください。

## 参考情報

- 既存のセキュリティ方針ドキュメント: `docs/security/leak-prevention.md`
- 比較検討した他案: VS Code 用の Gitleaks 拡張機能（商用・サードパーティ製が多く OSS 条件を満たさない懸念があるため、既存のローカルフック拡張 `emeraldwalk.runonsave` に相乗りする方式を採用しました）
