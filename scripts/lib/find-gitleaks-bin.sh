#!/bin/sh
# このファイルは実行せず、`.` (source) して使うライブラリスクリプトである。
# bash (scripts/run-security-scans-local.sh) と POSIX sh (.husky/pre-push) の
# 両方から source されるため、POSIX 互換の構文のみを使用すること。
#
# gitleaks キャッシュディレクトリ配下から、実行可能な gitleaks バイナリのうち
# 最も新しいバージョンのパスを標準出力へ返す共通ロジック。
#
# `.husky/pre-push` と `scripts/run-security-scans-local.sh` の双方が
# 「PATH に gitleaks が無い場合、${XDG_CACHE_HOME:-$HOME/.cache}/gitleaks/ に
# キャッシュ済みの複数バージョンの中から最新のものを選ぶ」という同じ処理を
# 個別に実装しており、片方だけ実装を変えると挙動が乖離するドリフトの温床に
# なっていたため、このファイルへ切り出す。
#
# GNU 拡張である `sort -V` は macOS 標準の BSD sort には存在しない。`-V` を
# 渡すと BSD sort はエラー終了するが、呼び出し側が `|| true` でパイプライン
# 全体の失敗を握りつぶす実装だと、これに気づけないまま `GITLEAKS_BIN` が
# 空になり、gitleaks によるローカルスキャンが静かにスキップされる
# (PR #864 の CodeRabbit レビュー指摘)。バージョン文字列の各セグメントを
# ゼロ埋めしてから通常の辞書順ソートすることで、GNU/BSD 双方の標準ツール
# だけでバージョン順ソートと同等の結果を得て、この依存を無くす。
#
# Usage: find_latest_gitleaks_bin <cache_dir>
# 見つからない場合は何も出力しない（呼び出し側で空文字列として判定できる）。
find_latest_gitleaks_bin() {
  cache_dir="$1"
  [ -d "$cache_dir" ] || return 0

  find "$cache_dir" -maxdepth 1 -type f -name 'gitleaks-*' ! -name '*.tar.gz' 2>/dev/null \
    | while IFS= read -r path; do
        [ -x "$path" ] || continue
        version="${path##*gitleaks-}"
        # 例: "8.30.1" -> "00000008.00000030.00000001." のように各セグメントを
        # 8桁ゼロ埋めし、後段の `sort`（オプション無し=辞書順）が数値の大小と
        # 一致するようにする。
        padded=$(printf '%s' "$version" | awk -F. '{ for (i = 1; i <= NF; i++) printf "%08d.", $i }')
        printf '%s\t%s\n' "$padded" "$path"
      done \
    | sort \
    | tail -n 1 \
    | cut -f2-
}
