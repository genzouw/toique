## 2024-05-24 - Rate Limiting Array Pruning Optimization

**Learning:** The in-memory rate limiting implementation in `contact.ts` frequently allocated new arrays and made redundant Map updates on every request due to `Array.prototype.filter()`. Since incoming request timestamps are naturally appended chronologically, the array is strictly sorted. This specific architecture allows for O(1) space complexity by using a `while` loop to find the expiration cutoff point and `Array.prototype.splice()` to remove old elements in-place.
**Action:** When pruning time-series data or logs stored in memory arrays that are strictly ordered, prefer index-based scanning and in-place `splice()` over `filter()` to drastically reduce garbage collection overhead in hot paths.

## 2024-05-25 - Promise Deduplication and Unhandled Rejections

**Learning:** When using Promise deduplication (e.g. caching a fetch request for a short time window like 500ms), applying a `.finally()` block to clear the cached variable creates a derivative promise that must be caught to prevent unhandled rejections if the original fetch fails.
**Action:** When performing background side-effects (like cache clearing) on a cached Promise, always append `.catch(() => {})` to that side-effect chain to swallow the rejection in the background, otherwise it will crash Node SSR servers or pollute browser logs.

## 2024-05-26 - Drizzle ORM List Query Projection

**Learning:** Returning entire rows in list endpoints (`SELECT *`) pulls down large JSON columns (like form schemas or raw webhook event logs). This causes unnecessary database I/O, heavy serialization overhead in the backend, and bloated network payloads to the frontend.
**Action:** When writing Drizzle ORM queries for list endpoints, explicitly select only the required scalar fields (e.g., `db.select({ id: table.id })`) to exclude large unused JSON columns. Correspondingly, create lightweight list types in the frontend using TypeScript's `Omit` utility (e.g., `export type FormListItem = Omit<Form, 'schema'>`).

## 2025-04-24 - Avoiding Unused Large JSON Blob Fetches

**Learning:** In APIs fetching list views of items, returning large nested JSON columns (e.g. raw webhook event logs) that aren't actually rendered on the frontend leads to significant unnecessary overhead. It causes larger DB disk I/O, slow JSON serialization, and balloons the network payload size and client-side memory footprint.
**Action:** Always verify if large payload columns are actually needed by the UI, especially for list endpoints (like `GET /api/v1/messages`). If not, explicitly select only the required scalar fields using tools like Drizzle's `db.select({ ...fields })` instead of `db.select()`.
