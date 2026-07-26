## 概要

このプルリクエストは、生成AIを活用した自動化ワークフロー（AI PR Code Review、AI Issue Triage、AI ChatOps等）において、検索ベースのコンテキスト（RAG）をさらに強化するため、`.github/actions/ai-web-search/action.yml` に `Jina Reader API` (https://r.jina.ai/) を統合するものです。

既存の Tavily や DuckDuckGo、Google Search による検索結果から得られた上位1件のURLに対し、Jina Reader API を用いてウェブページの全文（Markdown形式）を取得し、AI モデルへのコンテキストに追加します。これにより、AIが提供するレビュー、回答、コード修正の精度と詳細さが向上します。

## 変更内容

- `.github/actions/ai-web-search/action.yml` に、検索結果のトップURLから全文Markdownを取得してコンテキスト（`search_res`）に追記する処理を追加しました。
- コンテキストの肥大化を防ぐため、Jina Reader APIから取得したMarkdownの長さは約10,000文字に制限しています。
- 日本語の指定に従い、追加したコード内のコメントを日本語で記述しました。

## 手動で必要な導入のための事前作業

1. **Jina Reader API の設定確認**: 今回の実装では特別なAPIキーは必要なく無料で利用可能（パブリックエンドポイント `https://r.jina.ai/`）ですが、もしJina Reader側でレートリミット等の制限が厳しくなった場合は、将来的には専用のAPIキーを Secret（例: `JINA_API_KEY`）として設定し、`Authorization` ヘッダーに付与するよう運用を拡張する必要があります。現状は特に追加の手動設定は不要です。

## テスト結果

ローカル環境にて `actionlint` による GitHub Actions の構文チェックと、`bun run test` によるプロジェクトテストを実行し、すべて正常に通過することを確認しました。また、Python スクリプト内でのURL処理も個別にテスト済です。
