## 2024-05-24 - Rate Limiting Array Pruning Optimization
**Learning:** The in-memory rate limiting implementation in `contact.ts` frequently allocated new arrays and made redundant Map updates on every request due to `Array.prototype.filter()`. Since incoming request timestamps are naturally appended chronologically, the array is strictly sorted. This specific architecture allows for O(1) space complexity by using a `while` loop to find the expiration cutoff point and `Array.prototype.splice()` to remove old elements in-place.
**Action:** When pruning time-series data or logs stored in memory arrays that are strictly ordered, prefer index-based scanning and in-place `splice()` over `filter()` to drastically reduce garbage collection overhead in hot paths.

## 2024-05-25 - Promise Deduplication and Unhandled Rejections
**Learning:** When using Promise deduplication (e.g. caching a fetch request for a short time window like 500ms), applying a `.finally()` block to clear the cached variable creates a derivative promise that must be caught to prevent unhandled rejections if the original fetch fails.
**Action:** When performing background side-effects (like cache clearing) on a cached Promise, always append `.catch(() => {})` to that side-effect chain to swallow the rejection in the background, otherwise it will crash Node SSR servers or pollute browser logs.

## 2024-05-26 - Database List Queries Payload Optimization
**Learning:** In Drizzle ORM, using `db.select().from(...)` automatically queries all columns, including large JSONB fields like `rawEvent` or `schema`. When used in list endpoints (like `/api/v1/messages` or `/api/v1/forms`), these large payloads drastically increase database I/O, serialization overhead, and network payload size for data the frontend doesn't even use in the list view.
**Action:** When writing list endpoints with Drizzle ORM, always use explicit selection (e.g. `db.select({ id: table.id, name: table.name })`) to exclude large unused columns like JSON dumps, raw payloads, or schemas to minimize overhead.
