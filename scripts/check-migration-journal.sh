#!/usr/bin/env bash
# Verify db/migrations/*.sql and meta/_journal.json stay in sync.
#
# Rules:
#   - Every *.sql file must have a matching entry (tag) in meta/_journal.json
#   - Every journal entry must have a matching *.sql file
#   - No two *.sql files may share the same NNNN numeric prefix
#
# Rationale: drizzle-orm's readMigrationFiles() iterates meta/_journal.json only
# (node_modules/drizzle-orm/migrator.cjs). A .sql file that is not registered in
# the journal is never applied by `drizzle-kit migrate`.

set -euo pipefail

migrations_dir="${1:-db/migrations}"
journal="${migrations_dir}/meta/_journal.json"

if [[ ! -f "$journal" ]]; then
  echo "error: journal not found: $journal" >&2
  exit 2
fi

fail=0

tags=$(grep -o '"tag"[[:space:]]*:[[:space:]]*"[^"]*"' "$journal" | sed 's/.*"\([^"]*\)"$/\1/' | sort)

shopt -s nullglob
files=()
for f in "$migrations_dir"/*.sql; do
  files+=("$(basename "$f" .sql)")
done
sqls=$(printf '%s\n' "${files[@]}" | sort)

while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  if ! grep -qxF "$name" <<<"$tags"; then
    echo "::error file=${migrations_dir}/${name}.sql::migration is not registered in meta/_journal.json and will never be applied by drizzle-kit migrate"
    fail=1
  fi
done <<<"$sqls"

while IFS= read -r tag; do
  [[ -z "$tag" ]] && continue
  if ! grep -qxF "$tag" <<<"$sqls"; then
    echo "::error file=${journal}::journal entry '${tag}' has no matching ${migrations_dir}/${tag}.sql"
    fail=1
  fi
done <<<"$tags"

dups=$(printf '%s\n' "${files[@]}" | sed 's/_.*//' | sort | uniq -d)
if [[ -n "$dups" ]]; then
  while IFS= read -r prefix; do
    [[ -z "$prefix" ]] && continue
    echo "::error file=${journal}::duplicate migration index '${prefix}' - two branches generated the same number; regenerate one after rebasing"
    printf '%s\n' "${files[@]}" | grep "^${prefix}_" | sed 's/^/    /'
    fail=1
  done <<<"$dups"
fi

if (( fail == 1 )); then
  echo ""
  echo "Migration journal check failed. See docs/migrations.md."
  exit 1
fi

echo "migration journal OK (${#files[@]} files)"
