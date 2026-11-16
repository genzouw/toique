# データベースマイグレーション運用ガイド

Drizzle ORM (`drizzle-kit migrate`) でのマイグレーション運用ルールをまとめる。
特に PostgreSQL の `CREATE INDEX` / `DROP INDEX` は **テーブル排他ロック** を取るため、本番で安全に運用するためのルールを定める。

## 背景

- `drizzle-kit migrate` はマイグレーションファイルを **1 トランザクション内** で実行する。
- PostgreSQL の `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY` は **トランザクション内では実行できない** という制約がある。
- そのため、`CREATE INDEX` をマイグレーション SQL にそのまま書くとテーブルに `AccessExclusiveLock` がかかり、本番では書き込みがブロックされる。

参考: Issue #352

## 運用ルール

### 1. インデックス作成 / 削除 SQL は **冪等** に書く

`drizzle-kit generate` で生成された SQL のうち、インデックス操作は以下のように手動で書き換える。

```sql
-- 生成された SQL（NG: ロック発生 + 再適用で衝突）
CREATE INDEX "forms_tenant_id_idx" ON "forms" USING btree ("tenant_id");
DROP INDEX "old_idx";

-- 書き換え後（OK: 冪等）
CREATE INDEX IF NOT EXISTS "forms_tenant_id_idx" ON "forms" USING btree ("tenant_id");
DROP INDEX IF EXISTS "old_idx";
```

CI の `scripts/check-migrations.sh` が `IF NOT EXISTS` / `IF EXISTS` を強制チェックする。

### 1b. マイグレーションと `meta/_journal.json` を常に一致させる

`drizzle-kit migrate` は `meta/_journal.json` に登録されたエントリだけを適用する。journal に無い `.sql` は CI もデプロイも成功したまま黙って無視される。
CI の `scripts/check-migration-journal.sh` が次の 3 点を検査する（Issue #857）。

- すべての `*.sql` が journal に登録されている
- すべての journal エントリに対応する `*.sql` が存在する
- `NNNN` 連番が重複していない

並行 PR で `NNNN` が重複した場合は、後からマージする側の `.sql` とスナップショットを削除し、rebase 後に `bun --cwd backend run db:generate` で採番し直す。

### 1c. `schema.ts` を変えたらマイグレーションを生成してコミットする

`backend/src/schema.ts` を変えても `db:generate` を実行し忘れると、CI もデプロイも成功したままスキーマ変更が本番 DB に届かない。
CI の `scripts/check-schema-drift.sh` が `drizzle-kit generate` を実行し、次のどちらかに該当すれば失敗させる（Issue #1061）。

- 新しいマイグレーションが生成された（`db/migrations` に差分が出た）
- 出力に `No schema changes, nothing to migrate` が含まれない

失敗したら `bun --cwd backend run db:generate` を実行し、生成された `.sql`・スナップショット・`_journal.json` をコミットする。
列の改名・削除では drizzle-kit が対話で確認を求める。非 TTY の CI では `Interactive prompts require a TTY terminal` を出して何も生成しないので、ローカルのターミナルで実行して対話に答える。

### 1d. 書き込みを止める DDL・適用に失敗する DDL を Squawk で検出する

CI の `migrations-lint` ジョブは、PostgreSQL マイグレーション専用のリンター [Squawk](https://squawkhq.com/docs/) でも SQL を検査する（Issue #1054）。設定はリポジトリルートの `.squawk.toml` にある。本番適用済みの `0000`〜`0008` は 3 章の方針に従って対象外にしている。

手元では次のコマンドで同じ検査を実行できる。版数は `.github/workflows/ci.yml` の `SQUAWK_VERSION` に合わせる。

```bash
bunx squawk-cli@2.70.0 --no-error-on-unmatched-pattern db/migrations/*.sql </dev/null
```

警告が出たら、次のように SQL を書き換える。

| ルール                                                           | 原因                                                                                         | 書き換え方                                                                                                                        |
| :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `adding-required-field`                                          | 既存テーブルへ DEFAULT なしで `NOT NULL` 列を追加している。行が 1 件でもあれば適用に失敗する | DEFAULT 付きで追加し、必要なら別のマイグレーションで DEFAULT を外す。または NULL 許容で追加し、値を埋めてから `SET NOT NULL` する |
| `constraint-missing-not-valid` / `adding-foreign-key-constraint` | 既存テーブルへの外部キー追加が、両テーブルをロックしたまま全行を走査する                     | `NOT VALID` を付けて追加し、別のマイグレーションで `VALIDATE CONSTRAINT` する                                                     |
| `renaming-column` / `renaming-table`                             | デプロイ中に動いている旧バージョンのコードが列やテーブルを見失う                             | 新しい列を追加してコードを両対応にし、値をコピーしてから旧列を削除する。複数回のデプロイに分ける                                  |
| `ban-concurrent-index-creation-in-transaction`                   | `drizzle-kit migrate` はトランザクション内で実行するため `CONCURRENTLY` が失敗する           | `CONCURRENTLY` を外して `IF NOT EXISTS` を付ける。大規模テーブルは 2 章の事前手動適用を使う                                       |

空のテーブルへの変更などで警告を受け入れるときは、無効化コメントを書き、その上の行に受け入れる理由を残す。無効化コメントと対象の文の間に別のコメント行を挟むと無効化が効かない（2.70.0 で確認）。

```sql
-- 理由: このテーブルは 0010 で作成した直後で、本番に行が無い
-- squawk-ignore adding-required-field
ALTER TABLE "example" ADD COLUMN "tenant_id" uuid NOT NULL;
```

### 2. 大規模テーブルへのインデックスは **本番に事前手動適用** する

行数が多いテーブル（例: `inbound_messages` が 100 万行を超えるなど）へインデックスを追加する場合は、以下のフローを取る。

```text
PR 作成
  ↓
[本番 DB に手動で CREATE INDEX CONCURRENTLY を先行実行]
  ↓
インデックス作成完了を確認
  ↓
PR をマージ → CI/CD で drizzle-kit migrate
  ↓
IF NOT EXISTS により skip され、ロックは発生しない
```

事前手動適用の手順は `docs/manual-deploy.md` を参照。

### 3. 既存マイグレーションの遡及修正は原則しない

`db/migrations/*.sql` は本番に適用済みの履歴であり、原則として遡及修正はしない。

参考までに `drizzle-orm` の migrator (`drizzle-orm/pg-core/dialect.js` の `migrate`) が見る情報は以下のとおり:

- `meta/_journal.json` の `entries[]` に記録されるのは `idx` / `when` / `tag` / `breakpoints` のみで、**SQL ハッシュは含まれない**
- 適用済み判定は `__drizzle_migrations.created_at` と journal 側の `when`（タイムスタンプ）の大小比較で行う
- SQL ハッシュは `__drizzle_migrations.hash` に「適用時の記録」として書き込まれるが、後続の適用判定には使われない

このため **SQL 内容を編集してもハッシュ不一致による再適用は発生しない**。
特に **`IF NOT EXISTS` / `IF EXISTS` の付与は冪等化のみで実体スキーマを変えない**ため、過去ファイルに付与しても問題ない（実害なし・万一の再適用時の安全性が上がる）。

## 将来案: CONCURRENTLY 対応のカスタム migrator

テーブル規模が大きくなり、上記の「事前手動適用」運用が現実的でなくなった場合は、以下のような自前 migrator スクリプトを `backend/scripts/migrate.ts` に導入する選択肢がある。

- `db/migrations/meta/_journal.json` を読んで未適用ファイルを列挙
- 各ステートメント（`--> statement-breakpoint` 区切り）を解析
- `CONCURRENTLY` を含む文は autocommit 接続で、それ以外はトランザクション内で実行
- 適用済みは `__drizzle_migrations` テーブル（drizzle-kit と互換）に書き込み

注意点:

- Drizzle のバージョンアップで `__drizzle_migrations` のスキーマが変わると壊れる
- `CONCURRENTLY` 失敗時は INVALID インデックスが残るため、回収手順が必要

現時点ではテーブル規模が小さく、運用ルール (1)(2) で十分なため導入は見送る。Issue #352 のスコープ。

## トラブルシューティング

### `CREATE INDEX CONCURRENTLY` が途中失敗した

INVALID 状態のインデックスが残るため、以下で確認と削除を行う。

```sql
-- INVALID なインデックス一覧
SELECT i.relname AS index_name, t.relname AS table_name
FROM pg_class i
JOIN pg_index ix ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
WHERE NOT ix.indisvalid;

-- 削除
DROP INDEX CONCURRENTLY IF EXISTS "INDEX_NAME";
```

### `relation "xxx_idx" already exists`

事前手動適用したインデックスが、SQL に `IF NOT EXISTS` 付きで書かれていないと発生する。SQL を書き換えて再度マイグレーションを実行する。
