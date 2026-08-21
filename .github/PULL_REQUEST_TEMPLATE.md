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

## デプロイ・運用時の注意

<!-- 環境変数追加 / インフラ変更 / AIツールの手動オペレーションが必要なら明記。なければ「なし」。 -->
- [ ] PR をマージする前に、GitHub の Secrets に `GEMINI_API_KEY` (AI PR Review 等の自動化用) などの必要な API キーが設定されていることを確認しましたか？
