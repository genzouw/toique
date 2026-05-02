-- Backfill email_verified for users registered before email verification was enforced.
-- Email verification was introduced in commit 5e37f30 (2026-05-03 06:52:01 +0900, PR #190).
-- Users created before that timestamp had no opportunity to verify their email and would
-- otherwise be permanently locked out of login.
UPDATE "users"
SET "email_verified" = true
WHERE "email_verified" = false
  AND "created_at" < '2026-05-03 06:52:01+09';
