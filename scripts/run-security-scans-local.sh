#!/usr/bin/env bash
set -e

# VS Code の emeraldwalk.runonsave 拡張機能から呼び出され、
# 保存された特定のファイルに対してローカルで secretlint および gitleaks を実行するスクリプト。

FILE="$1"

if [ -z "$FILE" ]; then
  return 0 2>/dev/null || exit 0
fi

# macOS の通知を表示する (変数 $FILE が AppleScript のソースに展開され、
# コマンドインジェクションを引き起こすのを防ぐため引数として渡す)。
notify_macos() {
  osascript -e 'on run argv
    display notification (item 2 of argv) with title (item 1 of argv) sound name (item 3 of argv)
  end run' "$1" "$2" "$3" || true
}

STDOUT_LOG="$(mktemp)"
STDERR_LOG="$(mktemp)"
trap 'rm -f "$STDOUT_LOG" "$STDERR_LOG"' EXIT

# --- 1. Secretlint によるチェック ---
if command -v bunx >/dev/null 2>&1; then
  if ! bunx secretlint "$FILE" >"$STDOUT_LOG" 2>"$STDERR_LOG"; then
    if [ -s "$STDOUT_LOG" ]; then
      MESSAGE="🚨 [Security Error] Secretlint がファイルにシークレットを検出しました: $FILE"
      NOTIFY_TITLE="Secretlint Error"
      NOTIFY_BODY="シークレット漏洩を検出しました: $FILE"
    else
      MESSAGE="⚠️ [Secretlint Execution Error] secretlint の実行に失敗しました: $FILE"
      NOTIFY_TITLE="Secretlint Execution Error"
      NOTIFY_BODY="secretlint の実行に失敗しました: $FILE"
    fi

    echo "$MESSAGE"
    cat "$STDOUT_LOG" "$STDERR_LOG" >&2

    if command -v notify-send >/dev/null 2>&1; then
      notify-send -u critical "$NOTIFY_TITLE" "$NOTIFY_BODY" || true
    elif command -v osascript >/dev/null 2>&1; then
      notify_macos "$NOTIFY_TITLE" "$NOTIFY_BODY" "Basso"
    fi
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
  fi
fi

if command -v "$GITLEAKS_CMD" >/dev/null 2>&1 || [ -x "$GITLEAKS_CMD" ]; then
  # `detect --source` に単一ファイルを渡す場合、gitleaks はカレントディレクトリの
  # .gitleaks.toml を自動探索しない（ソースがディレクトリの場合のみ探索する仕様のため）。
  # 明示的にリポジトリルートの .gitleaks.toml を --config で渡し、allowlist を確実に
  # 適用する（未指定だとリポジトリ全体で許可しているはずの誤検知が保存時だけ再発する）。
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$(dirname "$0")/..")"
  # コミットされていない(ステージされていない)ファイルの内容を直接スキャンするために --no-git を使用する
  if ! "$GITLEAKS_CMD" detect --no-git --source "$FILE" --config "$REPO_ROOT/.gitleaks.toml" --redact --verbose --no-banner >"$STDOUT_LOG" 2>"$STDERR_LOG"; then
    if [ -s "$STDOUT_LOG" ]; then
      MESSAGE="🚨 [Security Error] Gitleaks がファイルにシークレットを検出しました: $FILE"
      NOTIFY_TITLE="Gitleaks Error"
      NOTIFY_BODY="シークレット漏洩を検出しました: $FILE"
    else
      MESSAGE="⚠️ [Gitleaks Execution Error] gitleaks の実行に失敗しました: $FILE"
      NOTIFY_TITLE="Gitleaks Execution Error"
      NOTIFY_BODY="gitleaks の実行に失敗しました: $FILE"
    fi

    echo "$MESSAGE"
    cat "$STDOUT_LOG" "$STDERR_LOG" >&2

    if command -v notify-send >/dev/null 2>&1; then
      notify-send -u critical "$NOTIFY_TITLE" "$NOTIFY_BODY" || true
    elif command -v osascript >/dev/null 2>&1; then
      notify_macos "$NOTIFY_TITLE" "$NOTIFY_BODY" "Basso"
    fi
  fi
fi