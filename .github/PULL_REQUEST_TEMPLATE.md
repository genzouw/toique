<!--
  PR の説明テンプレート。
  該当しないセクションは削除して構いません。
-->

## 概要

<!-- このPRが何を解決するか / 何を追加するかを1〜3行で。 -->

## 関連 Issue / 設計ドキュメント

<!-- 例: Closes #123, Refs docs/superpowers/specs/xxx.md -->

## 変更内容

<!-- 主要な変更点を箇条書きで。 -->

-
-

## 動作確認

<!-- ローカル / ステージングでどう確認したか、または確認方法。スクショ・ログがあれば貼る。 -->

- [ ] ローカルで動作確認した
- [ ] テストを追加・更新した（または不要な理由を記載）

## セルフチェック

- [ ] `bun --cwd backend run lint` / `bun --cwd frontend run lint` がパスする
- [ ] `bun --cwd backend run typecheck` / `bun --cwd frontend run typecheck` がパスする
- [ ] 破壊的変更がある場合、README または docs を更新した
- [ ] DB マイグレーションがある場合、ロールバック手順を確認した
- [ ] インデックス変更を含む場合、`CREATE INDEX` / `DROP INDEX` を `IF (NOT) EXISTS` で冪等化し、必要なら本番に CONCURRENTLY で先行適用した（`docs/migrations.md`）
- [ ] secret / 個人情報を含むコードや設定が含まれていない
- [ ] `Push Protection` の警告やブロックが発生していないこと

## コスト方針および AI 自動化のセルフチェック (公開 OSS)

- [ ] 追加した SaaS / GitHub App / Action は公開 OSS リポジトリで完全無料であり、その根拠 URL を本文に記載した（外部サービスを追加していない場合はチェック可）
- [ ] AI 連携に必要な API キー (`GEMINI_API_KEY`, `EXA_API_KEY`, `TAVILY_API_KEY` など) や StepSecurity などの手動事前設定が `.github/AI_AUTOMATION_SETUP.md` に従って完了していることを確認した
- [ ] [`AGENTS.md`](../AGENTS.md) のポリシーに違反していないことを確認した

## デプロイ時の注意

<!-- 環境変数追加 / インフラ変更 / 手動オペレーションが必要なら明記。なければ「なし」。 -->

なし
