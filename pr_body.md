## 概要

このプルリクエストは、生成AIを活用した自動化ワークフロー（AI PR Code Review、AI Issue Triage、AI ChatOps等）において、検索ベースのコンテキスト（RAG）をさらに強化するため、`.github/actions/ai-web-search/action.yml` に `Jina Reader API` (https://r.jina.ai/) を統合するものです。

既存の Tavily や DuckDuckGo、Google Search による検索結果から得られた上位3件のURLに対し、Jina Reader API を用いてウェブページの全文（Markdown形式）を取得し、AI モデルへのコンテキストに追加します。これにより、AIが提供するレビュー、回答、コード修正の精度と詳細さが向上します。

## 変更内容

- `.github/actions/ai-web-search/action.yml` に、検索結果の上位3件のURLから全文Markdownを取得してコンテキスト（`search_res`）に追記する処理を追加しました。
- コンテキストの肥大化を防ぐため、各URLのMarkdown本文は最大3,000文字に切り詰めています。処理対象は最大3 URLのため、本文の合計はURL行やタグを除いて約9,000文字が上限です。
- 日本語の指定に従い、追加したコード内のコメントを日本語で記述しました。

## 手動で必要な導入のための事前作業

1. **Jina Reader API の設定確認**: 今回の実装はパブリックエンドポイント `https://r.jina.ai/` をAPIキーなしで利用します。ただし**APIキーなしの利用には現時点で 20 RPM のレート制限があります**（Jina公式）。1回の検索あたり最大3リクエストのため通常利用では上限に達しませんが、ワークフローの同時実行数が増えた場合は制限に抵触し得ます。その場合は専用のAPIキーを Secret（例: `JINA_API_KEY`）として設定し、`Authorization` ヘッダーに付与することでレート上限を引き上げられます。
   なお、レート制限やタイムアウト等で本文取得に失敗したURLは `search_res` に追記されず、検索スニペットのみがコンテキストとして渡されるため、ワークフロー自体は失敗しません。
   **上記の基本利用（APIキーなし・20 RPM の範囲内）に限れば、追加の手動設定は不要です。**

## テスト結果

ローカル環境にて `actionlint` による GitHub Actions の構文チェックと、`bun run test` によるプロジェクトテストを実行し、すべて正常に通過することを確認しました。また、Python スクリプト内でのURL処理も個別にテスト済です。

## 背景

公開リポジトリにおいて、AI エージェントの作業跡（`*.patch`, `*.diff`, 一時的な API 確認用の `*.http`, `*.rest`）が誤ってコミットされると、一時的な API キーやデバッグ用のパスワードが含まれたまま流出するリスクがあります。

## このPRで導入するもの

- ツール名: 既存ツールの設定拡張（`lint-staged`, Husky, `forbidden-paths.yml`）
- 導入箇所: `package.json`, `.husky/pre-commit`, `.husky/pre-push`, `.github/workflows/forbidden-paths.yml`, `.gitignore`, `.gitattributes`, `.vscode/settings.json`, `docs/security/leak-prevention.md`
- 期待される効果: コミット前にローカルおよびCIで、AI 作業用・API テスト用の一時ファイルがステージング・プッシュされることを検知し、安全にブロックします。

## 検知漏れリスクと補完策

- 検知できないケース: 上記拡張子以外に保存された一時ファイル（例: `temp.txt`）
- 補完策: 既存の GitHub Secret Scanning と組み合わせ、ファイル名だけでなく内容ベースのスキャンも並行して機能させることで二重化しています。

## マージ前に必要な手動作業（チェックリスト）

レビュアーは PR をマージする前に必ず以下を実施してください。
本 PR の CI は手動作業完了を前提に通る設計です。

- [x] developer 各自のローカルで `bun install`（または `npm install`）を実行し、`lint-staged` の最新設定を反映する周知を行う

## マージ後の確認手順

- [ ] 次の push / PR で `forbidden-paths.yml` が green になることを確認
- [ ] ローカルでわざと `test.http` 等のファイルを作成し、`git add -f test.http`（`.gitignore` で除外されているため通常の `git add` ではステージされない）でステージしてコミットがブロックされることを確認し、確認後は `git reset test.http` でステージを解除する

## ロールバック手順

`git revert` でこの PR のコミットを取り消すことで、直前の状態に復旧可能です。

## 参考情報

- 直近の関連 PR / Issue: なし
