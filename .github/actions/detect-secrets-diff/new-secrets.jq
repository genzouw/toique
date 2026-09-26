# detect-secrets のスキャン結果から、baseline に登録されていない検知だけを取り出す。
#
# 入力 : `detect-secrets scan` の出力 JSON
# 引数 : --slurpfile baseline <file>  比較に使う baseline (信頼済みのもの)
#        --argjson line <true|false>  出力に line_number を含めるか
# 出力 : baseline に無い検知の配列 ({file, hashed_secret, type[, line_number]})。
#        新規の検知が無ければ []。
#
# 比較キーは filename + hashed_secret + type のみとする。generated_at 等のメタ情報や
# is_verified (baseline はローカルの `detect-secrets:update` でネットワーク検証済み、
# CI のスキャンは -n で検証を常に無効化するため構造的に一致しない) はキーに含めない
# ことで比較対象から外れる。line_number も行の追加・削除でずれるためキーに含めない。
#
# 判定は片方向 (スキャン結果にあって baseline に無いもの) のみで、baseline にだけ
# 存在するエントリは無視する。detect-secrets.yml が範囲内の途中コミットを走査する
# とき、HEAD の baseline に登録済みのファイルがそのコミットにまだ存在しないのは
# 新規シークレットではなく正常な差分であるため。
def entries($with_line):
  [.results | to_entries[] | .key as $file | .value[]
    | {file: $file, hashed_secret, type}
      + (if $with_line then {line_number} else {} end)];

($baseline[0] | entries(false)) as $known
| entries($line)
| map(select(. as $s
    | $known
    | any(.file == $s.file and .hashed_secret == $s.hashed_secret and .type == $s.type)
    | not))
| sort
