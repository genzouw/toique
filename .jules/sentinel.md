## 2025-02-14 - Admin Login Missing Rate Limiting
**Vulnerability:** The admin login endpoint (`requireOperator` middleware using Basic Authentication) lacked rate limiting, allowing infinite brute-force attempts on the `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
**Learning:** Basic authentication routes implemented manually in Express/Hono don't inherit rate limits from authentication libraries (like Better Auth). Any custom auth endpoint must have its own rate limiting mechanism to prevent brute-forcing.
**Prevention:** Always implement IP-based rate limiting (like a sliding window Map with eviction policies) on any endpoint that verifies passwords or secrets manually.
