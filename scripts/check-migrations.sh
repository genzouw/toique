#!/usr/bin/env bash
# Lint db/migrations/*.sql to enforce idempotent index operations.
#
# Rules:
#   - `CREATE [UNIQUE] INDEX` must contain `IF NOT EXISTS`
#   - `DROP INDEX` must contain `IF EXISTS`
#
# Rationale: docs/migrations.md / Issue #352
# Without IF (NOT) EXISTS, re-applying a migration after a manual
# CONCURRENTLY pre-apply will fail with "relation already exists".

set -euo pipefail

migrations_dir="${1:-db/migrations}"

if [[ ! -d "$migrations_dir" ]]; then
  echo "error: migrations directory not found: $migrations_dir" >&2
  exit 2
fi

shopt -s nullglob
files=("$migrations_dir"/*.sql)
if (( ${#files[@]} == 0 )); then
  echo "no migration files in $migrations_dir"
  exit 0
fi

fail=0
for file in "${files[@]}"; do
  line_no=0
  while IFS= read -r line; do
    line_no=$((line_no + 1))
    lower=$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]')

    if [[ "$lower" =~ ^[[:space:]]*create[[:space:]]+(unique[[:space:]]+)?index([[:space:]]+concurrently)?[[:space:]] ]]; then
      if [[ ! "$lower" =~ if[[:space:]]+not[[:space:]]+exists ]]; then
        echo "::error file=$file,line=$line_no::CREATE INDEX must include IF NOT EXISTS — see docs/migrations.md"
        echo "  $line"
        fail=1
      fi
    fi

    if [[ "$lower" =~ ^[[:space:]]*drop[[:space:]]+index([[:space:]]+concurrently)?[[:space:]] ]]; then
      if [[ ! "$lower" =~ if[[:space:]]+exists ]]; then
        echo "::error file=$file,line=$line_no::DROP INDEX must include IF EXISTS — see docs/migrations.md"
        echo "  $line"
        fail=1
      fi
    fi
  done < "$file"
done

if (( fail == 1 )); then
  echo ""
  echo "Migration lint failed. See docs/migrations.md for the required pattern."
  exit 1
fi

echo "Migration lint OK (${#files[@]} files checked)"
