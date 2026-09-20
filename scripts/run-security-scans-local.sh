#!/usr/bin/env bash
set -e

# VS Code の emeraldwalk.runonsave 拡張機能から呼び出され、
# 保存された特定のファイルに対してローカルで secretlint および gitleaks を実行するスクリプト。

FILE="$1"

if [ -z "$FILE" ]; then
  exit 0
fi

# macOS の通知を表示する (変数 $FILE が AppleScript のソースに展開され、
# コマンドインジェクションを引き起こすのを防ぐため引数として渡す)。
notify_macos() {
  osascript -e 'on run argv
    display notification (item 2 of argv) with title (item 1 of argv) sound name (item 3 of argv)
  end run' "$1" "$2" "$3" || true
}

# 検知/実行失敗をコンソール出力とデスクトップ通知の両方へ報告する共通処理。
# Secretlint / Gitleaks の各チェックが同じ通知ロジックを個別に持っていて、
# 通知経路（notify-send / osascript / 出力先）を1つ変えるたびに2箇所直す
# 必要があり、片方だけ直す事故が起きやすかったため切り出した
# (PR #864 の自己レビュー指摘)。
# $1: ツール名 (Secretlint / Gitleaks), $2: 対象ファイル
report_scan_result() {
  local tool_name="$1"
  local target_file="$2"
  local message notify_title notify_body

  if [ -s "$STDOUT_LOG" ]; then
    message="🚨 [Security Error] ${tool_name} がファイルにシークレットを検出しました: $target_file"
    notify_title="${tool_name} Error"
    notify_body="シークレット漏洩を検出しました: $target_file"
  else
    message="⚠️ [${tool_name} Execution Error] ${tool_name} の実行に失敗しました: $target_file"
    notify_title="${tool_name} Execution Error"
    notify_body="${tool_name} の実行に失敗しました: $target_file"
  fi

  echo "$message"
  cat "$STDOUT_LOG" "$STDERR_LOG" >&2

  if command -v notify-send >/dev/null 2>&1; then
    notify-send -u critical "$notify_title" "$notify_body" || true
  elif command -v osascript >/dev/null 2>&1; then
    notify_macos "$notify_title" "$notify_body" "Basso"
  fi
}

STDOUT_LOG="$(mktemp)"
STDERR_LOG="$(mktemp)"
trap 'rm -f "$STDOUT_LOG" "$STDERR_LOG"' EXIT

# --- 1. Secretlint によるチェック ---
if command -v bunx >/dev/null 2>&1; then
  if ! bunx secretlint "$FILE" >"$STDOUT_LOG" 2>"$STDERR_LOG"; then
    report_scan_result "Secretlint" "$FILE"
  fi
fi

# --- 2. Gitleaks によるチェック ---
# shellcheck source=SCRIPTDIR/lib/find-gitleaks-bin.sh
. "$(dirname "$0")/lib/find-gitleaks-bin.sh"

GITLEAKS_CMD="gitleaks"
if ! command -v gitleaks >/dev/null 2>&1; then
  GITLEAKS_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/gitleaks"
  # キャッシュされた最新のバイナリを探す (実装は lib/find-gitleaks-bin.sh を参照。
  # .husky/pre-push と共有している)。
  GITLEAKS_BIN=$(find_latest_gitleaks_bin "$GITLEAKS_CACHE_DIR")
  if [ -n "$GITLEAKS_BIN" ] && [ -x "$GITLEAKS_BIN" ]; then
    GITLEAKS_CMD="$GITLEAKS_BIN"
  else
    # .husky/pre-push と同様に、見つからない場合は GITLEAKS_CMD を空にする。
    # 空にせず "gitleaks" のまま残すと、次のチェックがカレントディレクトリの
    # ./gitleaks という無関係なパスを実行可能ファイルとして拾ってしまう可能性がある上、
    # 何も出力せず exit 0 になるため「保存時スキャンが動いている」という誤認が
    # 固定化する (PR #864 の自己レビュー指摘)。fail-open 自体は本リポジトリの既定方針
    # だが、fail-open したこと自体は必ず可視化する。
    GITLEAKS_CMD=""
    echo "⚠️  gitleaks が見つからないため保存時スキャンをスキップしました（一度コミットすればキャッシュへ取得されます）"
  fi
fi

if [ -n "$GITLEAKS_CMD" ]; then
  # `detect --source` に単一ファイルを渡す場合、gitleaks はカレントディレクトリの
  # .gitleaks.toml / .gitleaksignore を自動探索しない（ソースがディレクトリの場合のみ
  # 探索する仕様のため）。--config・--gitleaks-ignore-path とも明示的にリポジトリルート
  # のものを渡し、allowlist と既存の許容済み検知の抑制を確実に適用する
  # （未指定だとリポジトリ全体で許可しているはずの誤検知が保存時だけ再発する）。
  #
  # さらに --source には repo root からの相対パスを渡す。絶対パスのまま渡すと
  # フィンガープリント（`<path>:<rule>:<line>`）に実行環境ごとのホームディレクトリ等が
  # 含まれてしまい、.gitleaksignore に登録しても各開発者のマシンでしか効かない値に
  # なる（PR #864 の自己レビュー指摘）。
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || (cd "$(dirname "$0")/.." && pwd))"
  REL_FILE="${FILE#"$REPO_ROOT"/}"
  # コミットされていない(ステージされていない)ファイルの内容を直接スキャンするために --no-git を使用する
  if ! (cd "$REPO_ROOT" && "$GITLEAKS_CMD" detect --no-git --source "$REL_FILE" \
          --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore \
          --redact --verbose --no-banner) >"$STDOUT_LOG" 2>"$STDERR_LOG"; then
    report_scan_result "Gitleaks" "$FILE"
  fi
fi
