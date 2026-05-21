#!/usr/bin/env bash

# toique リポジトリの各種CI/CD・品質向上ツール（GitHub Actions, Linter/Formatter, AI Code Review等）を
# 他のリポジトリに横展開・同期するためのテンプレート適用スクリプトです。
#
# 【使用方法】
# 1. 特定のリポジトリに適用する場合:
#    ./scripts/apply-template.sh /path/to/your-org/some-repo
#
# 2. ディレクトリ配下の全 Git リポジトリに一括適用する場合:
#    ./scripts/apply-template.sh --all /path/to/your-org

set -euo pipefail

# スクリプトの格納場所からプロジェクトルートを特定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ログ出力用の装飾
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

print_usage() {
  echo "Usage:"
  echo "  $0 <target-repo-path>                      Apply templates to a single repository."
  echo "  $0 --all <parent-directory-path>           Apply templates to all Git repositories under the directory."
  echo ""
  echo "Examples:"
  echo "  $0 /path/to/your-org/my-app"
  echo "  $0 --all /path/to/your-org"
}

# テンプレートに含まれるコピー対象ファイルのリスト
# (1) 汎用的にそのまま使える設定・ワークフロー
COMMON_FILES=(
  ".github/workflows/actionlint.yml"
  ".github/workflows/gitleaks.yml"
  ".github/workflows/trivy.yml"
  ".github/workflows/codeql.yml"
  ".github/workflows/markdownlint.yml"
  ".github/workflows/stale.yml"
  ".github/workflows/pr_conflict_notify.yml"
  ".github/dependabot.yml"
  ".github/PULL_REQUEST_TEMPLATE.md"
  ".coderabbit.yaml"
  ".prettierrc"
  ".markdownlint-cli2.jsonc"
)

# (2) Husky設定（対象プロジェクトに husky を導入する場合にコピー）
HUSKY_FILES=(
  ".husky/pre-commit"
  ".husky/commit-msg"
)

# (3) リポジトリ個別調整が推奨されるワークフロー
PROJECT_SPECIFIC_FILES=(
  ".github/workflows/ci.yml"
  ".github/workflows/knip.yml"
  ".github/CODEOWNERS"
)

apply_to_repo() {
  local target_repo="$1"
  
  if [ ! -d "${target_repo}" ]; then
    log_error "指定されたパスが存在しません: ${target_repo}"
    return 1
  fi

  # Gitリポジトリか確認
  if [ ! -d "${target_repo}/.git" ]; then
    log_warn "警告: ${target_repo} は Git リポジトリではありません。スキップします。"
    return 0
  fi

  local repo_name
  repo_name=$(basename "${target_repo}")
  log_info "=========================================================="
  log_info "リポジトリ [${repo_name}] へのテンプレート適用を開始します..."
  log_info "対象パス: ${target_repo}"
  log_info "=========================================================="

  # 1. 共通設定・ワークフローのコピー
  for file in "${COMMON_FILES[@]}"; do
    local src="${TEMPLATE_ROOT}/${file}"
    local dest="${target_repo}/${file}"
    
    if [ -f "${src}" ]; then
      mkdir -p "$(dirname "${dest}")"
      cp "${src}" "${dest}"
      log_success "コピー完了: ${file}"
    else
      log_warn "テンプレートファイルが見つかりません: ${file}"
    fi
  done

  # 2. リポジトリ個別調整ファイルは、競合防止のために存在しない場合のみコピーするか、バックアップを作成してコピー
  for file in "${PROJECT_SPECIFIC_FILES[@]}"; do
    local src="${TEMPLATE_ROOT}/${file}"
    local dest="${target_repo}/${file}"
    
    if [ -f "${src}" ]; then
      mkdir -p "$(dirname "${dest}")"
      if [ -f "${dest}" ]; then
        cp "${dest}" "${dest}.bak"
        log_warn "既に存在するためバックアップを作成しました: ${file} -> ${file}.bak"
      fi
      cp "${src}" "${dest}"
      log_success "コピー完了 (個別調整推奨): ${file}"
    fi
  done

  # 3. CodeOwners のプレースホルダー修正 (デフォルト以外のオーナーになる可能性に対応)
  # 必要に応じてターゲットリポジトリに合わせて書き換えを促す

  # 4. Husky と lint-staged の設定
  if [ -f "${target_repo}/package.json" ]; then
    log_info "Node.js/Bun プロジェクトを検出しました。Huskyの設定を行います..."
    
    # Huskyファイルのコピー
    for file in "${HUSKY_FILES[@]}"; do
      local src="${TEMPLATE_ROOT}/${file}"
      local dest="${target_repo}/${file}"
      if [ -f "${src}" ]; then
        mkdir -p "$(dirname "${dest}")"
        if [ -f "${dest}" ]; then
          local backup_suffix
          backup_suffix="$(date +%Y%m%d%H%M%S)"
          cp "${dest}" "${dest}.bak.${backup_suffix}"
          log_warn "既存のフックをバックアップしました: ${file} -> ${file}.bak.${backup_suffix}"
        fi
        cp "${src}" "${dest}"
        chmod +x "${dest}"
        log_success "コピー & 実行権限付与完了: ${file}"
      fi
    done

    # package.json の Husky scripts 追加
    # 対象が Node.js または Bun を使用している場合、パッケージマネージャーを特定して
    # devDependencies の追加や scripts.prepare の設定を支援
    log_info "手動対応用のメモ: 以下のコマンドを対象リポジトリで実行してください。"
    log_info "  - パッケージのインストール:"
    log_info "    npm install --save-dev husky lint-staged  (または bun/pnpm/yarn 等価コマンド)"
    log_info "  - package.json の scripts.prepare に \"husky\" を追加"
  else
    log_warn "package.json が見つからないため、Husky/Node.js関連の自動セットアップはスキップします（フロントエンド/バックエンド以外のリポジトリを想定）。"
  fi

  log_success "🎉 リポジトリ [${repo_name}] へのテンプレート適用が完了しました！"
  echo ""
}

# メイン処理
if [ $# -eq 0 ]; then
  print_usage
  exit 1
fi

if [ "$1" = "--all" ]; then
  if [ $# -lt 2 ]; then
    log_error "--all オプションには親ディレクトリのパスが必要です。"
    print_usage
    exit 1
  fi
  
  PARENT_DIR="$2"
  if [ ! -d "${PARENT_DIR}" ]; then
    log_error "親ディレクトリが存在しません: ${PARENT_DIR}"
    exit 1
  fi
  
  log_info "📁 親ディレクトリ内の全リポジトリへの一括適用を開始します: ${PARENT_DIR}"
  
  # 親ディレクトリ直下のサブディレクトリをループ
  for sub_dir in "${PARENT_DIR}"/*; do
    if [ -d "${sub_dir}" ] && [ -d "${sub_dir}/.git" ]; then
      apply_to_repo "${sub_dir}" || log_error "リポジトリ ${sub_dir} への適用に失敗しました。次の処理を続行します。"
    fi
  done
  
  log_success "✨ すべての処理が完了しました！"
else
  apply_to_repo "$1"
fi
