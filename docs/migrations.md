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
DROP INDEX CONCURRENTLY IF EXISTS "<index_name>";
```

### `relation "xxx_idx" already exists`

事前手動適用したインデックスが、SQL に `IF NOT EXISTS` 付きで書かれていないと発生する。SQL を書き換えて再度マイグレーションを実行する。
