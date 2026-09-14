#!/usr/bin/env bash
set -e

# This script is called by the VS Code emeraldwalk.runonsave extension
# to run secretlint locally on a specific file upon saving.

FILE="$1"

if [ -z "$FILE" ]; then
  exit 0
fi

# If bunx is not available, we skip the check to avoid false positive error notifications.
if ! command -v bunx >/dev/null 2>&1; then
  exit 0
fi

# Show a macOS notification without interpolating $FILE (via $NOTIFY_BODY)
# into the AppleScript source. Passing it as a "run" argv item instead
# prevents a filename containing quotes (or other AppleScript-significant
# characters) from breaking out of the script (CWE-94).
notify_macos() {
  osascript -e 'on run argv
    display notification (item 2 of argv) with title (item 1 of argv) sound name (item 3 of argv)
  end run' "$1" "$2" "$3" || true
}

# We don't want to fail the save operation itself or hang indefinitely, so we
# run bunx secretlint and capture its stdout/stderr instead of discarding
# them. A non-zero exit code can mean either "a secret was detected" or
# "secretlint itself failed to run" (package fetch failure, config error,
# unreadable file, etc.); we tell the two apart so a tooling failure is never
# reported to the user as a secret leak.
STDOUT_LOG="$(mktemp)"
STDERR_LOG="$(mktemp)"
trap 'rm -f "$STDOUT_LOG" "$STDERR_LOG"' EXIT

if ! bunx secretlint "$FILE" >"$STDOUT_LOG" 2>"$STDERR_LOG"; then
  if [ -s "$STDOUT_LOG" ]; then
    # secretlint printed a formatted result, meaning it actually detected a leak.
    MESSAGE="🚨 [Security Error] Secretlint found a secret leak in $FILE"
    NOTIFY_TITLE="Secretlint Error"
    NOTIFY_BODY="Secret leak detected in file: $FILE"
  else
    # No findings were printed, so the non-zero exit is secretlint/bunx
    # failing to run, not a detected leak.
    MESSAGE="⚠️ [Secretlint Execution Error] Failed to run secretlint on $FILE"
    NOTIFY_TITLE="Secretlint Execution Error"
    NOTIFY_BODY="Secretlint failed to run on file: $FILE"
  fi

  echo "$MESSAGE"
  cat "$STDOUT_LOG" "$STDERR_LOG" >&2

  # Try to notify the user via OS notifications
  if command -v notify-send >/dev/null 2>&1; then
    # Linux
    notify-send -u critical "$NOTIFY_TITLE" "$NOTIFY_BODY" || true
  elif command -v osascript >/dev/null 2>&1; then
    # macOS
    notify_macos "$NOTIFY_TITLE" "$NOTIFY_BODY" "Basso"
  fi
  # Windows users will see the output in the VS Code Output channel.
fi
