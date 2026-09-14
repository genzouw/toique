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

# We don't want to fail the save operation itself or hang indefinitely,
# so we run bunx secretlint, and if it fails (finds a secret), we notify the user.
if ! bunx secretlint "$FILE" >/dev/null 2>&1; then
  MESSAGE="🚨 [Security Error] Secretlint found a secret leak in $FILE"
  echo "$MESSAGE"

  # Try to notify the user via OS notifications
  if command -v notify-send >/dev/null 2>&1; then
    # Linux
    notify-send -u critical "Secretlint Error" "Secret leak detected in file: $FILE" || true
  elif command -v osascript >/dev/null 2>&1; then
    # macOS
    osascript -e "display notification \"Secret leak detected in file: $FILE\" with title \"Secretlint Error\" sound name \"Basso\"" || true
  fi
  # Windows users will see the output in the VS Code Output channel.
fi
