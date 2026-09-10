#!/usr/bin/env bash
# Bun バージョンの単一情報源 (frontend/Dockerfile の FROM タグ) と、
# backend/Dockerfile / 各CI workflow の setup-bun (bun-version) が
# ズレていないかを検証する。
#
# 背景: PR #720 / Issue #725
# Dependabot は Dockerfile の FROM タグしか検知しないため、CI workflow 側の
# setup-bun バージョンを手作業で追随させる運用は追随漏れが再発しうる。
# frontend/Dockerfile を唯一の正として、参照箇所全体の整合をCIで検証する。

set -euo pipefail

expected=$(sed -n 's|^FROM oven/bun:\(.*\)-alpine.*|\1|p' frontend/Dockerfile | head -1)

if [[ -z "$expected" ]]; then
  echo "::error file=frontend/Dockerfile::bun version not found (FROM oven/bun:<version>-alpine line missing)"
  exit 2
fi

found=$(grep -rhoE 'oven/bun:[0-9]+\.[0-9]+\.[0-9]+-alpine|bun-version: *[0-9]+\.[0-9]+\.[0-9]+' \
  frontend/Dockerfile backend/Dockerfile .github/workflows \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | sort -u)

if [[ "$found" != "$expected" ]]; then
  echo "::error::bun version mismatch: expected ${expected} (frontend/Dockerfile), found: ${found//$'\n'/, }"
  echo ""
  echo "frontend/Dockerfile の FROM oven/bun:<version>-alpine を単一情報源として、"
  echo "backend/Dockerfile および .github/workflows/*.yml の bun-version を揃えてください。"
  exit 1
fi

echo "Bun version OK (${expected} で統一されています)"
