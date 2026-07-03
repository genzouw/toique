## 背景

本リポジトリは公開リポジトリであり、多層的なシークレットスキャンおよび脆弱性検知が行われていますが、サプライチェーンセキュリティやリポジトリ構成のベストプラクティスを俯瞰的に継続監視する仕組み（OSSF Scorecard）が不足していました。

## このPRで導入するもの

- ツール名: OpenSSF Scorecard (ossf/scorecard-action v2.4.0)
- 導入箇所: `.github/workflows/scorecard.yml` および `docs/security/leak-prevention.md`
- 期待される効果: 週次のスケジュールおよびメインブランチへのプッシュ時に、サプライチェーンセキュリティのベストプラクティス（ピン留めされた依存関係、ブランチ保護、セキュアなワークフロー権限など）を評価し、結果を GitHub Code Scanning (SARIF) に連携することで、設定の退行や未知のリスクを早期に可視化します。

## 検知漏れリスクと補完策

- 検知できないケース: Scorecard は静的な設定とヒューリスティックに基づく評価であるため、動的なシークレットの流出やアプリケーションロジックに起因する脆弱性は検知できません。
- 補完策: 既存の `gitleaks`, `trufflehog`, `secretlint` 等のコミット前・CI スキャンと組み合わせて多層的に防御します。

## マージ前に必要な手動作業（チェックリスト）

レビュアーは PR をマージする前に必ず以下を実施してください。
本 PR の CI は手動作業完了を前提に通る設計です。

- [ ] GitHubリポジトリの設定画面 (Settings -> Code security and analysis) で、Code scanning alerts が有効化されていることを確認する。
- [ ] 本番デプロイが遅延しないよう、Scorecardが別枠のジョブで動く設計であることを確認する。

## マージ後の確認手順

- [ ] mainブランチへのマージ直後に `Scorecard supply-chain security` ワークフローが起動し、成功することを確認
- [ ] Security タブの Code scanning alerts に Scorecard の結果（SARIF）が連携されていることを確認

## ロールバック手順

- `.github/workflows/scorecard.yml` を削除してコミット・プッシュしてください。

## 参考情報

- 公式ドキュメント: https://github.com/ossf/scorecard-action
- 比較検討した他案: `anchore/sbom-action` 等も検討しましたが、リポジトリ全体の設定やワークフローのセキュリティ権限など、より広範な漏洩・改ざんリスクを俯瞰して評価できる Scorecard を「定期監査」の拡充策として最優先で選定しました。
