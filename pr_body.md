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
- [ ] ローカルでわざと `test.http` 等のファイルを git add して、コミットがブロックされることを確認

## ロールバック手順

`git revert` でこの PR のコミットを取り消すことで、直前の状態に復旧可能です。

## 参考情報

- 直近の関連 PR / Issue: なし
