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

## 事前作業・手動設定の確認

<!--
  以下はメンテナー（マージ権限を持つ管理者）がマージ前に確認する項目です。
  Repository Secrets はリポジトリの管理者のみが閲覧・設定できるため、
  フォークからのPR作成者は確認・対応不要です。
-->

- [ ] （メンテナー確認）Gemini API Key (`GEMINI_API_KEY`) が Repository Secrets に設定されている（`pull_request` 起動ではフォークPRに `GEMINI_API_KEY` が渡らないため、Gemini による自動レビューはスキップされます。一方 `issue_comment` 起動（`/gemini-review` コマンド）はベースリポジトリのコンテキストで実行されるため、フォークPRのコメントであっても Repository Secrets にアクセスできます）
- [ ] （メンテナー確認）Exa API Key (`EXA_API_KEY`), Tavily API Key (`TAVILY_API_KEY`) 等、RAG用のキーが設定されている（必要な場合）
- [ ] （メンテナー確認）StepSecurity Harden-Runner の初期設定・Appインストールが完了している

## デプロイ時の注意

<!-- 環境変数追加 / インフラ変更 / 手動オペレーションが必要なら明記。なければ「なし」。 -->

なし
