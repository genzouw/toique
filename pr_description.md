## 背景

本リポジトリではすでに `gitleaks` や `detect-secrets` などによるコミット前のシークレット混入防止機構が強力に構築されていますが、標準的なファイルレベルのサニティチェック（例えば `detect-private-key` を用いた明示的なプライベートキー検出、コンフリクトマーカーの混入防止など）が `.pre-commit-config.yaml` の定義に含まれていませんでした。

## このPRで導入するもの

- ツール名: pre-commit/pre-commit-hooks v4.6.0 (detect-private-key, check-merge-conflict, check-added-large-files)
- 導入箇所: `.pre-commit-config.yaml` および `docs/security/leak-prevention.md`
- 期待される効果: gitleaks に加えて、一般的な private key や巨大ファイル、コンフリクトマーカーなどを pre-commit の段階で明示的に検知・拒否することでコミット前検知の多層防御をさらに強固にします。

## 検知漏れリスクと補完策

- 検知できないケース: `.pem` や `_rsa` といった標準拡張子以外の隠蔽されたカスタム形式の機密ファイル
- 補完策: 既存の `gitleaks` と `detect-secrets`（エントロピー検知）による多重チェックによって補完されています。

## マージ前に必要な手動作業（チェックリスト）

- [ ] レビュアーは、特に問題がなければそのままマージしてください。
- [ ] 開発者はローカル環境で `pre-commit autoupdate` もしくは変更を pull して最新のフック構成を適用してください。

## マージ後の確認手順

- [ ] 次の push / PR で導入した workflow が green になることを確認
- [ ] ローカルで `detect-private-key` がフックとして動作することを確認

## ロールバック手順

- 問題が発生した場合は、本PRのコミットを `git revert` してください。

## 参考情報

- 公式ドキュメント: https://github.com/pre-commit/pre-commit-hooks
