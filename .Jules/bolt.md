## 2024-05-24 - Rate Limiting Array Pruning Optimization
**Learning:** The in-memory rate limiting implementation in `contact.ts` frequently allocated new arrays and made redundant Map updates on every request due to `Array.prototype.filter()`. Since incoming request timestamps are naturally appended chronologically, the array is strictly sorted. This specific architecture allows for O(1) space complexity by using a `while` loop to find the expiration cutoff point and `Array.prototype.splice()` to remove old elements in-place.
**Action:** When pruning time-series data or logs stored in memory arrays that are strictly ordered, prefer index-based scanning and in-place `splice()` over `filter()` to drastically reduce garbage collection overhead in hot paths.

## 2024-05-25 - Promise Deduplication and Unhandled Rejections
**Learning:** When using Promise deduplication (e.g. caching a fetch request for a short time window like 500ms), applying a `.finally()` block to clear the cached variable creates a derivative promise that must be caught to prevent unhandled rejections if the original fetch fails.
**Action:** When performing background side-effects (like cache clearing) on a cached Promise, always append `.catch(() => {})` to that side-effect chain to swallow the rejection in the background, otherwise it will crash Node SSR servers or pollute browser logs.

## 2026-04-26 - Database Payload Optimization for List Endpoints
**Learning:** Large JSON columns like `rawEvent` in the `inbound_messages` table are selected by default when using `db.select()` or `SELECT *`. When retrieving list data where these large fields are unused (e.g. for display in a dashboard or table), querying them incurs significant and unnecessary database I/O, serialization overhead, and network payload bloat.
**Action:** When writing Drizzle ORM queries for list endpoints, explicitly select only the required fields (e.g., `db.select({ id: table.id, ... })`) to exclude large unused JSON columns or text fields. Ensure corresponding frontend types are updated to mark these excluded fields as optional.
