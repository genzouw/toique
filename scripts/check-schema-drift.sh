#!/usr/bin/env bash
# backend/src/schema.ts と db/migrations のスナップショットの乖離（マイグレーションの生成漏れ）を検出する。
#
# 判定:
#   - drizzle-kit generate の出力に「No schema changes, nothing to migrate」が含まれる
#   - generate の実行後に db/migrations の作業ツリーへ差分が出ていない
#
# drizzle-kit generate は、対話確認が必要な変更（列の改名・削除など）で非 TTY だと
# エラーを出しても終了コード 0 で終わり、ファイルも生成しない（0.31.11 で実測）。
# そのため終了コードだけでなく、出力の文言と作業ツリーの差分の両方で判定する。
#
# 前提: backend の依存（drizzle-kit）をインストール済みであること。
# DATABASE_URL は不要（generate は DB に接続しない）。

set -euo pipefail

if ! out=$(cd backend && bunx drizzle-kit generate </dev/null 2>&1); then
  printf '%s\n' "$out"
  echo "::error::drizzle-kit generate が 0 以外の終了コードで終了しました"
  exit 1
fi
printf '%s\n' "$out"

changed=$(git status --porcelain -- db/migrations)
if [[ -n "$changed" || "$out" != *'No schema changes, nothing to migrate'* ]]; then
  echo "::error file=backend/src/schema.ts::schema.ts と db/migrations が一致しません。bun --cwd backend run db:generate を実行し、生成されたファイルをコミットしてください（列の改名・削除はローカルの TTY で実行して対話に答える）"
  if [[ -n "$changed" ]]; then
    printf '%s\n' "$changed"
  fi
  exit 1
fi

echo "schema drift OK"
